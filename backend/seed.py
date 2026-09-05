import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.core.database import init_db
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.models.category import Category
from app.models.product import Product
from app.models.customer import Customer
from app.models.pricing import PriceList, PriceListItem
from app.models.inventory import Warehouse, Inventory, FulfillmentOrder, FulfillmentItem
from app.models.billing import Invoice, Order
from app.models.bid import ProductBid, BidHistoryItem

async def seed_data():
    print("Initializing MongoDB and Beanie...")
    await init_db()
    
    print("Clearing collections...")
    await User.delete_all()
    await Category.delete_all()
    await Product.delete_all()
    await Customer.delete_all()
    await PriceList.delete_all()
    await Warehouse.delete_all()
    await Inventory.delete_all()
    await ProductBid.delete_all()
    await Invoice.delete_all()
    await FulfillmentOrder.delete_all()
    
    print("Creating multi-seller users...")
    # 1. Super Admin
    admin = User(name="Admin User", email="admin@dealflow360.com", password_hash=get_password_hash("admin123"), role=UserRole.ADMIN)
    await admin.insert()

    # 2. Seller 1: Apex Hardware
    seller1 = User(
        name="Apex Global Hardware",
        email="seller1@dealflow360.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER,
        company_name="Apex Global Hardware"
    )
    await seller1.insert()
    seller1_id = str(seller1.id)

    seller1_emp = User(
        name="Marcus Vance",
        email="marcus@apex.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER_EMPLOYEE,
        company_name="Apex Global Hardware",
        seller_id=seller1_id
    )
    seller1_wh = User(
        name="Apex Logistics & Warehouse",
        email="warehouse@apex.com",
        password_hash=get_password_hash("ops123"),
        role=UserRole.WAREHOUSE_OPS,
        company_name="Apex Global Hardware",
        seller_id=seller1_id
    )
    await User.insert_many([seller1_emp, seller1_wh])

    # 3. Seller 2: CloudScale Tech
    seller2 = User(
        name="CloudScale Technologies",
        email="seller2@dealflow360.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER,
        company_name="CloudScale Technologies"
    )
    await seller2.insert()
    seller2_id = str(seller2.id)

    seller2_emp = User(
        name="Elena Rostova",
        email="elena@cloudscale.io",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER_EMPLOYEE,
        company_name="CloudScale Technologies",
        seller_id=seller2_id
    )
    seller2_wh = User(
        name="CloudScale Fulfillment",
        email="warehouse@cloudscale.io",
        password_hash=get_password_hash("ops123"),
        role=UserRole.WAREHOUSE_OPS,
        company_name="CloudScale Technologies",
        seller_id=seller2_id
    )
    await User.insert_many([seller2_emp, seller2_wh])

    # 4. Customer Buyer
    buyer = User(
        name="Acme Procurement",
        email="buyer@acmecorp.com",
        password_hash=get_password_hash("buyer123"),
        role=UserRole.CUSTOMER,
        company_name="Acme Corporation"
    )
    await buyer.insert()
    buyer_id = str(buyer.id)

    # Legacy roles for compatibility
    sales_rep = User(name="Sarah Sales", email="sarah@dealflow360.com", password_hash=get_password_hash("sales123"), role=UserRole.SALES_REP)
    ops = User(name="Warehouse Ops", email="ops@dealflow360.com", password_hash=get_password_hash("ops123"), role=UserRole.FINANCE_OPS)
    await User.insert_many([sales_rep, ops])
    
    print("Creating Categories & Multi-Seller Products...")
    software_cat = await Category(name="Software Licenses", description="Enterprise software").insert()
    hardware_cat = await Category(name="Hardware", description="Server and networking equipment").insert()
    services_cat = await Category(name="Professional Services", description="Consulting and deployment services").insert()
    
    # Apex Hardware Products
    prod1 = await Product(
        name="Edge Server 1U Pro",
        sku="HW-SRV-100",
        base_price=Decimal("2400.00"),
        category=hardware_cat,
        unit="unit",
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        stock_quantity=45
    ).insert()

    prod2 = await Product(
        name="Storage Array 10TB Enterprise",
        sku="HW-STO-500",
        base_price=Decimal("4500.00"),
        category=hardware_cat,
        unit="unit",
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        stock_quantity=20
    ).insert()

    prod3 = await Product(
        name="Managed Network Switch 48-Port",
        sku="HW-NET-048",
        base_price=Decimal("1200.00"),
        category=hardware_cat,
        unit="unit",
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        stock_quantity=80
    ).insert()

    # CloudScale Technologies Products
    prod4 = await Product(
        name="Cloud CRM Enterprise License",
        sku="CRM-ENT-001",
        base_price=Decimal("150.00"),
        category=software_cat,
        unit="user/month",
        seller_id=seller2_id,
        seller_name="CloudScale Technologies",
        stock_quantity=500
    ).insert()

    prod5 = await Product(
        name="Analytics Pro AI Pipeline",
        sku="API-PRO-002",
        base_price=Decimal("500.00"),
        category=software_cat,
        unit="month",
        seller_id=seller2_id,
        seller_name="CloudScale Technologies",
        stock_quantity=200
    ).insert()

    prod6 = await Product(
        name="Cloud Migration & Deployment Support",
        sku="SVC-IMP-001",
        base_price=Decimal("200.00"),
        category=services_cat,
        unit="hour",
        seller_id=seller2_id,
        seller_name="CloudScale Technologies",
        stock_quantity=150
    ).insert()
    
    print("Creating Warehouses & Inventory...")
    wh1 = await Warehouse(name="Apex East Coast Hub", location="New Jersey", seller_id=seller1_id, is_active=True).insert()
    wh2 = await Warehouse(name="CloudScale Tech Facility", location="San Jose, CA", seller_id=seller2_id, is_active=True).insert()
    
    await Inventory(warehouse=wh1, product=prod1, seller_id=seller1_id, quantity_on_hand=45, quantity_allocated=5).insert()
    await Inventory(warehouse=wh1, product=prod2, seller_id=seller1_id, quantity_on_hand=20, quantity_allocated=2).insert()
    await Inventory(warehouse=wh2, product=prod4, seller_id=seller2_id, quantity_on_hand=500, quantity_allocated=50).insert()

    print("Creating Sample Bids & Negotiations...")
    now = datetime.now(timezone.utc)
    
    # Bid 1: Pending Seller Review (Customer bid $2,100 for 5 units of Edge Server)
    bid1 = await ProductBid(
        bid_number="BID-APX-001",
        product_id=str(prod1.id),
        product_name=prod1.name,
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        customer_id=buyer_id,
        customer_name="Acme Procurement",
        customer_email="buyer@acmecorp.com",
        quantity=5,
        original_price=Decimal("2400.00"),
        proposed_price=Decimal("2100.00"),
        total_amount=Decimal("10500.00"),
        delivery_address="100 Enterprise Way, Suite 400, Chicago, IL 60601",
        notes="Bulk purchase for new datacenter branch. Requesting $2,100/unit.",
        status="PENDING_SELLER_REVIEW",
        history=[
            BidHistoryItem(
                actor_role="CUSTOMER",
                actor_name="Acme Procurement",
                action="PLACED_BID",
                price=Decimal("2100.00"),
                message="Offered $2,100/unit for 5 Edge Servers.",
                timestamp=now - timedelta(hours=3)
            )
        ]
    ).insert()

    # Bid 2: Countered with "FINAL PRICE" (Seller gave take-it-or-leave-it price of $1,050 for 10 Network Switches)
    bid2 = await ProductBid(
        bid_number="BID-APX-002",
        product_id=str(prod3.id),
        product_name=prod3.name,
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        customer_id=buyer_id,
        customer_name="Acme Procurement",
        customer_email="buyer@acmecorp.com",
        quantity=10,
        original_price=Decimal("1200.00"),
        proposed_price=Decimal("950.00"),
        seller_counter_price=Decimal("1050.00"),
        is_final_offer=True,
        total_amount=Decimal("10500.00"),
        delivery_address="742 Evergreen Terrace, Springfield, OR",
        notes="Need 10 units for campus upgrade.",
        status="SELLER_COUNTERED",
        history=[
            BidHistoryItem(
                actor_role="CUSTOMER",
                actor_name="Acme Procurement",
                action="PLACED_BID",
                price=Decimal("950.00"),
                message="Proposed $950/unit for 10 switches.",
                timestamp=now - timedelta(hours=5)
            ),
            BidHistoryItem(
                actor_role="SELLER",
                actor_name="Apex Global Hardware",
                action="FINAL_OFFER",
                price=Decimal("1050.00"),
                message="Best bottom-line pricing we can offer is $1,050/unit. This is our Final Price.",
                timestamp=now - timedelta(hours=2)
            )
        ]
    ).insert()

    # Bid 3: AGREED Deal -> Automatically Generated Bill & Warehouse Delivery Dispatch!
    inv_agreed = await Invoice(
        invoice_number="INV-CS-9021",
        amount_due=Decimal("6000.00"),
        amount_paid=Decimal("0.0"),
        status="SENT",
        due_date=now + timedelta(days=14)
    ).insert()

    disp_agreed = await FulfillmentOrder(
        order_number="DISP-APX-4401",
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        customer_name="Acme Procurement",
        delivery_address="450 Innovation Blvd, Austin, TX 78701",
        product_name="Managed Network Switch 48-Port",
        quantity_to_deliver=6,
        status="READY_FOR_DELIVERY",
        dispatch_notes="Deal agreed at $1,000/unit. Bill #INV-CS-9021 issued. Ready for dispatch.",
        items=[
            FulfillmentItem(
                product_name="Managed Network Switch 48-Port",
                quantity=6,
                warehouse_name="Apex East Coast Hub"
            )
        ]
    ).insert()

    bid3 = await ProductBid(
        bid_number="BID-APX-003",
        product_id=str(prod3.id),
        product_name=prod3.name,
        seller_id=seller1_id,
        seller_name="Apex Global Hardware",
        customer_id=buyer_id,
        customer_name="Acme Procurement",
        customer_email="buyer@acmecorp.com",
        quantity=6,
        original_price=Decimal("1200.00"),
        proposed_price=Decimal("980.00"),
        seller_counter_price=Decimal("1000.00"),
        final_agreed_price=Decimal("1000.00"),
        total_amount=Decimal("6000.00"),
        delivery_address="450 Innovation Blvd, Austin, TX 78701",
        status="AGREED",
        invoice_id=str(inv_agreed.id),
        invoice_number=inv_agreed.invoice_number,
        fulfillment_id=str(disp_agreed.id),
        fulfillment_number=disp_agreed.order_number,
        history=[
            BidHistoryItem(
                actor_role="CUSTOMER",
                actor_name="Acme Procurement",
                action="PLACED_BID",
                price=Decimal("980.00"),
                message="Offered $980/unit for 6 units.",
                timestamp=now - timedelta(days=1)
            ),
            BidHistoryItem(
                actor_role="SELLER",
                actor_name="Apex Global Hardware",
                action="COUNTERED",
                price=Decimal("1000.00"),
                message="Countered at $1,000/unit.",
                timestamp=now - timedelta(hours=18)
            ),
            BidHistoryItem(
                actor_role="CUSTOMER",
                actor_name="Acme Procurement",
                action="ACCEPTED",
                price=Decimal("1000.00"),
                message="Accepted agreed price of $1,000/unit. Bill generated and Warehouse notified for delivery of 6 units.",
                timestamp=now - timedelta(hours=12)
            )
        ]
    ).insert()

    # Legacy Customers
    cust1 = await Customer(name="Acme Corp", email="procurement@acmecorp.com", customer_tier="GOLD").insert()
    cust2 = await Customer(name="Stark Industries", email="tony@stark.com", customer_tier="SILVER").insert()
    cust3 = await Customer(name="Wayne Enterprises", email="bruce@wayne.com", customer_tier="PLATINUM").insert()

    # Price lists
    pl1 = await PriceList(
        name="Q4 Enterprise Promo",
        currency="USD",
        is_active=True,
        valid_from=now,
        items=[
            PriceListItem(product=prod4, custom_price=Decimal("120.00")),
            PriceListItem(product=prod5, custom_price=Decimal("450.00"))
        ]
    ).insert()

    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
