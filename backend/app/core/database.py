from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Global motor client
db_client: AsyncIOMotorClient = None

async def init_db():
    global db_client
    # Create Motor client
    db_client = AsyncIOMotorClient(settings.MONGODB_URI)
    
    # Database
    database = db_client[settings.DATABASE_NAME]
    
    # Initialize Beanie with our document models
    # We will import them here to avoid circular imports
    from app.models.user import User
    from app.models.product import Category, Product, ProductVariant
    from app.models.customer import Customer
    from app.models.pricing import PriceList, PriceListItem
    from app.models.quotation import Quotation
    from app.models.inventory import Warehouse, Inventory, FulfillmentOrder
    from app.models.billing import Order, Subscription, Invoice
    from app.models.audit import AuditLog
    
    await init_beanie(
        database=database,
        document_models=[
            User,
            Category,
            Product,
            ProductVariant,
            Customer,
            PriceList,
            PriceListItem,
            Quotation,
            Warehouse,
            Inventory,
            FulfillmentOrder,
            Order,
            Subscription,
            Invoice,
            AuditLog
        ]
    )

async def close_db():
    global db_client
    if db_client is not None:
        db_client.close()
