import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from app.core.database import init_db
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.models.category import Category
from app.models.product import Product
from app.models.customer import Customer
from app.models.pricing import PriceList, PriceListItem
from app.models.inventory import Warehouse, Inventory

async def seed_data():
    print("Initializing MongoDB and Beanie...")
    await init_db()
    
    print("Clearing collections...")
    # Drop all collections we are seeding to start fresh
    await User.delete_all()
    await Category.delete_all()
    await Product.delete_all()
    await Customer.delete_all()
    await PriceList.delete_all()
    await Warehouse.delete_all()
    await Inventory.delete_all()
    
    print("Creating users...")
    admin = User(name="Admin User", email="admin@dealflow360.com", password_hash=get_password_hash("admin123"), role=UserRole.ADMIN)
    sales_rep = User(name="Sarah Sales", email="sarah@dealflow360.com", password_hash=get_password_hash("sales123"), role=UserRole.SALES_REP)
    sales_manager = User(name="Mike Manager", email="mike@dealflow360.com", password_hash=get_password_hash("manager123"), role=UserRole.SALES_MANAGER)
    ops = User(name="Warehouse Ops", email="ops@dealflow360.com", password_hash=get_password_hash("ops123"), role=UserRole.FINANCE_OPS)
    
    await User.insert_many([admin, sales_rep, sales_manager, ops])
    
    print("Creating Categories & Products...")
    software_cat = await Category(name="Software Licenses", description="Enterprise software").insert()
    hardware_cat = await Category(name="Hardware", description="Server and networking equipment").insert()
    
    prod1 = await Product(name="Enterprise Cloud CRM", sku="CRM-ENT-001", base_price=Decimal("150.00"), category=software_cat, unit="month", is_active=True).insert()
    prod2 = await Product(name="Analytics Pro API", sku="API-PRO-002", base_price=Decimal("500.00"), category=software_cat, unit="month", is_active=True).insert()
    prod3 = await Product(name="Edge Server 1U", sku="HW-SRV-100", base_price=Decimal("2400.00"), category=hardware_cat, unit="unit", is_active=True).insert()
    
    print("Creating Warehouses & Inventory...")
    wh1 = await Warehouse(name="US East (N. Virginia)", location="Virginia", is_active=True).insert()
    wh2 = await Warehouse(name="EU Central (Frankfurt)", location="Germany", is_active=True).insert()
    
    inv1 = await Inventory(warehouse=wh1, product=prod3, quantity_on_hand=50, quantity_allocated=0).insert()
    inv2 = await Inventory(warehouse=wh2, product=prod3, quantity_on_hand=20, quantity_allocated=0).insert()
    
    print("Creating Customers...")
    cust1 = await Customer(name="Acme Corp", email="procurement@acmecorp.com", customer_tier="GOLD").insert()
    cust2 = await Customer(name="Stark Industries", email="tony@stark.com", customer_tier="SILVER").insert()
    
    print("Creating Pricing Lists...")
    q4_promo = PriceList(
        name="Q4 Enterprise Promo", 
        currency="USD", 
        is_active=True, 
        valid_from=datetime.now(timezone.utc),
        items=[
            PriceListItem(product=prod1, custom_price=Decimal("120.00"))
        ]
    )
    await q4_promo.insert()
    
    print("Database seeded successfully with master data into MongoDB!")

if __name__ == "__main__":
    asyncio.run(seed_data())
