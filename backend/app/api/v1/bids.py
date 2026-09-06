from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, Query
from beanie import PydanticObjectId

from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.bid import ProductBid, BidHistoryItem, BidLineItem
from app.models.billing import Invoice, Order
from app.models.inventory import FulfillmentOrder, FulfillmentItem
from app.schemas.bid import (
    BidCreate, SellerBidAction, CustomerBidAction, BidResponse,
    BidHistoryItemResponse, BidLineItemResponse, CartCheckoutRequest
)
from app.schemas.common import StandardResponse
from app.services.pdf_service import generate_quotation_pdf, generate_invoice_pdf
from app.services.inventory_engine import InventoryEngine
from fastapi.responses import Response

router = APIRouter()

def bid_to_response(doc: ProductBid) -> BidResponse:
    history_items = [
        BidHistoryItemResponse(
            actor_role=h.actor_role,
            actor_name=h.actor_name,
            action=h.action,
            price=Decimal(str(h.price)),
            message=h.message,
            timestamp=h.timestamp,
        )
        for h in doc.history
    ]
    line_items = [
        BidLineItemResponse(
            product_id=it.product_id,
            product_name=it.product_name,
            quantity=it.quantity,
            original_price=Decimal(str(it.original_price)),
            proposed_price=Decimal(str(it.proposed_price)),
            seller_counter_price=Decimal(str(it.seller_counter_price)) if it.seller_counter_price is not None else None,
            final_agreed_price=Decimal(str(it.final_agreed_price)) if it.final_agreed_price is not None else None,
        )
        for it in (doc.items or [])
    ]
    return BidResponse(
        id=str(doc.id),
        bid_number=doc.bid_number,
        product_id=doc.product_id,
        product_name=doc.product_name,
        seller_id=doc.seller_id,
        seller_name=doc.seller_name,
        customer_id=doc.customer_id,
        customer_name=doc.customer_name,
        customer_email=doc.customer_email,
        items=line_items,
        quantity=doc.quantity,
        original_price=Decimal(str(doc.original_price)),
        proposed_price=Decimal(str(doc.proposed_price)),
        seller_counter_price=Decimal(str(doc.seller_counter_price)) if doc.seller_counter_price is not None else None,
        final_agreed_price=Decimal(str(doc.final_agreed_price)) if doc.final_agreed_price is not None else None,
        is_final_offer=doc.is_final_offer,
        total_amount=Decimal(str(doc.total_amount)),
        delivery_address=doc.delivery_address,
        notes=doc.notes,
        status=doc.status,
        invoice_id=doc.invoice_id,
        invoice_number=doc.invoice_number,
        fulfillment_id=doc.fulfillment_id,
        fulfillment_number=doc.fulfillment_number,
        history=history_items,
        created_at=doc.created_at,
    )

@router.post("/cart-checkout", response_model=StandardResponse[List[BidResponse]])
async def cart_checkout(payload: CartCheckoutRequest, current_user: Optional[User] = Depends(get_current_user)):
    """
    Multi-Vendor Cart Checkout:
    Groups cart items by seller_id.
    - Items belonging to the SAME seller are processed together in ONE quotation.
    - Items belonging to DIFFERENT sellers generate separate vendor-specific quotations.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    customer_id = str(current_user.id) if current_user else f"cust-{uuid.uuid4().hex[:6]}"
    customer_name = current_user.name if current_user else "B2B Buyer"
    customer_email = current_user.email if current_user else "buyer@example.com"

    product_map = {}
    for item in payload.items:
        try:
            prod = await Product.get(PydanticObjectId(item.product_id))
            if prod:
                product_map[item.product_id] = prod
        except Exception:
            pass

    if not product_map:
        raise HTTPException(status_code=404, detail="No valid products found for cart items")

    # Server-side stock availability validation for all cart items
    for item in payload.items:
        await InventoryEngine.validate_stock_availability(item.product_id, item.quantity)

    seller_groups = {}
    for item in payload.items:
        prod = product_map.get(item.product_id)
        if not prod:
            continue
        s_id = prod.seller_id or "seller-default"
        s_name = prod.seller_name or "Verified Seller"
        if s_id not in seller_groups:
            seller_groups[s_id] = {"seller_name": s_name, "items": []}
        seller_groups[s_id]["items"].append((item, prod))

    created_bids = []
    now = datetime.now(timezone.utc)

    for s_id, group in seller_groups.items():
        s_name = group["seller_name"]
        group_items = group["items"]

        bid_num = f"BID-{uuid.uuid4().hex[:6].upper()}"
        bid_line_items = []
        total_amount = Decimal("0.0")

        first_prod = group_items[0][1]
        prod_id_summary = str(first_prod.id)
        prod_name_summary = first_prod.name if len(group_items) == 1 else f"Multi-Item Proposal ({len(group_items)} Products)"

        for item, prod in group_items:
            orig = Decimal(str(prod.base_price))
            prop = Decimal(str(item.proposed_price))
            item_tot = prop * item.quantity
            total_amount += item_tot

            bid_line_items.append(BidLineItem(
                product_id=str(prod.id),
                product_name=prod.name,
                quantity=item.quantity,
                original_price=orig,
                proposed_price=prop
            ))

        primary_qty = sum(it.quantity for it in bid_line_items)

        initial_history = BidHistoryItem(
            actor_role="CUSTOMER",
            actor_name=customer_name,
            action="PLACED_BID",
            price=Decimal(str(total_amount / max(primary_qty, 1))),
            message=payload.notes or f"Placed consolidated bid for {len(bid_line_items)} items from {s_name}",
            timestamp=now
        )

        new_bid = ProductBid(
            bid_number=bid_num,
            product_id=prod_id_summary,
            product_name=prod_name_summary,
            seller_id=s_id,
            seller_name=s_name,
            customer_id=customer_id,
            customer_name=customer_name,
            customer_email=customer_email,
            items=bid_line_items,
            quantity=primary_qty,
            original_price=Decimal(str(first_prod.base_price)),
            proposed_price=Decimal(str(total_amount / max(primary_qty, 1))),
            total_amount=total_amount,
            delivery_address=payload.delivery_address,
            notes=payload.notes,
            status="PENDING_SELLER_REVIEW",
            history=[initial_history]
        )
        await new_bid.insert()
        created_bids.append(new_bid)

    return StandardResponse(
        success=True,
        message=f"Cart checkout successful. Created {len(created_bids)} seller-specific proposals.",
        data=[bid_to_response(b) for b in created_bids]
    )

@router.get("/{bid_id}/pdf")
async def download_bid_pdf(bid_id: str):
    try:
        bid = await ProductBid.get(PydanticObjectId(bid_id))
    except Exception:
        bid = None
    if not bid:
        raise HTTPException(status_code=404, detail="Quotation/Bid not found")

    bid_dict = {
        'bid_number': bid.bid_number,
        'status': bid.status,
        'created_at': bid.created_at,
        'customer_name': bid.customer_name,
        'customer_email': bid.customer_email,
        'delivery_address': bid.delivery_address,
        'seller_name': bid.seller_name,
        'product_name': bid.product_name,
        'quantity': bid.quantity,
        'original_price': Decimal(str(bid.original_price)),
        'proposed_price': Decimal(str(bid.proposed_price)),
        'total_amount': Decimal(str(bid.total_amount)),
        'items': [
            {
                'product_name': it.product_name,
                'quantity': it.quantity,
                'original_price': Decimal(str(it.original_price)),
                'proposed_price': Decimal(str(it.proposed_price)),
                'total_amount': Decimal(str(it.proposed_price * it.quantity))
            }
            for it in (bid.items or [])
        ],
        'history': [
            {
                'actor_role': h.actor_role,
                'actor_name': h.actor_name,
                'action': h.action,
                'price': Decimal(str(h.price)),
                'message': h.message,
                'timestamp': h.timestamp
            }
            for h in bid.history
        ]
    }

    pdf_bytes = generate_quotation_pdf(bid_dict)
    filename = f"Quotation_{bid.bid_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

@router.post("/", response_model=StandardResponse[BidResponse])
async def create_bid(payload: BidCreate, current_user: Optional[User] = Depends(get_current_user)):
    try:
        product = await Product.get(PydanticObjectId(payload.product_id))
    except Exception:
        product = None

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Server-side stock availability validation
    await InventoryEngine.validate_stock_availability(payload.product_id, payload.quantity)

    customer_id = str(current_user.id) if current_user else f"cust-{uuid.uuid4().hex[:6]}"
    customer_name = current_user.name if current_user else "B2B Buyer"
    customer_email = current_user.email if current_user else "buyer@example.com"

    seller_id = product.seller_id or "seller-default"
    seller_name = product.seller_name or "Verified Seller"

    bid_num = f"BID-{uuid.uuid4().hex[:6].upper()}"
    total = Decimal(str(payload.proposed_price)) * payload.quantity

    now = datetime.now(timezone.utc)
    initial_history = BidHistoryItem(
        actor_role="CUSTOMER",
        actor_name=customer_name,
        action="PLACED_BID",
        price=Decimal(str(payload.proposed_price)),
        message=payload.notes or f"Placed bid for {payload.quantity} units at ${payload.proposed_price}/unit",
        timestamp=now
    )

    new_bid = ProductBid(
        bid_number=bid_num,
        product_id=str(product.id),
        product_name=product.name,
        seller_id=seller_id,
        seller_name=seller_name,
        customer_id=customer_id,
        customer_name=customer_name,
        customer_email=customer_email,
        quantity=payload.quantity,
        original_price=Decimal(str(product.base_price)),
        proposed_price=Decimal(str(payload.proposed_price)),
        total_amount=total,
        delivery_address=payload.delivery_address,
        notes=payload.notes,
        status="PENDING_SELLER_REVIEW",
        history=[initial_history]
    )
    await new_bid.insert()

    return StandardResponse(
        success=True,
        message="Bid submitted successfully to seller",
        data=bid_to_response(new_bid)
    )

@router.get("/", response_model=StandardResponse[List[BidResponse]])
async def get_bids(
    seller_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    query = {}
    if seller_id:
        query["seller_id"] = seller_id
    if customer_id:
        query["customer_id"] = customer_id
    if status:
        query["status"] = status

    bids = await ProductBid.find(query).sort("-created_at").to_list()
    return StandardResponse(
        success=True,
        message="Bids retrieved",
        data=[bid_to_response(b) for b in bids]
    )

@router.get("/{bid_id}", response_model=StandardResponse[BidResponse])
async def get_bid_by_id(bid_id: str):
    try:
        bid = await ProductBid.get(PydanticObjectId(bid_id))
    except Exception:
        bid = None
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    return StandardResponse(success=True, message="Bid retrieved", data=bid_to_response(bid))

async def _trigger_agreement_billing_and_dispatch(bid: ProductBid, agreed_price: Decimal, actor_name: str):
    """Automated bill generation and warehouse delivery dispatch notice"""
    total = agreed_price * bid.quantity
    bid.status = "AGREED"
    bid.final_agreed_price = agreed_price
    bid.total_amount = total

    # 1. Generate Invoice (Bill)
    inv_num = f"INV-{uuid.uuid4().hex[:6].upper()}"
    invoice = Invoice(
        invoice_number=inv_num,
        order=None,
        customer=None,
        amount_due=total,
        amount_paid=Decimal("0.0"),
        status="SENT",
        due_date=datetime.now(timezone.utc) + timedelta(days=14)
    )
    await invoice.insert()
    bid.invoice_id = str(invoice.id)
    bid.invoice_number = inv_num

    # 2. Trigger Idempotent Concurrency-Safe Inventory Reduction
    items_to_bill = [
        {"product_id": it.product_id, "quantity": it.quantity}
        for it in (bid.items or [])
    ] if bid.items else [{"product_id": bid.product_id, "quantity": bid.quantity}]

    await InventoryEngine.confirm_and_bill_inventory(
        order_id=str(bid.id),
        invoice_id=inv_num,
        items=items_to_bill,
        seller_id=bid.seller_id
    )

    # 3. Generate Warehouse Delivery Dispatch notice
    fo_num = f"DISP-{uuid.uuid4().hex[:6].upper()}"
    fulfillment = FulfillmentOrder(
        order_number=fo_num,
        bid_id=str(bid.id),
        seller_id=bid.seller_id,
        seller_name=bid.seller_name,
        customer_name=bid.customer_name,
        delivery_address=bid.delivery_address or "Standard Shipping Address",
        product_name=bid.product_name,
        quantity_to_deliver=bid.quantity,
        status="READY_FOR_DELIVERY",
        dispatch_notes=f"Approved deal for Bid #{bid.bid_number}. Bill #{inv_num} issued. Please dispatch {bid.quantity} units.",
        items=[
            FulfillmentItem(
                product_name=bid.product_name,
                quantity=bid.quantity,
                warehouse_name="Main Seller Warehouse"
            )
        ]
    )
    await fulfillment.insert()
    bid.fulfillment_id = str(fulfillment.id)
    bid.fulfillment_number = fo_num

@router.post("/{bid_id}/seller-action", response_model=StandardResponse[BidResponse])
async def seller_bid_action(
    bid_id: str,
    action: SellerBidAction,
    current_user: Optional[User] = Depends(get_current_user)
):
    try:
        bid = await ProductBid.get(PydanticObjectId(bid_id))
    except Exception:
        bid = None
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    actor_name = current_user.name if current_user else bid.seller_name
    now = datetime.now(timezone.utc)

    if action.action == "ACCEPT":
        # Seller accepts either the current proposed price or previous agreed negotiation
        agreed_price = Decimal(str(bid.proposed_price))
        await _trigger_agreement_billing_and_dispatch(bid, agreed_price, actor_name)
        
        bid.history.append(BidHistoryItem(
            actor_role="SELLER",
            actor_name=actor_name,
            action="ACCEPTED",
            price=agreed_price,
            message=action.notes or f"Seller accepted bid price of ${agreed_price}/unit. Bill generated and Warehouse notified for delivery of {bid.quantity} units.",
            timestamp=now
        ))

    elif action.action == "COUNTER":
        if not action.counter_price or action.counter_price <= 0:
            raise HTTPException(status_code=400, detail="Counter price is required")

        c_price = Decimal(str(action.counter_price))
        bid.seller_counter_price = c_price
        bid.is_final_offer = bool(action.is_final_offer)
        bid.status = "SELLER_COUNTERED"
        bid.total_amount = c_price * bid.quantity

        history_action = "FINAL_OFFER" if action.is_final_offer else "COUNTERED"
        msg = action.notes or (
            f"Seller presented FINAL PRICE of ${c_price}/unit (Take it or leave it)"
            if action.is_final_offer
            else f"Seller countered with ${c_price}/unit"
        )
        bid.history.append(BidHistoryItem(
            actor_role="SELLER",
            actor_name=actor_name,
            action=history_action,
            price=c_price,
            message=msg,
            timestamp=now
        ))

    elif action.action == "REJECT":
        bid.status = "REJECTED"
        bid.history.append(BidHistoryItem(
            actor_role="SELLER",
            actor_name=actor_name,
            action="REJECTED",
            price=Decimal(str(bid.proposed_price)),
            message=action.notes or "Seller declined this bid offer.",
            timestamp=now
        ))

    await bid.save()
    return StandardResponse(
        success=True,
        message=f"Seller action '{action.action}' processed successfully",
        data=bid_to_response(bid)
    )

@router.post("/{bid_id}/customer-action", response_model=StandardResponse[BidResponse])
async def customer_bid_action(
    bid_id: str,
    action: CustomerBidAction,
    current_user: Optional[User] = Depends(get_current_user)
):
    try:
        bid = await ProductBid.get(PydanticObjectId(bid_id))
    except Exception:
        bid = None
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    actor_name = current_user.name if current_user else bid.customer_name
    now = datetime.now(timezone.utc)

    if action.action == "ACCEPT":
        # Customer accepts seller's counter price
        if not bid.seller_counter_price:
            raise HTTPException(status_code=400, detail="No seller counter price to accept")

        agreed_price = Decimal(str(bid.seller_counter_price))
        await _trigger_agreement_billing_and_dispatch(bid, agreed_price, actor_name)

        bid.history.append(BidHistoryItem(
            actor_role="CUSTOMER",
            actor_name=actor_name,
            action="ACCEPTED",
            price=agreed_price,
            message=action.notes or f"Customer accepted seller's price of ${agreed_price}/unit. Bill generated and Warehouse notified for delivery of {bid.quantity} units.",
            timestamp=now
        ))

    elif action.action == "COUNTER":
        if bid.is_final_offer:
            raise HTTPException(
                status_code=400,
                detail="Seller has set this price as their FINAL OFFER. You can either Accept or Cancel."
            )
        if not action.proposed_price or action.proposed_price <= 0:
            raise HTTPException(status_code=400, detail="Proposed price is required")

        p_price = Decimal(str(action.proposed_price))
        bid.proposed_price = p_price
        bid.status = "CUSTOMER_COUNTERED"
        bid.total_amount = p_price * bid.quantity

        bid.history.append(BidHistoryItem(
            actor_role="CUSTOMER",
            actor_name=actor_name,
            action="COUNTERED",
            price=p_price,
            message=action.notes or f"Customer countered with ${p_price}/unit",
            timestamp=now
        ))

    elif action.action == "CANCEL":
        bid.status = "CANCELLED"

        items_to_cancel = [
            {"product_id": it.product_id, "quantity": it.quantity}
            for it in (bid.items or [])
        ] if bid.items else [{"product_id": bid.product_id, "quantity": bid.quantity}]

        is_dispatched = False
        if bid.fulfillment_id:
            try:
                fo = await FulfillmentOrder.get(PydanticObjectId(bid.fulfillment_id))
                if fo and fo.status in ["DISPATCHED", "DELIVERED"]:
                    is_dispatched = True
            except Exception:
                pass

        await InventoryEngine.cancel_order_inventory(
            order_id=str(bid.id),
            fulfillment_id=bid.fulfillment_id,
            items=items_to_cancel,
            is_dispatched=is_dispatched,
            seller_id=bid.seller_id,
            user_id=str(current_user.id) if current_user else None
        )

        bid.history.append(BidHistoryItem(
            actor_role="CUSTOMER",
            actor_name=actor_name,
            action="CANCELLED",
            price=Decimal(str(bid.proposed_price)),
            message=action.notes or ("Customer cancelled order after dispatch (return pending)" if is_dispatched else "Customer withdrew the bid."),
            timestamp=now
        ))

    await bid.save()
    return StandardResponse(
        success=True,
        message=f"Customer action '{action.action}' processed successfully",
        data=bid_to_response(bid)
    )
