import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

from app.core.database import init_db
from app.models.product import Product
from app.models.inventory import Inventory
from app.services.inventory_engine import InventoryEngine
from app.api.v1.bids import cart_checkout
from app.schemas.bid import CartCheckoutRequest, CartItemCreate
from app.models.user import User

async def main():
    await init_db()
    products = await Product.find({"seller_name": {"$regex": "Apex", "$options": "i"}}).to_list()
    print(f"\nApex Products count: {len(products)}")
    checkout_items = []
    for p in products:
        avail = await InventoryEngine.get_product_available_stock(str(p.id))
        print(f"Prod: id={p.id}, name='{p.name}', stock_quantity={p.stock_quantity}, engine_avail={avail}")
        
        # Check raw inventories in DB
        cursor = Inventory.get_pymongo_collection().find({
            "$or": [
                {"product_id": str(p.id)},
                {"product.$id": p.id}
            ]
        })
        inv_docs = await cursor.to_list(length=10)
        print(f"  Raw Inventory collection docs: {len(inv_docs)}")
        for r in inv_docs:
            print(f"    on_hand={r.get('quantity_on_hand')}, reserved={r.get('quantity_reserved')}, product_id={r.get('product_id')}, product={r.get('product')}")
            
        if "Edge Server" in p.name:
            checkout_items.append(CartItemCreate(
                product_id=str(p.id),
                quantity=1,
                proposed_price=float(p.base_price) * 0.9
            ))
            
    print(f"\nSimulating Cart Checkout with {len(checkout_items)} items...")
    buyer = await User.find_one({"role": "customer"})
    print(f"Buyer: {buyer.email if buyer else 'None'}")
    req = CartCheckoutRequest(
        items=checkout_items,
        delivery_address="100 Enterprise Way, Suite 400, Chicago, IL 60601",
        notes="Test proposal"
    )
    try:
        res = await cart_checkout(req, current_user=buyer)
        print("Checkout success! Created bids:", len(res.data))
    except Exception as e:
        import traceback
        print("CHECKOUT FAILED WITH EXCEPTION:")
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
