from typing import Dict, Any
from decimal import Decimal
import uuid
from datetime import datetime, timedelta, timezone
from beanie import PydanticObjectId
from app.models.quotation import Quotation
from app.models.customer import Customer
from app.models.product import Product
from app.models.billing import Order, Subscription, Invoice

class BillingEngine:
    @staticmethod
    async def process_won_quotation(quotation: Quotation) -> Dict[str, Any]:
        order_num = f"ORD-{str(uuid.uuid4())[:8].upper()}"
        
        # Safely resolve customer
        customer = quotation.customer
        if not hasattr(customer, 'name') or not hasattr(customer, 'email'):
            cust_id = getattr(customer, 'id', None) or getattr(getattr(customer, 'ref', None), 'id', None)
            if cust_id:
                customer = await Customer.get(PydanticObjectId(str(cust_id)))
        
        order = Order(
            order_number=order_num,
            quotation=quotation,
            customer=customer,
            total_amount=quotation.grand_total,
            status="PROCESSING"
        )
        await order.insert()
        
        subscriptions_created = 0
        one_time_total = Decimal("0.0")
        recurring_total = Decimal("0.0")
        
        for item in quotation.items:
            product = None
            if hasattr(item, "product") and item.product:
                if hasattr(item.product, "name") and hasattr(item.product, "unit"):
                    product = item.product
                elif hasattr(item.product, "fetch"):
                    try:
                        product = await item.product.fetch()
                    except Exception:
                        pass
                if not product:
                    prod_id = getattr(item.product, 'id', None) or getattr(getattr(item.product, 'ref', None), 'id', None)
                    if prod_id:
                        product = await Product.get(PydanticObjectId(str(prod_id)))

            item_price = Decimal(str(item.total_price if item.total_price is not None else item.unit_price * item.quantity))
            is_recurring = False

            if product and getattr(product, "unit", None):
                unit_lower = str(product.unit).lower()
                if unit_lower in ["month", "monthly", "year", "annual", "yearly"]:
                    is_recurring = True
                    cycle = "ANNUALLY" if ("year" in unit_lower or "annual" in unit_lower) else "MONTHLY"
                    days_added = 365 if cycle == "ANNUALLY" else 30
                    
                    sub = Subscription(
                        order=order,
                        customer=customer,
                        product=product,
                        recurring_price=item.unit_price,
                        billing_cycle=cycle,
                        next_billing_date=datetime.now(timezone.utc) + timedelta(days=days_added)
                    )
                    await sub.insert()
                    subscriptions_created += 1
                    recurring_total += item_price
            
            if not is_recurring:
                one_time_total += item_price
                    
        is_hybrid = (one_time_total > Decimal("0.0") and recurring_total > Decimal("0.0"))
        inv_num = f"INV-{str(uuid.uuid4())[:8].upper()}"
        invoice = Invoice(
            invoice_number=inv_num,
            order=order,
            customer=customer,
            amount_due=quotation.grand_total,
            is_hybrid=is_hybrid,
            one_time_amount=one_time_total,
            recurring_amount=recurring_total,
            status="SENT",
            due_date=datetime.now(timezone.utc) + timedelta(days=15)
        )
        await invoice.insert()
        
        quotation.status = "CLOSED_WON"
        await quotation.save()
        
        return {
            "order_number": order_num,
            "invoice_number": inv_num,
            "subscriptions_created": subscriptions_created,
            "is_hybrid": is_hybrid,
            "one_time_amount": float(one_time_total),
            "recurring_amount": float(recurring_total),
            "grand_total": float(quotation.grand_total)
        }
