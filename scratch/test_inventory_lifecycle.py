import asyncio
import uuid
import sys
from decimal import Decimal

# Set up path to import backend app
sys.path.append("c:/Users/krish/OneDrive/Desktop/DealFlow360/backend")

from app.core.database import init_db
from app.models.product import Product
from app.models.inventory import Inventory, InventoryTransaction
from app.models.bid import ProductBid
from app.services.inventory_engine import InventoryEngine
from app.schemas.bid import BidCreate
from fastapi import HTTPException

async def run_inventory_tests():
    print("Initializing Database connection...")
    await init_db()
    print("Database initialized successfully.")

    seller_id = f"test-seller-{uuid.uuid4().hex[:6]}"
    
    # ----------------------------------------------------
    # TEST SETUP: Create test product & inventory with 100 stock
    # ----------------------------------------------------
    product = Product(
        name="Test Warehouse Laptop",
        sku=f"SKU-{uuid.uuid4().hex[:6].upper()}",
        description="High spec testing device",
        category=None,
        base_price=Decimal("1000.00"),
        stock_quantity=100,
        seller_id=seller_id,
        seller_name="Test Warehouse Corp"
    )
    await product.insert()
    prod_id = str(product.id)

    # Initialize explicit Inventory record
    inventory = Inventory(
        product_id=prod_id,
        seller_id=seller_id,
        quantity_on_hand=100,
        quantity_allocated=0,
        quantity_reserved=0,
        quantity_dispatched=0,
        quantity_return_pending=0
    )
    await inventory.insert()

    print(f"\nCreated Test Product ID: {prod_id} with initial physical stock: 100")

    # ====================================================
    # SCENARIO 1: Reject order > available stock (Stock = 100, Order = 101)
    # ====================================================
    print("\n--- Running Scenario 1: Order > Available Stock (101 vs 100) ---")
    try:
        await InventoryEngine.validate_stock_availability(prod_id, 101)
        print("FAIL: Validation did NOT raise stock error!")
        assert False, "Should have failed"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "exceeds available warehouse stock" in exc.detail
        print(f"SUCCESS: Rejected with message: '{exc.detail}'")

    # ====================================================
    # SCENARIO 2: Pre-billing bid (Stock remains 100)
    # ====================================================
    print("\n--- Running Scenario 2: Pre-billing Bid of 20 units ---")
    await InventoryEngine.validate_stock_availability(prod_id, 20)
    avail_stock = await InventoryEngine.get_product_available_stock(prod_id)
    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 100
    assert avail_stock == 100
    print(f"SUCCESS: Pre-billing validation passed. Physical stock remains {inv.quantity_on_hand}, Available: {avail_stock}")

    # ====================================================
    # SCENARIO 3: Post-billing confirmation (20 units)
    # ====================================================
    print("\n--- Running Scenario 3: Billed Order Confirmation of 20 units ---")
    order_1_id = f"ORDER-TEST-1-{uuid.uuid4().hex[:6]}"
    invoice_1_id = f"INV-TEST-1-{uuid.uuid4().hex[:6]}"
    
    await InventoryEngine.confirm_and_bill_inventory(
        order_id=order_1_id,
        invoice_id=invoice_1_id,
        items=[{"product_id": prod_id, "quantity": 20}],
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    txs = await InventoryTransaction.find(InventoryTransaction.order_id == order_1_id).to_list()
    
    assert inv.quantity_on_hand == 80, f"Expected 80, got {inv.quantity_on_hand}"
    assert inv.quantity_allocated == 20, f"Expected 20, got {inv.quantity_allocated}"
    assert len(txs) == 1, "Ledger transaction missing"
    assert txs[0].transaction_type == "ORDER_CONFIRMED"
    print(f"SUCCESS: Physical stock reduced to {inv.quantity_on_hand}, Allocated: {inv.quantity_allocated}, Ledger recorded ORDER_CONFIRMED.")

    # ====================================================
    # SCENARIO 4: Attempt bid exceeding updated available stock (Stock = 80, Bid = 85)
    # ====================================================
    print("\n--- Running Scenario 4: Attempt Bid for 85 when available stock is 80 ---")
    try:
        await InventoryEngine.validate_stock_availability(prod_id, 85)
        print("FAIL: Validation should have rejected 85!")
        assert False
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "exceeds available warehouse stock" in exc.detail
        print(f"SUCCESS: Rejected with message: '{exc.detail}'")

    # ====================================================
    # SCENARIO 5: Idempotency check (Duplicate billing call)
    # ====================================================
    print("\n--- Running Scenario 5: Idempotent Retry of Order Confirmation ---")
    await InventoryEngine.confirm_and_bill_inventory(
        order_id=order_1_id,
        invoice_id=invoice_1_id,
        items=[{"product_id": prod_id, "quantity": 20}],
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 80, f"Idempotency failed! Stock reduced again to {inv.quantity_on_hand}"
    assert inv.quantity_allocated == 20
    print(f"SUCCESS: Duplicate confirmation ignored. Physical stock remains {inv.quantity_on_hand}.")

    # ====================================================
    # SCENARIO 6: Cancellation BEFORE Dispatch (Restore stock to 100)
    # ====================================================
    print("\n--- Running Scenario 6: Cancellation BEFORE Dispatch ---")
    await InventoryEngine.cancel_order_inventory(
        order_id=order_1_id,
        fulfillment_id=None,
        items=[{"product_id": prod_id, "quantity": 20}],
        is_dispatched=False,
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 100, f"Expected 100, got {inv.quantity_on_hand}"
    assert inv.quantity_allocated == 0, f"Expected 0, got {inv.quantity_allocated}"
    
    txs_cancel = await InventoryTransaction.find({"order_id": order_1_id, "transaction_type": "CANCELLATION_BEFORE_DISPATCH"}).to_list()
    assert len(txs_cancel) == 1
    print(f"SUCCESS: Stock restored to {inv.quantity_on_hand}, Allocated reset to {inv.quantity_allocated}, Ledger recorded CANCELLATION_BEFORE_DISPATCH.")

    # ====================================================
    # SCENARIO 7: Dispatch Order (Confirm 30 units -> Dispatch 30 units)
    # ====================================================
    print("\n--- Running Scenario 7: Order Confirmation & Warehouse Dispatch of 30 units ---")
    order_2_id = f"ORDER-TEST-2-{uuid.uuid4().hex[:6]}"
    invoice_2_id = f"INV-TEST-2-{uuid.uuid4().hex[:6]}"
    fulfillment_2_id = f"FO-TEST-2-{uuid.uuid4().hex[:6]}"

    # 1. Confirm & Bill 30
    await InventoryEngine.confirm_and_bill_inventory(
        order_id=order_2_id,
        invoice_id=invoice_2_id,
        items=[{"product_id": prod_id, "quantity": 30}],
        seller_id=seller_id
    )
    # 2. Dispatch 30
    await InventoryEngine.dispatch_inventory(
        fulfillment_id=fulfillment_2_id,
        order_id=order_2_id,
        items=[{"product_id": prod_id, "quantity": 30}],
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 70, f"Expected 70, got {inv.quantity_on_hand}"
    assert inv.quantity_allocated == 0, f"Expected 0 allocated, got {inv.quantity_allocated}"
    assert inv.quantity_dispatched == 30, f"Expected 30 dispatched, got {inv.quantity_dispatched}"
    
    txs_disp = await InventoryTransaction.find({"order_id": order_2_id, "transaction_type": "DISPATCHED"}).to_list()
    assert len(txs_disp) == 1
    print(f"SUCCESS: Physical stock {inv.quantity_on_hand}, Allocated {inv.quantity_allocated}, Dispatched {inv.quantity_dispatched}, Ledger logged DISPATCHED.")

    # ====================================================
    # SCENARIO 8: Cancellation AFTER Dispatch (Return Requested)
    # ====================================================
    print("\n--- Running Scenario 8: Cancellation AFTER Dispatch (Stock NOT restored yet) ---")
    await InventoryEngine.cancel_order_inventory(
        order_id=order_2_id,
        fulfillment_id=fulfillment_2_id,
        items=[{"product_id": prod_id, "quantity": 30}],
        is_dispatched=True,
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 70, f"CRITICAL: Physical stock was wrongfully restored to {inv.quantity_on_hand}!"
    assert inv.quantity_dispatched == 0, f"Expected 0 dispatched, got {inv.quantity_dispatched}"
    assert inv.quantity_return_pending == 30, f"Expected 30 return pending, got {inv.quantity_return_pending}"

    txs_ret_req = await InventoryTransaction.find({"order_id": order_2_id, "transaction_type": "RETURN_REQUESTED"}).to_list()
    assert len(txs_ret_req) == 1
    print(f"SUCCESS: Physical stock remains {inv.quantity_on_hand} (not restored), Return Pending: {inv.quantity_return_pending}, Ledger logged RETURN_REQUESTED.")

    # ====================================================
    # SCENARIO 9: Return Received at Warehouse (Restores Stock)
    # ====================================================
    print("\n--- Running Scenario 9: Warehouse Confirms Return Receipt ---")
    await InventoryEngine.receive_return_inventory(
        fulfillment_id=fulfillment_2_id,
        order_id=order_2_id,
        items=[{"product_id": prod_id, "quantity": 30}],
        seller_id=seller_id
    )

    inv = await Inventory.find_one(Inventory.product_id == prod_id)
    assert inv.quantity_on_hand == 100, f"Expected physical stock 100, got {inv.quantity_on_hand}"
    assert inv.quantity_return_pending == 0, f"Expected 0 return pending, got {inv.quantity_return_pending}"

    txs_ret_rec = await InventoryTransaction.find({"order_id": order_2_id, "transaction_type": "RETURN_RECEIVED"}).to_list()
    assert len(txs_ret_rec) == 1
    print(f"SUCCESS: Warehouse confirmed return. Physical stock restored to {inv.quantity_on_hand}, Return Pending reset to {inv.quantity_return_pending}, Ledger logged RETURN_RECEIVED.")

    # ====================================================
    # SCENARIO 10: Concurrency Test (10 simultaneous orders of 20 units on Stock = 50)
    # ====================================================
    print("\n--- Running Scenario 10: High Concurrency Test (10 simultaneous orders of 20 units on Stock = 50) ---")

    # Reset physical stock to 50
    inv.quantity_on_hand = 50
    inv.quantity_allocated = 0
    inv.quantity_reserved = 0
    inv.quantity_dispatched = 0
    inv.quantity_return_pending = 0
    await inv.save()

    product.stock_quantity = 50
    await product.save()

    async def attempt_order(idx: int):
        o_id = f"CONC-ORD-{idx}-{uuid.uuid4().hex[:4]}"
        inv_id = f"CONC-INV-{idx}-{uuid.uuid4().hex[:4]}"
        try:
            # 1. Validate
            await InventoryEngine.validate_stock_availability(prod_id, 20)
            # 2. Confirm & Bill
            await InventoryEngine.confirm_and_bill_inventory(
                order_id=o_id,
                invoice_id=inv_id,
                items=[{"product_id": prod_id, "quantity": 20}],
                seller_id=seller_id
            )
            return True, "SUCCESS"
        except HTTPException as exc:
            return False, exc.detail
        except Exception as exc:
            return False, str(exc)

    results = await asyncio.gather(*[attempt_order(i) for i in range(10)])

    successes = [r for r in results if r[0]]
    failures = [r for r in results if not r[0]]

    inv_final = await Inventory.find_one(Inventory.product_id == prod_id)

    print(f"Concurrency Execution Results: {len(successes)} succeeded, {len(failures)} failed.")
    print(f"Final Physical Stock: {inv_final.quantity_on_hand}, Allocated: {inv_final.quantity_allocated}")

    assert len(successes) == 2, f"Expected exactly 2 successful orders on stock of 50 (20 x 2 = 40), but got {len(successes)}"
    assert inv_final.quantity_on_hand == 10, f"Expected final stock 10 (50 - 40), got {inv_final.quantity_on_hand}"
    assert inv_final.quantity_on_hand >= 0, "CRITICAL ERROR: Stock went negative!"

    print("\n====================================================")
    print("ALL 10 INVENTORY LIFECYCLE SCENARIOS PASSED PERFECTLY!")
    print("====================================================\n")

if __name__ == "__main__":
    asyncio.run(run_inventory_tests())
