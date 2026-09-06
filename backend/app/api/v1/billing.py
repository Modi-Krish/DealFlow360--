from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId

from app.core.dependencies import get_current_user, require_role, enforce_tenant
from app.core.permissions import normalize_role
from app.models.billing import Order, Subscription, Invoice, CreditNote, SubscriptionPlan
from app.models.quotation import Quotation
from app.models.customer import Customer
from app.models.audit import record_audit_log
from app.schemas.billing import (
    OrderResponse, SubscriptionResponse, InvoiceResponse,
    OrderStatus, SubscriptionStatus, InvoiceStatus,
    PaymentRequest, SubscriptionStatusRequest, OrderStatusRequest
)
from app.schemas.common import StandardResponse
from app.services.billing_engine import BillingEngine
from app.models.user import User, UserRole

router = APIRouter()

def get_ref_id(obj: Any) -> Optional[str]:
    if not obj:
        return None
    if hasattr(obj, 'ref') and hasattr(obj.ref, 'id'):
        return str(obj.ref.id)
    if hasattr(obj, 'id'):
        return str(obj.id)
    return str(obj)

def order_to_response(doc: Order) -> OrderResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    data['customer_id'] = get_ref_id(doc.customer)
    data['quotation_id'] = get_ref_id(doc.quotation)
    return OrderResponse(**data)

def sub_to_response(doc: Subscription) -> SubscriptionResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    data['customer_id'] = get_ref_id(doc.customer)
    data['product_id'] = get_ref_id(doc.product)
    data['order_id'] = get_ref_id(doc.order)
    return SubscriptionResponse(**data)

def inv_to_response(doc: Invoice) -> InvoiceResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    data['customer_id'] = get_ref_id(doc.customer)
    data['order_id'] = get_ref_id(doc.order)
    return InvoiceResponse(**data)

async def resolve_user_billing_filter(current_user: User) -> Dict[str, Any]:
    current_role = normalize_role(current_user.role)
    if current_role == "super_admin":
        return {}
    if current_role == "customer":
        customer = await Customer.find_one({"email": current_user.email})
        if not customer:
            return {"_id": {"$exists": False}}
        cid = customer.id
        return {"$or": [{"customer.$id": cid}, {"customer": cid}, {"customer.id": str(cid)}]}
    seller_id = current_user.seller_id or str(current_user.id)
    return {"seller_id": seller_id}

@router.get("/orders", response_model=StandardResponse[List[OrderResponse]])
async def get_orders(current_user: User = Depends(get_current_user)):
    query = await resolve_user_billing_filter(current_user)
    orders = await Order.find(query).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Orders retrieved", data=[order_to_response(o) for o in orders])

@router.get("/subscriptions", response_model=StandardResponse[List[SubscriptionResponse]])
async def get_subscriptions(current_user: User = Depends(get_current_user)):
    query = await resolve_user_billing_filter(current_user)
    subscriptions = await Subscription.find(query).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Subscriptions retrieved", data=[sub_to_response(s) for s in subscriptions])

@router.get("/invoices", response_model=StandardResponse[List[InvoiceResponse]])
async def get_invoices(current_user: User = Depends(get_current_user)):
    query = await resolve_user_billing_filter(current_user)
    invoices = await Invoice.find(query).sort("-created_at").to_list()
    return StandardResponse(success=True, message="Invoices retrieved", data=[inv_to_response(i) for i in invoices])

@router.post("/process-won-quotation/{quotation_id}", response_model=StandardResponse[Dict[str, Any]])
async def process_won_quotation(
    quotation_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        quotation = await Quotation.get(PydanticObjectId(quotation_id))
    except Exception:
        quotation = None
        
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    enforce_tenant(quotation.seller_id, current_user)
        
    if quotation.status not in ["APPROVED", "ALLOCATED"]:
        raise HTTPException(status_code=400, detail="Only approved or allocated quotations can be won and billed")
        
    try:
        billing_result = await BillingEngine.process_won_quotation(quotation)
        
        await record_audit_log(
            user_id=str(current_user.id),
            user_name=current_user.name,
            seller_id=quotation.seller_id,
            action="QUOTATION_BILLED",
            module="billing",
            resource_type="Quotation",
            resource_id=str(quotation.id),
            details=billing_result,
            reason=f"Processed won quotation #{quotation.quotation_number} into orders/invoices"
        )
        return StandardResponse(success=True, message="Billing generated successfully", data=billing_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/{invoice_id}/pay", response_model=StandardResponse[InvoiceResponse])
async def pay_invoice(
    invoice_id: str,
    req: PaymentRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        invoice = await Invoice.get(PydanticObjectId(invoice_id))
    except Exception:
        invoice = None
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    current_role = normalize_role(current_user.role)
    if current_role == "customer":
        customer = await Customer.find_one({"email": current_user.email})
        cust_id = getattr(invoice.customer, 'id', None) or getattr(getattr(invoice.customer, 'ref', None), 'id', None)
        if not customer or str(customer.id) != str(cust_id):
            raise HTTPException(status_code=403, detail="Forbidden: Not your invoice")
    else:
        enforce_tenant(invoice.seller_id, current_user)
        
    if invoice.status == InvoiceStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")
        
    amount_due = Decimal(str(invoice.amount_due or "0.0"))
    amount_paid = Decimal(str(invoice.amount_paid or "0.0"))
    remaining = max(Decimal("0.0"), amount_due - amount_paid)
    
    if remaining <= Decimal("0.0"):
        invoice.status = InvoiceStatus.PAID.value
        await invoice.save()
        raise HTTPException(status_code=400, detail="Invoice is already fully settled")
        
    pay_amount = Decimal(str(req.amount)) if req.amount is not None else remaining
    if pay_amount <= Decimal("0.0"):
        raise HTTPException(status_code=422, detail="Payment amount must be greater than zero")
        
    if pay_amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (${pay_amount:.2f}) exceeds outstanding balance (${remaining:.2f})"
        )
        
    new_amount_paid = (amount_paid + pay_amount).quantize(Decimal("0.01"))
    invoice.amount_paid = new_amount_paid
    old_status = invoice.status
    
    if new_amount_paid >= amount_due:
        invoice.status = InvoiceStatus.PAID.value
    else:
        invoice.status = InvoiceStatus.PARTIALLY_PAID.value
        
    await invoice.save()
    
    # Audit log
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=invoice.seller_id,
        action="INVOICE_PAYMENT_RECORDED",
        module="billing",
        resource_type="Invoice",
        resource_id=str(invoice.id),
        details={"payment_amount": float(pay_amount), "new_balance": float(amount_due - new_amount_paid), "method": req.payment_method, "ref": req.reference_id},
        old_value=old_status,
        new_value=invoice.status,
        reason=f"Recorded payment of ${pay_amount:.2f} via {req.payment_method}"
    )
    
    # If there's an associated order, update its status as well
    if invoice.status == InvoiceStatus.PAID.value and invoice.order:
        try:
            order_id = invoice.order.ref.id if hasattr(invoice.order, 'ref') else invoice.order.id
            ord_doc = await Order.get(PydanticObjectId(str(order_id)))
            if ord_doc and ord_doc.status != OrderStatus.PAID.value:
                ord_doc.status = OrderStatus.PAID.value
                await ord_doc.save()
        except Exception:
            pass

    return StandardResponse(success=True, message=f"Payment of ${pay_amount:.2f} recorded. Invoice is {invoice.status}", data=inv_to_response(invoice))

@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str):
    from fastapi.responses import Response
    from app.services.pdf_service import generate_invoice_pdf

    try:
        inv = await Invoice.get(PydanticObjectId(invoice_id))
    except Exception:
        inv = None
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer_name = "Valued Customer"
    customer_email = "buyer@example.com"
    if inv.customer:
        try:
            cust_ref_id = get_ref_id(inv.customer)
            if cust_ref_id:
                cust = await Customer.get(PydanticObjectId(cust_ref_id))
                if cust:
                    customer_name = cust.company_name or cust.name
                    customer_email = cust.email or customer_email
        except Exception:
            pass

    invoice_dict = {
        'invoice_number': inv.invoice_number,
        'status': inv.status,
        'created_at': inv.created_at,
        'due_date': inv.due_date,
        'customer_name': customer_name,
        'customer_email': customer_email,
        'amount_due': Decimal(str(inv.amount_due)),
        'amount_paid': Decimal(str(inv.amount_paid)),
    }

    pdf_bytes = generate_invoice_pdf(invoice_dict)
    filename = f"Invoice_{inv.invoice_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

@router.post("/subscriptions/{subscription_id}/status", response_model=StandardResponse[SubscriptionResponse])
async def update_subscription_status(
    subscription_id: str,
    req: SubscriptionStatusRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        sub = await Subscription.get(PydanticObjectId(subscription_id))
    except Exception:
        sub = None
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    enforce_tenant(sub.seller_id, current_user)
    
    if sub.status == SubscriptionStatus.CANCELLED.value and req.status != SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot reactivate a cancelled subscription. A new subscription is required.")
        
    old_status = sub.status
    sub.status = req.status.value
    await sub.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=sub.seller_id,
        action="SUBSCRIPTION_STATUS_UPDATED",
        module="billing",
        resource_type="Subscription",
        resource_id=str(sub.id),
        old_value=old_status,
        new_value=sub.status,
        reason=f"Status changed from {old_status} to {sub.status}"
    )
    return StandardResponse(success=True, message=f"Subscription status updated to {req.status.value}", data=sub_to_response(sub))

@router.post("/orders/{order_id}/status", response_model=StandardResponse[OrderResponse])
async def update_order_status(
    order_id: str,
    req: OrderStatusRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        ord_doc = await Order.get(PydanticObjectId(order_id))
    except Exception:
        ord_doc = None
    if not ord_doc:
        raise HTTPException(status_code=404, detail="Order not found")
        
    enforce_tenant(ord_doc.seller_id, current_user)
    
    if ord_doc.status == OrderStatus.CANCELLED.value and req.status != OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot modify status of a cancelled order")
        
    old_status = ord_doc.status
    ord_doc.status = req.status.value
    await ord_doc.save()
    
    await record_audit_log(
        user_id=str(current_user.id),
        user_name=current_user.name,
        seller_id=ord_doc.seller_id,
        action="ORDER_STATUS_UPDATED",
        module="billing",
        resource_type="Order",
        resource_id=str(ord_doc.id),
        old_value=old_status,
        new_value=ord_doc.status,
        reason=f"Order status changed from {old_status} to {ord_doc.status}"
    )
    return StandardResponse(success=True, message=f"Order status updated to {req.status.value}", data=order_to_response(ord_doc))

# --- Proration Engine Endpoint ---
class ProrationRequest(BaseModel):
    action: str # "UPGRADE", "DOWNGRADE", "CANCEL", "QUANTITY_CHANGE"
    new_recurring_price: Optional[float] = None
    new_billing_cycle: Optional[str] = None
    reason: Optional[str] = None

@router.post("/subscriptions/{subscription_id}/prorate", response_model=StandardResponse[Dict[str, Any]])
async def prorate_subscription(
    subscription_id: str,
    req: ProrationRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        sub = await Subscription.get(PydanticObjectId(subscription_id))
    except Exception:
        sub = None
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    enforce_tenant(sub.seller_id, current_user)
        
    from app.services.proration_engine import ProrationEngine
    result = await ProrationEngine.calculate_and_apply_proration(
        subscription=sub,
        action=req.action,
        new_recurring_price=Decimal(str(req.new_recurring_price)) if req.new_recurring_price is not None else None,
        new_billing_cycle=req.new_billing_cycle,
        reason=req.reason
    )
    return StandardResponse(success=True, message="Proration applied successfully", data=result)

# --- Credit Notes Endpoints ---
class CreditNoteCreateRequest(BaseModel):
    order_id: Optional[str] = None
    customer_id: Optional[str] = None
    subscription_id: Optional[str] = None
    amount: float
    reason: str
    refund_method: str = "ACCOUNT_CREDIT"

@router.get("/credit-notes", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_credit_notes(current_user: User = Depends(get_current_user)):
    query = await resolve_user_billing_filter(current_user)
    cns = await CreditNote.find(query).sort("-created_at").to_list()
    res = []
    for c in cns:
        res.append({
            "id": str(c.id),
            "credit_note_number": c.credit_note_number,
            "order_id": str(c.order.ref.id) if c.order and hasattr(c.order, 'ref') else None,
            "customer_id": str(c.customer.ref.id) if c.customer and hasattr(c.customer, 'ref') else None,
            "subscription_id": c.subscription_id,
            "amount": float(c.amount),
            "reason": c.reason,
            "refund_method": c.refund_method,
            "status": c.status,
            "created_at": c.created_at.isoformat() if hasattr(c, 'created_at') and c.created_at else None
        })
    return StandardResponse(success=True, message="Credit notes retrieved", data=res)

@router.post("/credit-notes", response_model=StandardResponse[Dict[str, Any]])
async def create_credit_note(
    req: CreditNoteCreateRequest,
    current_user: User = Depends(get_current_user)
):
    import uuid
    seller_id = current_user.seller_id or str(current_user.id)
    cn = CreditNote(
        credit_note_number=f"CN-{str(uuid.uuid4())[:8].upper()}",
        subscription_id=req.subscription_id,
        seller_id=seller_id,
        amount=Decimal(str(req.amount)),
        reason=req.reason,
        refund_method=req.refund_method,
        status="ISSUED"
    )
    if req.customer_id:
        cn.customer = await Customer.get(PydanticObjectId(req.customer_id))
    if req.order_id:
        cn.order = await Order.get(PydanticObjectId(req.order_id))
        
    await cn.insert()
    return StandardResponse(success=True, message="Credit note issued", data={"id": str(cn.id), "credit_note_number": cn.credit_note_number, "amount": float(cn.amount)})

# --- Subscription Plans Endpoints ---
class SubscriptionPlanCreateRequest(BaseModel):
    name: str
    code: str
    billing_cycle: str = "MONTHLY"
    price_multiplier: float = 1.0
    proration_policy: str = "DAILY_PRO_RATA"
    cancellation_fee: float = 0.0
    description: Optional[str] = None
    is_active: bool = True

@router.get("/plans", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_subscription_plans(current_user: User = Depends(get_current_user)):
    plans = await SubscriptionPlan.find_all().to_list()
    if not plans:
        defaults = [
            SubscriptionPlan(name="Standard Monthly", code="STD_MONTHLY", billing_cycle="MONTHLY", price_multiplier=1.0, proration_policy="DAILY_PRO_RATA", cancellation_fee=Decimal("0.0"), description="Standard monthly subscription with prorated cancellations."),
            SubscriptionPlan(name="Quarterly Growth", code="QTR_GROWTH", billing_cycle="QUARTERLY", price_multiplier=2.85, proration_policy="DAILY_PRO_RATA", cancellation_fee=Decimal("50.0"), description="Quarterly billing with 5% discount."),
            SubscriptionPlan(name="Enterprise Annual", code="ENT_ANNUAL", billing_cycle="ANNUALLY", price_multiplier=10.0, proration_policy="DAILY_PRO_RATA", cancellation_fee=Decimal("100.0"), description="Annual commitment with 2 months free and priority SLA.")
        ]
        for p in defaults:
            await p.insert()
        plans = await SubscriptionPlan.find_all().to_list()
        
    res = [{
        "id": str(p.id),
        "name": p.name,
        "code": p.code,
        "billing_cycle": p.billing_cycle,
        "price_multiplier": p.price_multiplier,
        "proration_policy": p.proration_policy,
        "cancellation_fee": float(p.cancellation_fee),
        "description": p.description,
        "is_active": p.is_active
    } for p in plans]
    return StandardResponse(success=True, message="Subscription plans retrieved", data=res)

@router.post("/plans", response_model=StandardResponse[Dict[str, Any]])
async def create_subscription_plan(
    req: SubscriptionPlanCreateRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SELLER]))
):
    plan = SubscriptionPlan(
        name=req.name,
        code=req.code.upper(),
        billing_cycle=req.billing_cycle.upper(),
        price_multiplier=req.price_multiplier,
        proration_policy=req.proration_policy,
        cancellation_fee=Decimal(str(req.cancellation_fee)),
        description=req.description,
        is_active=req.is_active
    )
    await plan.insert()
    return StandardResponse(success=True, message="Subscription plan created", data={"id": str(plan.id), "name": plan.name, "code": plan.code})

# --- Recurring Billing Schedule Projection ---
@router.get("/schedule/{subscription_id}", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_subscription_schedule(
    subscription_id: str,
    current_user: User = Depends(get_current_user)
):
    from datetime import timedelta, datetime, timezone
    try:
        sub = await Subscription.get(PydanticObjectId(subscription_id))
    except Exception:
        sub = None
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    enforce_tenant(sub.seller_id, current_user)
        
    start_date = sub.next_billing_date
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
        
    cycle = sub.billing_cycle.upper()
    step_days = 365 if "ANNUAL" in cycle or "YEAR" in cycle else 30
    if "QUARTER" in cycle:
        step_days = 90
        
    installments = []
    current_date = start_date
    recurring_price = float(sub.recurring_price or 0.0)
    
    for i in range(1, 7):
        installments.append({
            "installment_number": i,
            "billing_date": current_date.strftime("%Y-%m-%d"),
            "amount": recurring_price,
            "status": "SCHEDULED" if sub.status == "ACTIVE" else "PAUSED",
            "cycle": sub.billing_cycle
        })
        current_date = current_date + timedelta(days=step_days)
        
    return StandardResponse(success=True, message="Recurring schedule generated", data=installments)
