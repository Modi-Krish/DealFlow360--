from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.customers import router as customers_router
from app.api.v1.pricing import router as pricing_router
from app.api.v1.quotations import router as quotations_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.fulfillment import router as fulfillment_router
from app.api.v1.billing import router as billing_router
from app.api.v1.portal import router as portal_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.bids import router as bids_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(products_router, tags=["Products & Categories"])
api_router.include_router(customers_router, prefix="/customers", tags=["Customers"])
api_router.include_router(pricing_router, prefix="/price-lists", tags=["Pricing"])
api_router.include_router(quotations_router, prefix="/quotations", tags=["Quotations"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(recommendations_router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(fulfillment_router, prefix="/fulfillment", tags=["Fulfillment"])
api_router.include_router(billing_router, prefix="/billing", tags=["Billing"])
api_router.include_router(portal_router, prefix="/portal", tags=["Customer Portal"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(bids_router, prefix="/bids", tags=["Bidding & Negotiations"])
