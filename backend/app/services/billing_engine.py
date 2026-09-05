from typing import Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
from app.models.quotation import Quotation
from app.models.billing import Order, Subscription, Invoice

class BillingEngine:
    @staticmethod
    async def process_won_quotation(quotation: Quotation) -> Dict[str, Any]:
        order_num = f"ORD-{str(uuid.uuid4())[:8].upper()}"
        
        await quotation.fetch_link(Quotation.customer)
        
        order = Order(
            order_number=order_num,
            quotation=quotation,
            customer=quotation.customer,
            total_amount=quotation.grand_total,
            status="PROCESSING"
        )
        await order.insert()
        
        subscriptions_created = 0
        
        for item in quotation.items:
            await quotation.fetch_link(Quotation.items) # Or manual fetch if needed
            # Wait, item.product is a Link. We need to fetch it to check the unit.
            # But the quotation might already have fetched products. If not:
            product = await item.product.fetch()
            if product and product.unit.lower() in ["month", "monthly", "year", "annual"]:
                cycle = "ANNUALLY" if "year" in product.unit.lower() or "annual" in product.unit.lower() else "MONTHLY"
                days_added = 365 if cycle == "ANNUALLY" else 30
                
                sub = Subscription(
                    order=order,
                    customer=quotation.customer,
                    product=product,
                    recurring_price=item.unit_price,
                    billing_cycle=cycle,
                    next_billing_date=datetime.now(timezone.utc) + timedelta(days=days_added)
                )
                await sub.insert()
                subscriptions_created += 1
                
        inv_num = f"INV-{str(uuid.uuid4())[:8].upper()}"
        invoice = Invoice(
            invoice_number=inv_num,
            order=order,
            customer=quotation.customer,
            amount_due=quotation.grand_total,
            status="SENT",
            due_date=datetime.now(timezone.utc) + timedelta(days=15)
        )
        await invoice.insert()
        
        quotation.status = "CLOSED_WON"
        await quotation.save()
        
        return {
            "order_number": order_num,
            "invoice_number": inv_num,
            "subscriptions_created": subscriptions_created
        }
