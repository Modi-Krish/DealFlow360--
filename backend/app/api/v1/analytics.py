from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from beanie.odm.operators.find.comparison import In
from beanie.odm.operators.find.evaluation import RegEx

from app.core.dependencies import require_role
from app.models.quotation import Quotation
from app.models.billing import Order, Subscription, Invoice
from app.models.customer import Customer
from app.schemas.common import StandardResponse
from app.models.user import UserRole
from app.services.health_engine import DealHealthEngine

router = APIRouter()

@router.get("/metrics", response_model=StandardResponse[Dict[str, Any]])
async def get_dashboard_metrics():
    # 1. Total Revenue (from Orders)
    # Beanie doesn't have an easy aggregate sum like SQLAlchemy scalar, so we use MongoDB aggregation
    pipeline = [
        {"$match": {"status": {"$ne": "CANCELLED"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    orders_agg = await Order.aggregate(pipeline).to_list()
    total_revenue = float(orders_agg[0]["total"]) if orders_agg else 0.0
    
    # 2. Total Customers
    total_customers = await Customer.find_all().count()
    
    # 3. Active Subscriptions
    active_subscriptions = await Subscription.find(Subscription.status == "ACTIVE").count()
    
    # 4. Pipeline Value (Quotations not closed/rejected)
    pipe_agg = [
        {"$match": {"status": {"$in": ["PENDING", "APPROVED", "IN_REVIEW", "NEGOTIATING"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$grand_total"}}}
    ]
    pipe_val_agg = await Quotation.aggregate(pipe_agg).to_list()
    pipeline_value = float(pipe_val_agg[0]["total"]) if pipe_val_agg else 0.0
    
    return StandardResponse(
        success=True, 
        message="Metrics retrieved", 
        data={
            "total_revenue": total_revenue,
            "total_customers": total_customers,
            "active_subscriptions": active_subscriptions,
            "pipeline_value": pipeline_value
        }
    )

@router.get("/deal-health", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_deal_health():
    active_quotes = await Quotation.find(In(Quotation.status, ["PENDING", "NEGOTIATING", "APPROVED"])).to_list()
    
    health_reports = []
    for q in active_quotes:
        # Resolve customer link for the response
        if q.customer:
            await q.fetch_link(Quotation.customer)
            customer_id = str(q.customer.ref.id)
        else:
            customer_id = None
            
        health = await DealHealthEngine.evaluate_quotation_health(None, q)
        health_reports.append({
            "quotation_id": str(q.id),
            "quotation_number": q.quotation_number,
            "customer_id": customer_id,
            "status": q.status,
            "grand_total": float(q.grand_total),
            "health": health
        })
        
    return StandardResponse(success=True, message="Deal health retrieved", data=health_reports)
