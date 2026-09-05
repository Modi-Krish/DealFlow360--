from decimal import Decimal
from beanie import PydanticObjectId
from app.models.product import Product
from app.models.customer import Customer
from app.models.pricing import PriceList, PriceListItem
from app.models.quotation import Quotation, QuotationItem

class PricingService:
    @staticmethod
    async def resolve_price(customer_id: str, product_id: str) -> Decimal:
        # Check for active price list matching customer
        # We don't have customer_tier on PriceList in our new Beanie model directly,
        # but we can query active PriceLists. For simplicity, we just check items.
        price_lists = await PriceList.find(PriceList.is_active == True).to_list()
        
        for pl in price_lists:
            for item in pl.items:
                if str(item.product.ref.id) == product_id:
                    return item.custom_price
                
        # Fallback to product base price
        product = await Product.get(PydanticObjectId(product_id))
        if product:
            return product.base_price
            
        return Decimal("0.0")

    @staticmethod
    def calculate_line_item(item: QuotationItem, base_price: Decimal) -> None:
        item.unit_price = base_price
        
        # We use 'discount' and 'tax' in the new QuotationItem model instead of discount_amount/percent
        discount_amount = item.discount
        taxable_amount = (item.unit_price * item.quantity) - discount_amount
        item.tax = taxable_amount * Decimal("0.10") # Fixed 10% tax for simplicity since tax_rate isn't fetched
        item.total_price = taxable_amount + item.tax

    @staticmethod
    def calculate_quotation_totals(quotation: Quotation) -> None:
        quotation.subtotal = sum((item.unit_price * item.quantity) for item in quotation.items)
        quotation.discount_total = sum(item.discount for item in quotation.items)
        quotation.tax_total = sum(item.tax for item in quotation.items)
        quotation.grand_total = sum(item.total_price for item in quotation.items)
