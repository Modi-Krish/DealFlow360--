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
    from app.models.product import Category, Product
    from app.models.customer import Customer
    from app.models.pricing import PriceList, DiscountRule
    from app.models.quotation import Quotation
    from app.models.inventory import Warehouse, Inventory, FulfillmentOrder, InventoryTransaction
    from app.models.billing import Order, Subscription, Invoice, CreditNote, SubscriptionPlan
    from app.models.audit import AuditLog
    from app.models.bid import ProductBid
    from app.models.recommendation import ProductRecommendation, Promotion
    
    from app.models.approval import Approval, ApprovalHistory
    
    await init_beanie(
        database=database,
        document_models=[
            User,
            Category,
            Product,
            Customer,
            PriceList,
            DiscountRule,
            Quotation,
            Approval,
            ApprovalHistory,
            Warehouse,
            Inventory,
            InventoryTransaction,
            FulfillmentOrder,
            Order,
            Subscription,
            Invoice,
            CreditNote,
            SubscriptionPlan,
            ProductRecommendation,
            Promotion,
            AuditLog,
            ProductBid
        ]
    )

async def close_db():
    global db_client
    if db_client is not None:
        db_client.close()
