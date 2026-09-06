from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.quotation import Quotation
from app.models.inventory import Inventory, FulfillmentOrder, FulfillmentItem, Warehouse
from beanie import PydanticObjectId
import uuid

class AllocationEngine:
    @staticmethod
    async def allocate_inventory(db_dummy, quotation: Quotation) -> Dict[str, Any]:
        allocations = []
        shortages = []
        fulfillment_items = []
        warehouses_used = set()
        
        # ─── PHASE 1: PRE-VALIDATION ───
        # Check stock across all candidate warehouses for each item before modifying any stock.
        # This prevents partial/orphaned reservations when an item has insufficient stock.
        item_inventory_map = {}
        for item in quotation.items:
            product_id = getattr(item.product, 'id', None) or getattr(getattr(item.product, 'ref', None), 'id', None)
            pid_str = str(product_id)
            try:
                pid_oid = PydanticObjectId(pid_str)
            except Exception:
                pid_oid = None

            # Support all BSON Link storage representations ($id DBRef, direct ObjectId, and string)
            filter_conditions = [{"product.id": pid_str}, {"product": pid_str}]
            if pid_oid:
                filter_conditions.extend([{"product.$id": pid_oid}, {"product": pid_oid}, {"product._id": pid_oid}])

            inventories = await Inventory.find({"$or": filter_conditions}).to_list()
            
            # Pre-fetch warehouse references for priority & shipping cost weighting
            for inv in inventories:
                if inv.warehouse and hasattr(inv.warehouse, 'fetch') and not hasattr(inv.warehouse, 'shipping_cost_per_kg'):
                    try:
                        await inv.fetch_link(Inventory.warehouse)
                    except Exception:
                        pass

            # Sort key: 1) available stock desc, 2) lowest shipping cost, 3) highest warehouse priority (1=top)
            def sort_key(inv):
                avail = max(0, inv.quantity_on_hand - inv.quantity_allocated)
                wh_cost = 5.0
                wh_priority = 5
                if inv.warehouse:
                    wh_cost = getattr(inv.warehouse, 'shipping_cost_per_kg', 5.0)
                    wh_priority = getattr(inv.warehouse, 'priority_weight', 5)
                return (avail, -wh_cost, -wh_priority)

            inventories.sort(key=sort_key, reverse=True)
            item_inventory_map[pid_str] = inventories

            total_available = sum(max(0, inv.quantity_on_hand - inv.quantity_allocated) for inv in inventories)
            if total_available < item.quantity:
                shortages.append({
                    "product_id": pid_str,
                    "quantity_required": item.quantity,
                    "quantity_available": total_available,
                    "quantity_short": item.quantity - total_available
                })

        # If any line item is short, abort without touching inventory (atomic validation)
        if shortages:
            return {
                "success": False,
                "message": "Insufficient inventory to fulfill complete quotation",
                "allocations": [],
                "shortages": shortages,
                "can_consolidate": True
            }

        # ─── PHASE 2: ATOMIC RESERVATION WITH ROLLBACK COMPENSATION ───
        coll = Inventory.get_collection()
        reserved_history: List[tuple] = [] # List of (inv_id, allocated_qty) for rollback
        allocation_aborted = False

        for item in quotation.items:
            if allocation_aborted:
                break
                
            product_id = getattr(item.product, 'id', None) or getattr(getattr(item.product, 'ref', None), 'id', None)
            pid_str = str(product_id)
            inventories = item_inventory_map.get(pid_str, [])
            
            remaining_to_allocate = item.quantity
            item_allocations = []

            for inv in inventories:
                if remaining_to_allocate <= 0:
                    break
                    
                available = max(0, inv.quantity_on_hand - inv.quantity_allocated)
                if available <= 0:
                    continue

                can_allocate = min(available, remaining_to_allocate)

                # Atomic conditional increment in MongoDB: only increment if remaining stock >= can_allocate
                # This guarantees that concurrent transactions cannot over-allocate or cause negative stock
                update_result = await coll.update_one(
                    {
                        "_id": inv.id,
                        "$expr": {
                            "$gte": [
                                {"$subtract": ["$quantity_on_hand", "$quantity_allocated"]},
                                can_allocate
                            ]
                        }
                    },
                    {"$inc": {"quantity_allocated": can_allocate}}
                )

                if update_result.modified_count == 1:
                    # Successfully and atomically reserved stock
                    reserved_history.append((inv.id, can_allocate))
                    inv.quantity_allocated += can_allocate
                    
                    wh_id = str(getattr(getattr(inv.warehouse, 'ref', None), 'id', None) or getattr(inv.warehouse, 'id', ''))
                    wh_name = getattr(inv.warehouse, 'name', 'Primary Warehouse')
                    warehouses_used.add(wh_name)

                    item_allocations.append({
                        "warehouse_id": wh_id,
                        "warehouse_name": wh_name,
                        "quantity": can_allocate
                    })

                    prod_name = getattr(item.product, 'name', f"Product-{pid_str}")
                    fulfillment_items.append(
                        FulfillmentItem(
                            product_name=prod_name,
                            warehouse_name=wh_name,
                            quantity=can_allocate
                        )
                    )
                    remaining_to_allocate -= can_allocate
                else:
                    # Stock was snatched by a concurrent request, proceed to next warehouse
                    continue

            if remaining_to_allocate > 0:
                # Concurrent race condition caused stock shortage mid-allocation
                allocation_aborted = True
                shortages.append({
                    "product_id": pid_str,
                    "quantity_short": remaining_to_allocate,
                    "reason": "Stock contention during atomic allocation"
                })

        # ─── PHASE 3: ROLLBACK IF ATOMIC ALLOCATION WAS ABORTED ───
        if allocation_aborted:
            for inv_id, qty in reserved_history:
                try:
                    await coll.update_one({"_id": inv_id}, {"$inc": {"quantity_allocated": -qty}})
                except Exception:
                    pass
            return {
                "success": False,
                "message": "Stock contention or concurrent reservation prevented full allocation. Rolled back.",
                "allocations": [],
                "shortages": shortages,
                "can_consolidate": True
            }

        is_split = len(warehouses_used) > 1
        has_shortages = len(shortages) > 0
        order_num = f"FO-{str(uuid.uuid4())[:8].upper()}"

        days_lead = 7 if (is_split or has_shortages) else 3
        estimated_date = (datetime.now(timezone.utc) + timedelta(days=days_lead)).strftime("%Y-%m-%d")

        cust_name = "Valued Customer"
        if hasattr(quotation.customer, 'name') and quotation.customer.name:
            cust_name = quotation.customer.name
        elif quotation.customer:
            try:
                from app.models.customer import Customer
                c_id = getattr(quotation.customer, 'id', None) or getattr(getattr(quotation.customer, 'ref', None), 'id', None)
                if c_id:
                    c_doc = await Customer.get(PydanticObjectId(str(c_id)))
                    if c_doc:
                        cust_name = c_doc.name
            except Exception:
                pass

        order = FulfillmentOrder(
            order_number=order_num,
            quotation_id=str(quotation.id),
            seller_id=quotation.seller_id,
            customer_name=cust_name,
            status="BACKORDER" if has_shortages else "READY_FOR_DELIVERY",
            is_consolidated=False,
            can_consolidate=is_split or has_shortages,
            estimated_delivery_date=estimated_date,
            dispatch_notes=f"Auto-split across {len(warehouses_used)} warehouse(s) with cost-optimized routing" if is_split else "Single warehouse shipment",
            items=fulfillment_items
        )
        await order.insert()

        if not has_shortages:
            quotation.status = "ALLOCATED"
            await quotation.save()

        return {
            "success": not has_shortages,
            "fulfillment_order_number": order_num,
            "is_split": is_split,
            "warehouses_count": len(warehouses_used),
            "allocations": allocations,
            "shortages": shortages,
            "can_consolidate": is_split or has_shortages
        }

    @staticmethod
    async def consolidate_backorders(order_id: str) -> Dict[str, Any]:
        """Consolidates split fulfillment lines into a single consolidated delivery shipment"""
        order = await FulfillmentOrder.get(PydanticObjectId(order_id))
        if not order:
            return {"success": False, "message": "Fulfillment order not found"}
            
        order.is_consolidated = True
        order.can_consolidate = False
        order.status = "READY_FOR_DELIVERY"
        order.dispatch_notes = (order.dispatch_notes or "") + " | Consolidated into single unified shipment upon stock arrival"
        await order.save()
        
        return {
            "success": True,
            "message": f"Fulfillment order {order.order_number} successfully consolidated into single shipment",
            "order_number": order.order_number,
            "status": order.status
        }
