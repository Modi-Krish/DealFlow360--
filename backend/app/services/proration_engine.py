from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import uuid

from app.models.billing import Subscription, CreditNote, Order, Invoice
from beanie import PydanticObjectId

class ProrationEngine:
    @staticmethod
    async def calculate_and_apply_proration(
        subscription: Subscription,
        action: str, # "UPGRADE", "DOWNGRADE", "CANCEL", "QUANTITY_CHANGE"
        new_recurring_price: Optional[Decimal] = None,
        new_billing_cycle: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        current_cycle = subscription.billing_cycle.upper()
        
        cycle_days = 365 if "ANNUAL" in current_cycle or "YEAR" in current_cycle else 30
        if "QUARTER" in current_cycle:
            cycle_days = 90
            
        next_date = subscription.next_billing_date
        if next_date.tzinfo is None:
            next_date = next_date.replace(tzinfo=timezone.utc)
            
        time_remaining = next_date - now
        days_remaining = max(0, min(cycle_days, time_remaining.days + (time_remaining.seconds / 86400.0)))
        unused_ratio = Decimal(str(round(days_remaining / cycle_days, 4)))
        
        current_price = Decimal(str(subscription.recurring_price or 0.0))
        unused_credit = round(current_price * unused_ratio, 2)
        
        credit_note_doc = None
        new_charge = Decimal("0.0")
        
        if action == "CANCEL":
            subscription.status = "CANCELLED"
            await subscription.save()
            
            # Generate credit note for unused time
            if unused_credit > 0:
                cn_num = f"CN-{str(uuid.uuid4())[:8].upper()}"
                credit_note_doc = CreditNote(
                    credit_note_number=cn_num,
                    order=subscription.order,
                    customer=subscription.customer,
                    subscription_id=str(subscription.id),
                    seller_id=subscription.seller_id,
                    amount=unused_credit,
                    reason=reason or f"Mid-cycle subscription cancellation refund ({days_remaining:.1f} days unused)",
                    refund_method="ACCOUNT_CREDIT",
                    status="ISSUED"
                )
                await credit_note_doc.insert()
                
            return {
                "action": "CANCEL",
                "days_remaining": round(days_remaining, 1),
                "unused_credit": float(unused_credit),
                "net_adjustment": float(-unused_credit),
                "credit_note_number": credit_note_doc.credit_note_number if credit_note_doc else None,
                "status": subscription.status
            }
            
        # For UPGRADE, DOWNGRADE, or QUANTITY_CHANGE
        new_price = Decimal(str(new_recurring_price if new_recurring_price is not None else current_price))
        new_charge = round(new_price * unused_ratio, 2)
        net_adjustment = round(new_charge - unused_credit, 2)
        
        subscription.recurring_price = new_price
        if new_billing_cycle:
            subscription.billing_cycle = new_billing_cycle
        await subscription.save()
        
        # If downgrade/decrease results in net credit due to customer
        if net_adjustment < Decimal("0.0"):
            refund_amount = abs(net_adjustment)
            cn_num = f"CN-{str(uuid.uuid4())[:8].upper()}"
            credit_note_doc = CreditNote(
                credit_note_number=cn_num,
                order=subscription.order,
                customer=subscription.customer,
                subscription_id=str(subscription.id),
                seller_id=subscription.seller_id,
                amount=refund_amount,
                reason=reason or f"Mid-cycle downgrade proration credit ({days_remaining:.1f} days unused)",
                refund_method="ACCOUNT_CREDIT",
                status="ISSUED"
            )
            await credit_note_doc.insert()
            
        return {
            "action": action,
            "days_remaining": round(days_remaining, 1),
            "unused_credit": float(unused_credit),
            "new_charge": float(new_charge),
            "net_adjustment": float(net_adjustment),
            "credit_note_number": credit_note_doc.credit_note_number if credit_note_doc else None,
            "new_recurring_price": float(new_price),
            "status": subscription.status
        }
