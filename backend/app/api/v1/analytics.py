from typing import List, Dict, Any, Optional
from decimal import Decimal
from bson.decimal128 import Decimal128
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.core.permissions import normalize_role
from app.models.quotation import Quotation
from app.models.billing import Order, Subscription, Invoice
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.schemas.common import StandardResponse
from app.services.health_engine import DealHealthEngine

router = APIRouter()

def safe_decimal_to_float(val: Any) -> float:
    """Safely converts BSON Decimal128, Python Decimal, float, or None to float without crashing."""
    if val is None:
        return 0.0
    if isinstance(val, Decimal128):
        return float(val.to_decimal())
    if isinstance(val, Decimal):
        return float(val)
    try:
        return float(val)
    except Exception:
        return 0.0

@router.get("/metrics", response_model=StandardResponse[Dict[str, Any]])
async def get_dashboard_metrics(current_user: User = Depends(get_current_user)):
    current_role = normalize_role(current_user.role)
    seller_id = current_user.seller_id or str(current_user.id)
    
    order_match: Dict[str, Any] = {"status": {"$ne": "CANCELLED"}}
    sub_query: Dict[str, Any] = {"status": "ACTIVE"}
    cust_query: Dict[str, Any] = {}
    pipe_match: Dict[str, Any] = {"status": {"$in": ["PENDING", "APPROVED", "IN_REVIEW", "NEGOTIATING", "PENDING_APPROVAL"]}}
    
    if current_role != "super_admin":
        if current_role == "customer":
            customer = await Customer.find_one({"email": current_user.email})
            cid = customer.id if customer else None
            order_match = {"$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}], "status": {"$ne": "CANCELLED"}}
            sub_query = {"$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}], "status": "ACTIVE"}
            cust_query = {"_id": cid} if cid else {"_id": {"$exists": False}}
            pipe_match = {"$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}], "status": {"$in": ["PENDING", "APPROVED", "IN_REVIEW", "NEGOTIATING"]}}
        else:
            # Tenant scoped to seller organization
            order_match["seller_id"] = seller_id
            sub_query["seller_id"] = seller_id
            cust_query = {"$or": [{"seller_id": seller_id}, {"seller_id": None}]}
            pipe_match["seller_id"] = seller_id

    # 1. Total Revenue (from Orders) - aggregated with initial tenant filter
    orders_pipeline = [
        {"$match": order_match},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    orders_agg = await Order.aggregate(orders_pipeline).to_list()
    total_revenue = safe_decimal_to_float(orders_agg[0].get("total")) if (orders_agg and "total" in orders_agg[0]) else 0.0
    
    # 2. Total Customers
    total_customers = await Customer.find(cust_query).count()
    
    # 3. Active Subscriptions
    active_subscriptions = await Subscription.find(sub_query).count()
    
    # 4. Pipeline Value (Quotations not closed/rejected)
    pipe_pipeline = [
        {"$match": pipe_match},
        {"$group": {"_id": None, "total": {"$sum": "$grand_total"}}}
    ]
    pipe_val_agg = await Quotation.aggregate(pipe_pipeline).to_list()
    pipeline_value = safe_decimal_to_float(pipe_val_agg[0].get("total")) if (pipe_val_agg and "total" in pipe_val_agg[0]) else 0.0
    
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
async def get_deal_health(current_user: User = Depends(get_current_user)):
    current_role = normalize_role(current_user.role)
    seller_id = current_user.seller_id or str(current_user.id)
    
    query: Dict[str, Any] = {
        "status": {"$in": ["DRAFT", "PENDING_APPROVAL", "PENDING", "NEGOTIATING", "NEGOTIATION", "APPROVED"]}
    }
    
    if current_role != "super_admin":
        if current_role == "customer":
            customer = await Customer.find_one({"email": current_user.email})
            cid = customer.id if customer else None
            query["$or"] = [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}]
        else:
            query["seller_id"] = seller_id

    active_quotes = await Quotation.find(query).sort("-created_at").to_list()
    
    health_reports = []
    for q in active_quotes:
        customer_id = None
        if q.customer:
            try:
                await q.fetch_link(Quotation.customer)
                customer_id = str(getattr(q.customer, 'id', '') or getattr(getattr(q.customer, 'ref', None), 'id', ''))
            except Exception:
                pass
            
        health = await DealHealthEngine.evaluate_quotation_health(None, q)
        health_reports.append({
            "quotation_id": str(q.id),
            "quotation_number": q.quotation_number,
            "customer_id": customer_id,
            "status": q.status,
            "grand_total": safe_decimal_to_float(q.grand_total),
            "sla_status": getattr(q, 'sla_status', 'ON_TIME') or "ON_TIME",
            "promised_delivery_date": q.promised_delivery_date.isoformat() if q.promised_delivery_date else None,
            "health": health
        })
        
    return StandardResponse(success=True, message="Deal health retrieved", data=health_reports)
