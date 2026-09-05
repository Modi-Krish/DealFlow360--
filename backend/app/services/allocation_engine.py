from typing import Dict, Any, List
from app.models.quotation import Quotation
from app.models.inventory import Inventory, FulfillmentOrder, FulfillmentItem
import uuid

class AllocationEngine:
    @staticmethod
    async def allocate_inventory(db_dummy, quotation: Quotation) -> Dict[str, Any]:
        allocations = []
        shortages = []
        fulfillment_items = []
        
        for item in quotation.items:
            # We need to manually compute available = quantity_on_hand - quantity_allocated
            # But beanie queries don't easily let us sort by a computed difference. 
            # So we fetch all inventory for this product and compute in memory (fine for MVP).
            product_id = item.product.ref.id
            inventories = await Inventory.find(Inventory.product.id == product_id).to_list()
            
            # Sort by available quantity descending
            inventories.sort(key=lambda x: (x.quantity_on_hand - x.quantity_allocated), reverse=True)
            
            remaining_to_allocate = item.quantity
            item_allocations = []
            
            for inv in inventories:
                available = inv.quantity_on_hand - inv.quantity_allocated
                if available <= 0 or remaining_to_allocate <= 0:
                    continue
                    
                can_allocate = min(available, remaining_to_allocate)
                
                inv.quantity_allocated += can_allocate
                await inv.save()
                
                item_allocations.append({
                    "warehouse_id": str(inv.warehouse.ref.id),
                    "quantity": can_allocate
                })
                
                # We need to resolve warehouse for the FulfillmentItem
                await inv.fetch_link(Inventory.warehouse)
                
                fulfillment_items.append(
                    FulfillmentItem(
                        product=item.product,
                        warehouse=inv.warehouse,
                        quantity=can_allocate
                    )
                )
                
                remaining_to_allocate -= can_allocate
                
            if remaining_to_allocate > 0:
                shortages.append({
                    "product_id": str(product_id),
                    "quantity_short": remaining_to_allocate
                })
            else:
                allocations.append({
                    "product_id": str(product_id),
                    "allocations": item_allocations
                })
                
        # Create Fulfillment Order if no shortages
        if not shortages:
            order_num = f"FO-{str(uuid.uuid4())[:8].upper()}"
            order = FulfillmentOrder(
                order_number=order_num,
                quotation_id=str(quotation.id),
                status="ALLOCATED",
                items=fulfillment_items
            )
            await order.insert()
            
        return {
            "success": len(shortages) == 0,
            "allocations": allocations,
            "shortages": shortages
        }
