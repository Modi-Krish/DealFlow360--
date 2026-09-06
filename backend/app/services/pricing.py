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
        item.unit_price = Decimal(str(base_price))
        qty = Decimal(str(item.quantity))
        gross = item.unit_price * qty
        
        # item.discount represents discount percentage (0 - 100%)
        discount_percent = Decimal(str(item.discount or "0.0"))
        if discount_percent < Decimal("0.0"):
            discount_percent = Decimal("0.0")
        elif discount_percent > Decimal("100.0"):
            discount_percent = Decimal("100.0")
            
        item.discount = discount_percent
        
        # Formula: discount_amount = (unit_price * quantity) * (discount_percent / 100)
        discount_amount = (gross * (discount_percent / Decimal("100.0"))).quantize(Decimal("0.01"))
        taxable_amount = max(Decimal("0.0"), gross - discount_amount)
        
        # Fixed 10% tax rate on taxable amount
        item.tax = (taxable_amount * Decimal("0.10")).quantize(Decimal("0.01"))
        item.total_price = (taxable_amount + item.tax).quantize(Decimal("0.01"))

    @staticmethod
    def calculate_quotation_totals(quotation: Quotation) -> None:
        subtotal = Decimal("0.0")
        discount_total = Decimal("0.0")
        tax_total = Decimal("0.0")
        grand_total = Decimal("0.0")
        
        for item in quotation.items:
            unit_p = Decimal(str(item.unit_price or "0.0"))
            qty = Decimal(str(item.quantity or "1"))
            gross = unit_p * qty
            disc_pct = Decimal(str(item.discount or "0.0"))
            disc_amt = (gross * (disc_pct / Decimal("100.0"))).quantize(Decimal("0.01"))
            
            subtotal += gross
            discount_total += disc_amt
            tax_total += Decimal(str(item.tax or "0.0"))
            grand_total += Decimal(str(item.total_price or "0.0"))
            
        quotation.subtotal = subtotal.quantize(Decimal("0.01"))
        quotation.discount_total = discount_total.quantize(Decimal("0.01"))
        quotation.tax_total = tax_total.quantize(Decimal("0.01"))
        quotation.grand_total = grand_total.quantize(Decimal("0.01"))
