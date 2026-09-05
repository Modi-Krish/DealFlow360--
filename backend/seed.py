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
from app.models.quotation import Quotation, QuotationItem
from app.models.audit import AuditLog

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
    await Quotation.delete_all()
    await AuditLog.delete_all()
    
    print("Creating multi-seller users with canonical 7-role hierarchy...")
    # 1. Super Admin
    admin = User(
        name="Super Admin",
        email="admin@dealflow360.com",
        password_hash=get_password_hash("admin123"),
        role=UserRole.SUPER_ADMIN.value,
        permissions=["*"],
        company_name="DealFlow360 Platform",
        status="ACTIVE"
    )
    await admin.insert()

    # 2. Seller 1: Apex Global Hardware
    seller1 = User(
        name="Apex Global Hardware",
        email="seller1@dealflow360.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER.value,
        company_name="Apex Global Hardware",
        status="ACTIVE"
    )
    await seller1.insert()
    seller1.seller_id = str(seller1.id)
    await seller1.save()
    seller1_id = str(seller1.id)

    # Apex Employees
    sales_manager_apex = User(
        name="Sarah Manager",
        email="manager@apex.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SALES_MANAGER.value,
        company_name="Apex Global Hardware",
        seller_id=seller1_id,
        status="ACTIVE"
    )
    sales_rep_apex = User(
        name="Marcus Vance",
        email="marcus@apex.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SALES_REP.value,
        company_name="Apex Global Hardware",
        seller_id=seller1_id,
        status="ACTIVE"
    )
    finance_apex = User(
        name="Fiona Finance",
        email="finance@apex.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.FINANCE.value,
        company_name="Apex Global Hardware",
        seller_id=seller1_id,
        status="ACTIVE"
    )
    ops_apex = User(
        name="Apex Logistics & Warehouse",
        email="warehouse@apex.com",
        password_hash=get_password_hash("ops123"),
        role=UserRole.OPERATIONS.value,
        company_name="Apex Global Hardware",
        seller_id=seller1_id,
        status="ACTIVE"
    )
    await sales_manager_apex.insert()
    await sales_rep_apex.insert()
    await finance_apex.insert()
    await ops_apex.insert()

    # 3. Seller 2: CloudScale Technologies
    seller2 = User(
        name="CloudScale Technologies",
        email="seller2@dealflow360.com",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SELLER.value,
        company_name="CloudScale Technologies",
        status="ACTIVE"
    )
    await seller2.insert()
    seller2.seller_id = str(seller2.id)
    await seller2.save()
    seller2_id = str(seller2.id)

    # CloudScale Employees
    sales_rep_cs = User(
        name="Elena Rostova",
        email="elena@cloudscale.io",
        password_hash=get_password_hash("seller123"),
        role=UserRole.SALES_REP.value,
        company_name="CloudScale Technologies",
        seller_id=seller2_id,
        status="ACTIVE"
    )
    ops_cs = User(
        name="CloudScale Fulfillment",
        email="warehouse@cloudscale.io",
        password_hash=get_password_hash("ops123"),
        role=UserRole.OPERATIONS.value,
        company_name="CloudScale Technologies",
        seller_id=seller2_id,
        status="ACTIVE"
    )
    await sales_rep_cs.insert()
    await ops_cs.insert()

    # 4. Customer Buyer
    buyer = User(
        name="Acme Procurement",
        email="buyer@acmecorp.com",
        password_hash=get_password_hash("buyer123"),
        role=UserRole.CUSTOMER.value,
        company_name="Acme Corporation",
        status="ACTIVE"
    )
    await buyer.insert()
    buyer_id = str(buyer.id)

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

    print("Creating Warehouses & Inventory...")
    wh1 = await Warehouse(name="Apex East Coast Hub", location="New Jersey", seller_id=seller1_id, is_active=True).insert()
    wh2 = await Warehouse(name="CloudScale Tech Facility", location="San Jose, CA", seller_id=seller2_id, is_active=True).insert()
    
    await Inventory(warehouse=wh1, product=prod1, seller_id=seller1_id, quantity_on_hand=45, quantity_allocated=5).insert()
    await Inventory(warehouse=wh1, product=prod2, seller_id=seller1_id, quantity_on_hand=20, quantity_allocated=2).insert()
    await Inventory(warehouse=wh2, product=prod4, seller_id=seller2_id, quantity_on_hand=500, quantity_allocated=50).insert()

    print("Creating Customers...")
    cust1 = await Customer(name="Acme Corp", email="buyer@acmecorp.com", customer_tier="GOLD", seller_id=seller1_id).insert()
    cust2 = await Customer(name="Stark Industries", email="tony@stark.com", customer_tier="SILVER", seller_id=seller1_id).insert()
    cust3 = await Customer(name="Wayne Enterprises", email="bruce@wayne.com", customer_tier="PLATINUM", seller_id=seller2_id).insert()

    print("Creating Sample Quotations...")
    q1 = await Quotation(
        quotation_number="QT-APX-1001",
        customer=cust1,
        sales_rep=sales_rep_apex,
        seller_id=seller1_id,
        status="APPROVED",
        subtotal=Decimal("4800.00"),
        grand_total=Decimal("4800.00"),
        items=[
            QuotationItem(
                product=prod1,
                quantity=2,
                unit_price=Decimal("2400.00"),
                discount=Decimal("0.0"),
                tax=Decimal("0.0"),
                total_price=Decimal("4800.00")
            )
        ]
    ).insert()

    q2 = await Quotation(
        quotation_number="QT-CS-2001",
        customer=cust3,
        sales_rep=sales_rep_cs,
        seller_id=seller2_id,
        status="APPROVED",
        subtotal=Decimal("1500.00"),
        grand_total=Decimal("1500.00"),
        items=[
            QuotationItem(
                product=prod4,
                quantity=10,
                unit_price=Decimal("150.00"),
                discount=Decimal("0.0"),
                tax=Decimal("0.0"),
                total_price=Decimal("1500.00")
            )
        ]
    ).insert()

    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
