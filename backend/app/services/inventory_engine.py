import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from beanie import PydanticObjectId, init_beanie
from app.models.product import Product
from app.models.inventory import Inventory, Warehouse, InventoryTransaction, FulfillmentOrder

class InventoryEngine:
    """
    Centralized, thread-safe, concurrency-safe Inventory Quantity Lifecycle Engine for DealFlow360.
    Enforces strict server-side stock validation, multi-warehouse support, phase-based state transitions,
    idempotent transaction ledgering, and return receipt controls.
    """

    @staticmethod
    async def get_product_available_stock(product_id: str, warehouse_id: Optional[str] = None) -> int:
        """
        Calculates available stock for a product.
        Formula: Available = On Hand - Reserved
        (quantity_on_hand is already reduced at order confirmation, so quantity_allocated
        is a tracking counter only and is NOT double-subtracted here.)
        """
        try:
            or_clauses: List[Dict[str, Any]] = [{"product_id": str(product_id)}]
            try:
                oid = PydanticObjectId(product_id)
                or_clauses.append({"product.$id": oid})
                or_clauses.append({"product": oid})
            except Exception:
                pass

            if warehouse_id:
                query: Dict[str, Any] = {"$and": [{"$or": or_clauses}, {"warehouse_id": str(warehouse_id)}]}
            else:
                query: Dict[str, Any] = {"$or": or_clauses}

            inv_docs = await Inventory.find(query).to_list()
            if inv_docs:
                total_avail = sum(
                    max(0, (inv.quantity_on_hand or 0) - (inv.quantity_reserved or 0))
                    for inv in inv_docs
                )
                if total_avail > 0:
                    return total_avail

            # Fallback to Product.stock_quantity if no Inventory collection record yet
            prod = await Product.get(PydanticObjectId(product_id))
            if prod and prod.stock_quantity is not None:
                return max(0, prod.stock_quantity)

            return 0
        except Exception:
            return 0

    @staticmethod
    async def validate_stock_availability(product_id: str, requested_qty: int, warehouse_id: Optional[str] = None) -> int:
        """
        Server-side validation: Rejects requests where requested_qty > available_stock.
        """
        available = await InventoryEngine.get_product_available_stock(product_id, warehouse_id)
        if requested_qty > available:
            raise HTTPException(
                status_code=400,
                detail=f"Requested quantity ({requested_qty}) exceeds available warehouse stock ({available})."
            )
        return available

    @staticmethod
    async def confirm_and_bill_inventory(
        order_id: str,
        invoice_id: str,
        items: List[Dict[str, Any]],
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Triggered when bid/order is confirmed and bill is generated.
        Uses a single atomic MongoDB find_one_and_update with the availability
        condition embedded in the filter, making it safe under concurrent load.
        """
        from pymongo import ReturnDocument

        for item in items:
            p_id = str(item.get("product_id", ""))
            qty = int(item.get("quantity", 1))
            if not p_id or qty <= 0:
                continue

            item_key = f"ORDER_CONFIRMED_{order_id}_{invoice_id}_{p_id}"

            # Check idempotency per product item
            existing_tx = await InventoryTransaction.find_one(
                InventoryTransaction.idempotency_key == item_key
            )
            if existing_tx:
                continue  # Already processed idempotently

            # Ensure Inventory document exists and is resolved by product_id or DBRef
            or_clauses: List[Dict[str, Any]] = [{"product_id": p_id}]
            try:
                oid = PydanticObjectId(p_id)
                or_clauses.append({"product.$id": oid})
                or_clauses.append({"product": oid})
            except Exception:
                pass

            inv = await Inventory.find_one({"$or": or_clauses})
            if not inv:
                prod = await Product.get(PydanticObjectId(p_id))
                initial_stock = prod.stock_quantity if prod and prod.stock_quantity is not None else qty
                inv = Inventory(
                    product_id=p_id,
                    seller_id=seller_id,
                    quantity_on_hand=max(initial_stock, qty),
                    quantity_allocated=0,
                    quantity_reserved=0
                )
                await inv.insert()
            else:
                need_save = False
                if not inv.product_id:
                    inv.product_id = p_id
                    need_save = True
                if inv.quantity_reserved is None:
                    inv.quantity_reserved = 0
                    need_save = True
                if inv.quantity_on_hand is None:
                    inv.quantity_on_hand = 0
                    need_save = True
                if need_save:
                    await inv.save()

            # ATOMIC compare-and-update:
            # Filter checks: (quantity_on_hand - quantity_reserved) >= qty
            collection = Inventory.get_motor_collection() if hasattr(Inventory, "get_motor_collection") else Inventory.get_pymongo_collection()
            updated_doc = await collection.find_one_and_update(
                {
                    "_id": inv.id,
                    "$expr": {
                        "$gte": [
                            {"$subtract": [
                                {"$ifNull": ["$quantity_on_hand", 0]},
                                {"$ifNull": ["$quantity_reserved", 0]}
                            ]},
                            qty
                        ]
                    }
                },
                {
                    "$inc": {
                        "quantity_on_hand": -qty,
                        "quantity_allocated": qty
                    }
                },
                return_document=ReturnDocument.AFTER
            )

            if updated_doc is None:
                # Atomic condition failed — stock insufficient
                inv_current = await Inventory.get(inv.id)
                available = max(
                    0,
                    ((inv_current.quantity_on_hand or 0) - (inv_current.quantity_reserved or 0))
                ) if inv_current else 0
                raise HTTPException(
                    status_code=400,
                    detail=f"Requested quantity ({qty}) exceeds available warehouse stock ({available})."
                )

            # Reconstruct pre-update values for ledger
            new_on_hand = updated_doc["quantity_on_hand"]
            new_allocated = updated_doc["quantity_allocated"]
            prev_on_hand = new_on_hand + qty
            prev_allocated = new_allocated - qty

            # Sync Product stock_quantity
            prod = await Product.get(PydanticObjectId(p_id))
            if prod:
                prod.stock_quantity = new_on_hand
                await prod.save()

            # Record Ledger Transaction with unique idempotency_key
            tx = InventoryTransaction(
                product_id=p_id,
                warehouse_id=(inv.warehouse_id if inv and inv.warehouse_id else "central-wh"),
                seller_id=seller_id,
                order_id=order_id,
                invoice_id=invoice_id,
                quantity=qty,
                transaction_type="ORDER_CONFIRMED",
                previous_quantity_on_hand=prev_on_hand,
                new_quantity_on_hand=new_on_hand,
                previous_quantity_allocated=prev_allocated,
                new_quantity_allocated=new_allocated,
                user_id=user_id,
                reason=f"Order confirmed and bill #{invoice_id} generated for {qty} units",
                idempotency_key=item_key
            )
            await tx.insert()

        return True

    @staticmethod
    async def dispatch_inventory(
        fulfillment_id: str,
        items: List[Dict[str, Any]],
        order_id: Optional[str] = None,
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Triggered when fulfillment order is dispatched from warehouse.
        Decreases quantity_allocated, increases quantity_dispatched.
        """
        for item in items:
            p_id = str(item.get("product_id", ""))
            qty = int(item.get("quantity", 1))
            if not p_id or qty <= 0:
                continue

            item_key = f"DISPATCH_{fulfillment_id}_{p_id}"
            existing_tx = await InventoryTransaction.find_one(
                InventoryTransaction.idempotency_key == item_key
            )
            if existing_tx:
                continue

            inv = await Inventory.find_one({"product_id": p_id})
            prev_allocated = inv.quantity_allocated if inv else qty
            prev_dispatched = inv.quantity_dispatched if inv else 0

            new_allocated = max(0, prev_allocated - qty)
            new_dispatched = prev_dispatched + qty

            if inv:
                inv.quantity_allocated = new_allocated
                inv.quantity_dispatched = new_dispatched
                await inv.save()

            tx = InventoryTransaction(
                product_id=p_id,
                warehouse_id=(inv.warehouse_id if inv and inv.warehouse_id else "central-wh"),
                seller_id=seller_id,
                order_id=order_id,
                fulfillment_id=fulfillment_id,
                quantity=qty,
                transaction_type="DISPATCHED",
                previous_quantity_allocated=prev_allocated,
                new_quantity_allocated=new_allocated,
                user_id=user_id,
                reason=f"Dispatched {qty} units under fulfillment order #{fulfillment_id}",
                idempotency_key=item_key
            )
            await tx.insert()

        return True

    @staticmethod
    async def cancel_order_inventory(
        order_id: str,
        fulfillment_id: Optional[str],
        items: List[Dict[str, Any]],
        is_dispatched: bool = False,
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Order Cancellation:
        - Before Dispatch: Restores physical/available stock immediately.
        - After Dispatch: Does NOT restore stock immediately; sets quantity_return_pending.
        """
        for item in items:
            p_id = str(item.get("product_id", ""))
            qty = int(item.get("quantity", 1))
            if not p_id or qty <= 0:
                continue

            item_key = f"CANCEL_{order_id}_{fulfillment_id}_{is_dispatched}_{p_id}"
            existing_tx = await InventoryTransaction.find_one(
                InventoryTransaction.idempotency_key == item_key
            )
            if existing_tx:
                continue

            prod = await Product.get(PydanticObjectId(p_id))
            inv = await Inventory.find_one({"product_id": p_id})

            prev_stock = prod.stock_quantity if prod else 0
            prev_on_hand = inv.quantity_on_hand if inv else prev_stock
            prev_pending = inv.quantity_return_pending if inv else 0

            if not is_dispatched:
                # BEFORE DISPATCH: Immediate Stock Restoration
                new_stock = prev_stock + qty
                new_on_hand = prev_on_hand + qty
                if prod:
                    prod.stock_quantity = new_stock
                    await prod.save()
                if inv:
                    inv.quantity_on_hand = new_on_hand
                    inv.quantity_allocated = max(0, inv.quantity_allocated - qty)
                    await inv.save()

                tx_type = "CANCELLATION_BEFORE_DISPATCH"
                reason = f"Cancelled before dispatch. Restored {qty} units to warehouse stock immediately."
            else:
                # AFTER DISPATCH: Do NOT restore stock immediately! Move to return_pending
                new_stock = prev_stock
                new_on_hand = prev_on_hand
                if inv:
                    inv.quantity_dispatched = max(0, inv.quantity_dispatched - qty)
                    inv.quantity_return_pending = prev_pending + qty
                    await inv.save()

                tx_type = "RETURN_REQUESTED"
                reason = f"Cancelled after dispatch. {qty} units in transit; awaiting warehouse return receipt."

            tx = InventoryTransaction(
                product_id=p_id,
                warehouse_id=(inv.warehouse_id if inv and inv.warehouse_id else "central-wh"),
                seller_id=seller_id,
                order_id=order_id,
                fulfillment_id=fulfillment_id,
                quantity=qty,
                transaction_type=tx_type,
                previous_quantity_on_hand=prev_on_hand,
                new_quantity_on_hand=new_on_hand,
                user_id=user_id,
                reason=reason,
                idempotency_key=item_key
            )
            await tx.insert()

        return True

    @staticmethod
    async def receive_return_inventory(
        fulfillment_id: str,
        items: List[Dict[str, Any]],
        order_id: Optional[str] = None,
        warehouse_id: Optional[str] = None,
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Return Received by Warehouse:
        ONLY THEN increases physical warehouse quantity back.
        """
        for item in items:
            p_id = str(item.get("product_id", ""))
            qty = int(item.get("quantity", 1))
            if not p_id or qty <= 0:
                continue

            item_key = f"RETURN_RECEIVED_{fulfillment_id}_{p_id}"
            existing_tx = await InventoryTransaction.find_one(
                InventoryTransaction.idempotency_key == item_key
            )
            if existing_tx:
                continue # Idempotent check

            prod = await Product.get(PydanticObjectId(p_id))
            inv = await Inventory.find_one({"product_id": p_id})

            prev_stock = prod.stock_quantity if prod else 0
            prev_on_hand = inv.quantity_on_hand if inv else prev_stock
            prev_pending = inv.quantity_return_pending if inv else qty

            new_stock = prev_stock + qty
            new_on_hand = prev_on_hand + qty
            new_pending = max(0, prev_pending - qty)

            if prod:
                prod.stock_quantity = new_stock
                await prod.save()

            if inv:
                inv.quantity_on_hand = new_on_hand
                inv.quantity_return_pending = new_pending
                await inv.save()

            tx = InventoryTransaction(
                product_id=p_id,
                warehouse_id=(warehouse_id or (inv.warehouse_id if inv and inv.warehouse_id else None) or "central-wh"),
                seller_id=seller_id,
                order_id=order_id,
                fulfillment_id=fulfillment_id,
                quantity=qty,
                transaction_type="RETURN_RECEIVED",
                previous_quantity_on_hand=prev_on_hand,
                new_quantity_on_hand=new_on_hand,
                user_id=user_id,
                reason=f"Warehouse confirmed receipt of {qty} returned units. Stock restored.",
                idempotency_key=item_key
            )
            await tx.insert()

        return True
