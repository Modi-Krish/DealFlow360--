import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

from app.core.database import init_db
from app.models.bid import ProductBid
from app.api.v1.bids import seller_bid_action
from app.schemas.bid import SellerBidAction
import traceback

async def main():
    await init_db()
    bid = await ProductBid.find_one({"bid_number": {"$regex": "AEBCFF", "$options": "i"}})
    if not bid:
        print("Bid AEBCFF not found, searching all bids:")
        all_bids = await ProductBid.find().to_list()
        for b in all_bids:
            print(f"Bid: {b.id}, num={b.bid_number}, status={b.status}, buyer={b.customer_name}, prod={b.product_name}")
        return
    
    print(f"Found Bid: id={bid.id}, num={bid.bid_number}, status={bid.status}, items={len(bid.items) if bid.items else 0}")
    print(f"Items: {bid.items}")
    
    # Test seller accept action
    action = SellerBidAction(action="ACCEPT", notes="Testing accept")
    try:
        res = await seller_bid_action(bid_id=str(bid.id), action=action, current_user=None)
        print("ACCEPT SUCCESS! Status:", res.data.status, "Invoice:", res.data.invoice_number, "Fulfillment:", res.data.fulfillment_number)
    except Exception as e:
        print("ACCEPT FAILED:")
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
