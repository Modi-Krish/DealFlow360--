"""
DealFlow360 - 250+ Per Collection Seed Script
Every single collection will have >= 250 records.

Target counts:
  Users          : 301  (1 admin + 20 sellers + 14 employees × 20)
  Categories     : 288  (12 domains × 24 types)
  Products       : 300  (15 per seller × 20 sellers)
  Customers      : 260  (13 per seller × 20 sellers)
  Warehouses     : 260  (13 per seller × 20 sellers)
  Inventory      : 300  (1 per product × 20 sellers)
  PriceLists     : 260  (13 per seller × 20 sellers)
  DiscountRules  : 260  (13 per seller × 20 sellers)
  Quotations     : 360  (18 per seller × 20 sellers)
  Approvals      : 490+ (L1 + L2 escalations)
  ApprovalHist.  : 420+ (histories for processed approvals)
  Orders         : 250+ (approved quotations + extras)
  Invoices       : 250+ (1:1 with orders)
  Subscriptions  : 260  (13 per seller × 20 sellers)
  FulfillmentOrds: 250+ (1 per non-cancelled order + extras)
  AuditLogs      : 310  (10 admin + 15 per seller × 20 sellers)
"""

import asyncio
import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.core.database import init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.customer import Customer
from app.models.pricing import PriceList, PriceListItem, DiscountRule
from app.models.inventory import Warehouse, Inventory, FulfillmentOrder, FulfillmentItem
from app.models.billing import Invoice, Order, Subscription
from app.models.bid import ProductBid
from app.models.quotation import Quotation, QuotationItem
from app.models.approval import Approval, ApprovalHistory
from app.models.audit import AuditLog


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _d(v: str) -> Decimal:
    return Decimal(v)

def _past(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)

def _future(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


# ─────────────────────────────────────────────
# Static Data Pools
# ─────────────────────────────────────────────

FIRST_NAMES = [
    "Alexander", "Beatrice", "Carlos", "Diana", "Edward", "Fatima", "George", "Helena",
    "Ibrahim", "Julia", "Kevin", "Laura", "Mohammed", "Natasha", "Oliver", "Priya",
    "Quincy", "Rachel", "Samuel", "Tanya", "Ulrich", "Victoria", "William", "Xena",
    "Yusuf", "Zara", "Aaron", "Brianna", "Cameron", "Daniela", "Ethan", "Florence",
    "Gabriel", "Hannah", "Ivan", "Jessica", "Kyle", "Lena", "Marco", "Nina",
    "Oscar", "Paula", "Ramon", "Sofia", "Trevor", "Uma", "Vincent", "Wendy",
    "Xavier", "Yasmin", "Zachary", "Amelia", "Benjamin", "Camille", "Derek", "Elise",
    "Felipe", "Grace", "Hugo", "Irene", "Jonas", "Katarina", "Leon", "Maya",
]

LAST_NAMES = [
    "Anderson", "Baker", "Castro", "Diaz", "Evans", "Foster", "Garcia", "Harris",
    "Ingram", "Jensen", "Kumar", "Lopez", "Martinez", "Nelson", "Owen", "Patel",
    "Quinn", "Rivera", "Santos", "Torres", "Ueda", "Vasquez", "Walker", "Xu",
    "Young", "Zhang", "Adams", "Brown", "Collins", "Davis", "Edwards", "Flynn",
    "Gomez", "Hughes", "Ibarra", "Johnson", "King", "Lewis", "Moore", "Nakamura",
    "Park", "Reed", "Scott", "Taylor", "Underwood", "Vance", "White", "Yang",
]

COMPANY_PREFIXES = [
    "Acme", "Allied", "Alpha", "Apex", "Atlantic", "Atlas", "Aurora", "Axis",
    "Blue", "Bold", "Bright", "Broad", "Cardinal", "Central", "Cobalt", "Core",
    "Crown", "Crystal", "Delta", "Diamond", "Dynamic", "Eagle", "Edge", "Elite",
    "Ember", "Empire", "Excel", "Falcon", "First", "Forte", "Frontier", "Global",
    "Gold", "Grand", "Green", "Grid", "Harbor", "High", "Horizon", "Hydra",
    "Impact", "Indigo", "Infinity", "Inter", "Iron", "Jade", "Jupiter", "Legacy",
    "Liberty", "Link", "Matrix", "Metro", "Nexus", "Noble", "Nova", "Omega",
    "Onyx", "Open", "Pacific", "Peak", "Pivot", "Prime", "Prism", "Pro",
    "Rapid", "Razor", "Regal", "Rise", "Royal", "Sage", "Sharp", "Silver",
    "Smart", "Solar", "Solid", "Spark", "Star", "Steel", "Summit", "Swift",
    "Tech", "Terra", "Titan", "Trans", "Trek", "Tri", "True", "Turbo",
    "Ultra", "Uni", "United", "Universal", "Vector", "Vertex", "Vision", "Vital",
]

COMPANY_TYPES = [
    "Corporation", "Industries", "Enterprises", "Group", "Holdings", "Solutions",
    "Systems", "Technologies", "Services", "Partners", "Associates", "International",
    "Global", "Ventures", "Capital", "Networks", "Dynamics", "Innovations",
    "Resources", "Consulting", "Management", "Analytics", "Digital", "Interactive",
]

CITY_LIST = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Fort Worth", "Columbus", "Charlotte", "Indianapolis", "San Francisco", "Seattle",
    "Denver", "Nashville", "Oklahoma City", "El Paso", "Boston", "Portland",
    "Las Vegas", "Memphis", "Louisville", "Baltimore", "Milwaukee", "Albuquerque",
    "Tucson", "Fresno", "Sacramento", "Kansas City", "Mesa", "Atlanta", "Omaha",
    "Colorado Springs", "Raleigh", "Long Beach", "Virginia Beach", "Minneapolis",
    "Tampa", "New Orleans", "Arlington", "Bakersfield", "Honolulu", "Anaheim",
    "Aurora", "Santa Ana", "Corpus Christi", "Riverside", "St Louis", "Lexington",
    "Pittsburgh", "Anchorage", "Stockton", "Cincinnati", "St Paul", "Toledo",
]

WAREHOUSE_TYPES = [
    "Distribution Hub", "Fulfillment Center", "Regional Depot", "Logistics Facility",
    "Storage Warehouse", "Dispatch Center", "Operations Hub", "Processing Center",
    "Delivery Station", "Supply Depot", "Assembly Center", "Packaging Facility",
    "Technical Depot", "Service Center", "Field Operations Base",
]

SELLER_CONFIGS = [
    {"name": "Apex Global Hardware",        "short": "APX", "domain": "apexhardware.com",    "focus": "hardware"},
    {"name": "CloudScale Technologies",     "short": "CST", "domain": "cloudscale.io",        "focus": "software"},
    {"name": "NovaSoft Solutions",          "short": "NSS", "domain": "novasoft.dev",          "focus": "software"},
    {"name": "TerraLogix Systems",          "short": "TLS", "domain": "terralogix.com",        "focus": "hardware"},
    {"name": "Quantum Edge Networks",       "short": "QEN", "domain": "quantumedge.net",       "focus": "networking"},
    {"name": "Meridian Data Corp",          "short": "MDC", "domain": "meridiandata.com",      "focus": "software"},
    {"name": "Synapse Technologies",        "short": "SYN", "domain": "synapsetech.io",        "focus": "software"},
    {"name": "Orion Business Systems",      "short": "OBS", "domain": "orionbiz.com",          "focus": "hardware"},
    {"name": "Nexus Infrastructure",        "short": "NXS", "domain": "nexusinfra.com",        "focus": "networking"},
    {"name": "Catalyst Cloud Services",     "short": "CAT", "domain": "catalystcloud.io",      "focus": "software"},
    {"name": "Pinnacle Tech Group",         "short": "PTG", "domain": "pinnacletech.com",      "focus": "hardware"},
    {"name": "Zenith Networks Ltd",         "short": "ZNL", "domain": "zenithnetworks.com",    "focus": "networking"},
    {"name": "Atlas Information Systems",   "short": "AIS", "domain": "atlasinfo.com",         "focus": "software"},
    {"name": "Vertex Solutions Inc",        "short": "VSI", "domain": "vertexsol.com",         "focus": "services"},
    {"name": "Cobalt Technologies",         "short": "CBT", "domain": "cobalttech.com",        "focus": "hardware"},
    {"name": "Sterling Digital Group",      "short": "SDG", "domain": "sterlingdigital.com",   "focus": "software"},
    {"name": "Horizon Systems Corp",        "short": "HSC", "domain": "horizonsys.com",        "focus": "networking"},
    {"name": "Ironclad Infrastructure",     "short": "ICI", "domain": "ironclad.io",           "focus": "hardware"},
    {"name": "Cascade Business Software",   "short": "CBS", "domain": "cascadesoft.com",       "focus": "software"},
    {"name": "Summit Technology Partners",  "short": "STP", "domain": "summittech.com",        "focus": "services"},
]

PRODUCT_TEMPLATES = {
    "hardware": [
        ("Edge Server 1U Rack",           "SRV01", "unit",    "1800.00",  50),
        ("Edge Server 2U Rack",           "SRV02", "unit",    "2400.00",  40),
        ("Edge Server 4U Tower",          "SRV03", "unit",    "3800.00",  25),
        ("Blade Server Chassis 10-Slot",  "SRV04", "unit",    "5500.00",  15),
        ("Storage Array 10TB SAS",        "STO01", "unit",    "4500.00",  20),
        ("Storage Array 50TB Enterprise", "STO02", "unit",   "12000.00",   8),
        ("NVMe Flash Array 5TB",          "STO03", "unit",    "8500.00",  12),
        ("Network Switch 24-Port GbE",    "NET01", "unit",     "800.00",  60),
        ("Network Switch 48-Port GbE",    "NET02", "unit",    "1200.00",  45),
        ("Core Switch 96-Port 10GbE",     "NET03", "unit",    "3500.00",  18),
        ("Rackmount UPS 1500VA",          "UPS01", "unit",     "650.00",  35),
        ("Rackmount UPS 3000VA",          "UPS02", "unit",     "950.00",  25),
        ("Fibre Channel HBA Dual-Port",   "HBA01", "unit",     "680.00",  55),
        ("GPU Compute Module A100",       "GPU01", "unit",    "9800.00",   6),
        ("KVM Switch 16-Port IP",         "KVM01", "unit",     "450.00",  40),
    ],
    "software": [
        ("CRM Enterprise License",        "CRM01", "user/month",  "150.00", 5000),
        ("CRM Professional License",      "CRM02", "user/month",   "95.00", 3000),
        ("ERP Core Platform",             "ERP01", "month",      "2500.00",  500),
        ("ERP Advanced Module",           "ERP02", "module/month", "800.00", 1000),
        ("BI Analytics Dashboard",        "BI001", "month",       "350.00", 2000),
        ("BI Data Warehouse",             "BI002", "TB/month",   "1200.00",  800),
        ("HR Automation Suite",           "HR001", "month",       "450.00", 1500),
        ("Document Management System",    "DMS01", "month",       "220.00", 2500),
        ("Contract Management Tool",      "CTM01", "month",       "380.00", 1800),
        ("Cloud Monitoring Suite",        "MON01", "month",       "300.00", 3000),
        ("DevOps CICD Platform",          "DEV01", "month",       "450.00", 2500),
        ("API Gateway Service",           "API01", "month",       "200.00", 4000),
        ("Identity Access Management",    "IAM01", "user/month",   "12.00", 10000),
        ("Data Lake Storage 50TB",        "DLS01", "month",      "1200.00", 1000),
        ("AI ML Model Platform",          "AIM01", "month",       "900.00", 1500),
    ],
    "networking": [
        ("5G Edge Router Enterprise",        "RTR01", "unit",   "4200.00",  28),
        ("SD-WAN Appliance 1Gbps",           "SDW01", "unit",   "3800.00",  20),
        ("SD-WAN Appliance 10Gbps",          "SDW02", "unit",   "6800.00",  12),
        ("Next-Gen Firewall SMB",            "FWL01", "unit",   "1800.00",  35),
        ("Next-Gen Firewall Enterprise",     "FWL02", "unit",   "3500.00",  18),
        ("Load Balancer 10Gbps ADC",         "LBL01", "unit",   "5200.00",  10),
        ("Zero-Trust Network Access SaaS",   "ZTA01", "month",   "900.00", 1500),
        ("DDoS Protection Cloud Service",    "DDS01", "month",   "700.00", 2000),
        ("Network Monitoring Platform",      "NMP01", "month",   "400.00", 1800),
        ("WiFi 6E Enterprise Access Point",  "WAP01", "unit",    "650.00",  80),
        ("VPN Concentrator 500-User",        "VPN01", "unit",   "2200.00",  22),
        ("Optical Fiber Switch 100GbE",      "OFS01", "unit",   "8500.00",   8),
        ("Network TAP Aggregator",           "TAP01", "unit",   "1600.00",  15),
        ("SIEM Platform Enterprise",         "SIM01", "month",  "1800.00",  400),
        ("Managed NOC Service Monthly",      "NOC01", "month",  "3500.00",  200),
    ],
    "services": [
        ("IT Strategy Consulting",          "SVC01", "day",     "2500.00", 999),
        ("Cloud Architecture Design",       "SVC02", "day",     "2200.00", 999),
        ("Infrastructure Assessment",       "SVC03", "project", "8000.00", 999),
        ("Network Design Blueprint",        "SVC04", "project", "6500.00", 999),
        ("Software Implementation Service", "SVC05", "day",     "1800.00", 999),
        ("Data Migration Service",          "SVC06", "project","12000.00", 999),
        ("Security Penetration Testing",    "SVC07", "project","15000.00", 999),
        ("Compliance Audit Package",        "SVC08", "project", "9500.00", 999),
        ("System Integration Package",      "SVC09", "project", "7500.00", 999),
        ("24x7 Priority Support Contract",  "SVC10", "month",   "1200.00", 999),
        ("Staff Augmentation Monthly",      "SVC11", "month",   "5000.00", 999),
        ("Technical Training Bootcamp",     "TRN01", "session", "3500.00", 999),
        ("Technical Onboarding Session",    "TRN02", "session", "1500.00", 999),
        ("Disaster Recovery Planning",      "DRP01", "project","18000.00", 999),
        ("DevOps Transformation Program",   "DXF01", "project","25000.00", 999),
    ],
}

CATEGORY_DOMAINS = [
    "Enterprise Software", "Cloud Infrastructure", "Hardware Equipment",
    "Professional Services", "Managed Services", "Security and Compliance",
    "Networking Solutions", "Data Center Technologies", "Business Intelligence",
    "Communications and Collaboration", "DevOps and Automation", "AI and Machine Learning",
]

CATEGORY_TYPES = [
    "Licensing", "Implementation", "Consulting", "Support", "Training",
    "Migration", "Integration", "Optimization", "Monitoring", "Assessment",
    "Architecture", "Provisioning", "Management", "Compliance", "Auditing",
    "Reporting", "Deployment", "Configuration", "Testing", "Maintenance",
    "Upgrades", "Automation", "Design", "Planning",
]

TIERS = ["STANDARD", "SILVER", "GOLD", "PLATINUM"]

DISCOUNT_TIER_VARIATIONS = [
    {"Standard": 5.0,  "Silver": 10.0, "Gold": 15.0, "Platinum": 25.0},
    {"Standard": 4.0,  "Silver": 8.0,  "Gold": 12.0, "Platinum": 20.0},
    {"Standard": 6.0,  "Silver": 11.0, "Gold": 16.0, "Platinum": 22.0},
    {"Standard": 3.0,  "Silver": 7.0,  "Gold": 13.0, "Platinum": 18.0},
    {"Standard": 5.0,  "Silver": 9.0,  "Gold": 14.0, "Platinum": 23.0},
    {"Standard": 7.0,  "Silver": 12.0, "Gold": 17.0, "Platinum": 27.0},
    {"Standard": 4.5,  "Silver": 8.5,  "Gold": 13.5, "Platinum": 21.0},
    {"Standard": 5.5,  "Silver": 10.5, "Gold": 15.5, "Platinum": 24.0},
    {"Standard": 3.5,  "Silver": 7.5,  "Gold": 12.5, "Platinum": 19.0},
    {"Standard": 6.5,  "Silver": 11.5, "Gold": 16.5, "Platinum": 26.0},
    {"Standard": 4.0,  "Silver": 9.0,  "Gold": 14.0, "Platinum": 22.5},
    {"Standard": 5.0,  "Silver": 10.0, "Gold": 15.0, "Platinum": 25.0},
    {"Standard": 3.0,  "Silver": 8.0,  "Gold": 13.0, "Platinum": 20.0},
]

PRICE_LIST_NAMES = [
    "Standard Rate Card",       "Premium Tier Pricing",     "Gold Partner Rate",
    "Platinum VIP Pricing",     "Volume Discount List",     "Wholesale Rate Card",
    "Reseller Channel Pricing", "Direct Purchase Rate",     "Contract Pricing Q1",
    "Contract Pricing Q2",      "Contract Pricing Q3",      "Contract Pricing Q4",
    "Partner Program Pricing",
]

ROLES_PER_SELLER = [
    "SALES_MANAGER", "SALES_MANAGER",
    "SALES_REP", "SALES_REP", "SALES_REP", "SALES_REP", "SALES_REP",
    "FINANCE", "FINANCE",
    "OPERATIONS", "OPERATIONS", "OPERATIONS",
    "SALES_REP", "SALES_REP",
]
# 14 employees × 20 sellers = 280 employees

AUDIT_ACTIONS = [
    "CREATE_QUOTATION", "SUBMIT_FOR_APPROVAL", "APPROVE_QUOTATION",
    "REJECT_QUOTATION", "ALLOCATE_STOCK", "DISPATCH_ORDER",
    "MARK_DELIVERED", "CREATE_INVOICE", "RECORD_PAYMENT",
    "CREATE_CUSTOMER", "UPDATE_PRICE_LIST", "CREATE_ORDER",
    "CANCEL_SUBSCRIPTION", "UPDATE_DISCOUNT_RULE", "CREATE_PRODUCT",
    "UPDATE_PRODUCT", "EXPORT_REPORT", "BULK_IMPORT",
    "PRICE_OVERRIDE", "TIER_UPGRADE", "SUBSCRIPTION_RENEWAL",
    "PERMISSION_DENIED", "LOGIN_SUCCESS", "AUDIT_EXPORT",
]

STATUS_POOL = (
    ["DRAFT"] * 2 + ["PENDING"] * 2 + ["IN_REVIEW"] * 1
    + ["PENDING_APPROVAL"] * 2 + ["APPROVED"] * 4
    + ["REJECTED"] * 1 + ["ALLOCATED"] * 2
    + ["CLOSED_WON"] * 3 + ["CLOSED_LOST"] * 1
)  # 18 statuses


# ─────────────────────────────────────────────
# Main Seeder
# ─────────────────────────────────────────────

async def seed_data():
    print("=" * 65)
    print("DealFlow360 - 250+ Per Collection Seeder")
    print("=" * 65)

    print("\n[1/12] Initializing MongoDB and Beanie ...")
    await init_db()

    print("[2/12] Clearing all collections ...")
    await AuditLog.delete_all()
    await ApprovalHistory.delete_all()
    await Approval.delete_all()
    await FulfillmentOrder.delete_all()
    await Invoice.delete_all()
    await Subscription.delete_all()
    await Order.delete_all()
    await Quotation.delete_all()
    await Inventory.delete_all()
    await Warehouse.delete_all()
    await PriceList.delete_all()
    await DiscountRule.delete_all()
    await ProductBid.delete_all()
    await Customer.delete_all()
    await Product.delete_all()
    await Category.delete_all()
    await User.delete_all()

    # ─── SUPER ADMIN ───
    print("[3/12] Super Admin ...")
    admin = User(
        name="Alex Superadmin",
        email="admin@dealflow360.com",
        password_hash=get_password_hash("Admin@123"),
        role=UserRole.SUPER_ADMIN.value,
        permissions=["*"],
        company_name="DealFlow360 Platform",
        status="ACTIVE",
    )
    await admin.insert()

    # ─── CATEGORIES (12 × 24 = 288) ───
    print("[4/12] Creating 288 categories ...")
    categories = []
    for domain in CATEGORY_DOMAINS:
        for ctype in CATEGORY_TYPES:
            cat = await Category(
                name=f"{domain} - {ctype}",
                description=f"Category covering {ctype.lower()} within {domain.lower()}",
            ).insert()
            categories.append(cat)
    print(f"     -> {len(categories)} categories")

    # ─── SELLERS + EMPLOYEES (20 sellers + 280 employees = 301 users) ───
    print("[5/12] Creating 20 sellers and 280 employees ...")
    sellers = {}
    employees = {}  # short -> list[User]

    # Build global name iterator for unique employee names
    name_pairs = [(f, l) for f in FIRST_NAMES for l in LAST_NAMES]
    name_idx = 0

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = User(
            name=sd["name"],
            email=f"seller@{sd['domain']}",
            password_hash=get_password_hash("Seller@123"),
            role=UserRole.SELLER.value,
            company_name=sd["name"],
            status="ACTIVE",
        )
        await seller.insert()
        seller.seller_id = str(seller.id)
        await seller.save()
        sellers[short] = seller
        employees[short] = []

        for emp_idx, role_str in enumerate(ROLES_PER_SELLER):
            fname, lname = name_pairs[name_idx % len(name_pairs)]
            name_idx += 1
            email = f"{fname.lower()}.{lname.lower()}.{seller_idx}{emp_idx}@{sd['domain']}"
            role_enum = UserRole[role_str]
            u = User(
                name=f"{fname} {lname}",
                email=email,
                password_hash=get_password_hash("Pass@123"),
                role=role_enum.value,
                company_name=sd["name"],
                seller_id=str(seller.id),
                status="ACTIVE",
            )
            await u.insert()
            employees[short].append(u)

    print(f"     -> {await User.count()} users total")

    # ─── PRODUCTS (15 per seller × 20 = 300) ───
    print("[6/12] Creating 300 products ...")
    products = {}

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        focus = sd["focus"]
        seller = sellers[short]
        seller_id = str(seller.id)
        products[short] = []

        templates = PRODUCT_TEMPLATES.get(focus, PRODUCT_TEMPLATES["services"])
        cat = categories[(seller_idx * 7) % len(categories)]

        for tmpl_idx, (pname, pcode, unit, price, stock) in enumerate(templates):
            sku = f"{short}-{pcode}-{tmpl_idx+1:02d}"
            p = await Product(
                name=f"{pname} [{seller.name}]",
                sku=sku,
                base_price=_d(price),
                category=cat,
                unit=unit,
                seller_id=seller_id,
                seller_name=seller.name,
                stock_quantity=stock,
                status="ACTIVE",
            ).insert()
            products[short].append(p)

    print(f"     -> {await Product.count()} products")

    # ─── CUSTOMERS (13 per seller × 20 = 260) ───
    print("[7/12] Creating 260 customers ...")
    customers = {}
    company_idx = 0
    used_names: set = set()

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        customers[short] = []

        for i in range(13):
            # Generate unique company name
            while True:
                p_idx = company_idx % len(COMPANY_PREFIXES)
                t_idx = (company_idx // len(COMPANY_PREFIXES)) % len(COMPANY_TYPES)
                company_name = f"{COMPANY_PREFIXES[p_idx]} {COMPANY_TYPES[t_idx]}"
                company_idx += 1
                if company_name not in used_names:
                    used_names.add(company_name)
                    break

            tier = TIERS[i % len(TIERS)]
            # Unique email using company_idx
            safe_name = company_name.lower().replace(" ", "")[:10]
            email = f"procurement.{seller_idx}.{i}@{safe_name}{company_idx}.com"
            phone = f"+1-{200 + (company_idx % 800)}-{100 + (company_idx % 900)}-{1000 + (company_idx % 9000)}"
            city = CITY_LIST[company_idx % len(CITY_LIST)]

            cust = await Customer(
                name=f"{company_name} Procurement",
                email=email,
                phone=phone,
                company=company_name,
                customer_tier=tier,
                seller_id=str(seller.id),
                status="ACTIVE",
                address=f"Suite {100 + company_idx % 900}, {company_name} HQ, {city}",
            ).insert()
            customers[short].append(cust)

    print(f"     -> {await Customer.count()} customers")

    # ─── WAREHOUSES (13 per seller × 20 = 260) ───
    print("[8/12] Creating 260 warehouses ...")
    warehouses = {}

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        warehouses[short] = []

        for i in range(13):
            city = CITY_LIST[(seller_idx * 13 + i) % len(CITY_LIST)]
            wtype = WAREHOUSE_TYPES[i % len(WAREHOUSE_TYPES)]
            wh = await Warehouse(
                name=f"{sd['name']} {city} {wtype}",
                location=city,
                seller_id=str(seller.id),
                is_active=True,
            ).insert()
            warehouses[short].append(wh)

    print(f"     -> {await Warehouse.count()} warehouses")

    # ─── INVENTORY (1 per product = 300) ───
    print("[8b] Inventory records ...")
    for sd in SELLER_CONFIGS:
        short = sd["short"]
        seller = sellers[short]
        wh = warehouses[short][0]  # primary warehouse

        for prod in products[short]:
            qty = random.randint(10, max(10, prod.stock_quantity // 3))
            alloc = random.randint(0, min(5, qty))
            await Inventory(
                warehouse=wh,
                product=prod,
                seller_id=str(seller.id),
                quantity_on_hand=qty,
                quantity_allocated=alloc,
            ).insert()

    print(f"     -> {await Inventory.count()} inventory records")

    # ─── DISCOUNT RULES (13 per seller × 20 = 260) ───
    print("[8c] Discount rules ...")
    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        for i in range(13):
            variation = DISCOUNT_TIER_VARIATIONS[i % len(DISCOUNT_TIER_VARIATIONS)]
            await DiscountRule(
                seller_id=str(seller.id),
                tier_ceilings=variation,
                category_ceilings={
                    "Hardware": round(12.0 + (i % 5), 1),
                    "Software Licenses": round(10.0 + (i % 4), 1),
                    "Professional Services": round(8.0 + (i % 3), 1),
                    "Managed Services": round(10.0 + (i % 5), 1),
                },
                routing_matrix=[
                    {"range": f"Tier {i+1}: Within limits", "action": "No approval needed"},
                    {"range": f"Tier {i+1}: Over limit, medium risk", "action": "Sales Manager"},
                    {"range": f"Tier {i+1}: Over limit, high risk", "action": "Sales Manager then Finance"},
                ],
            ).insert()

    print(f"     -> {await DiscountRule.count()} discount rules")

    # ─── PRICE LISTS (13 per seller × 20 = 260) ───
    print("[8d] Price lists ...")
    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        prods = products[short]

        for i, pl_name in enumerate(PRICE_LIST_NAMES):
            factor_num = 75 + (i * 2)
            discount_factor = _d(f"0.{factor_num}")
            pl_items = [
                PriceListItem(product=p, custom_price=p.base_price * discount_factor)
                for p in prods[:min(5, len(prods))]
            ]
            await PriceList(
                name=f"{sd['name']} - {pl_name}",
                currency="USD",
                seller_id=str(seller.id),
                is_active=(i < 10),
                valid_from=_past(90 + i * 5),
                valid_until=_future(275 - i * 5),
                items=pl_items,
            ).insert()

    print(f"     -> {await PriceList.count()} price lists")

    # ─── QUOTATIONS (18 per seller × 20 = 360) ───
    print("[9/12] Creating 360 quotations ...")
    quotations = []
    qt_counter = 1000

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        sid = str(seller.id)
        cust_list = customers[short]
        prod_list = products[short]

        # Sales reps for this seller
        reps = [u for u in employees[short] if u.role == UserRole.SALES_REP.value]
        if not reps:
            reps = employees[short][:3]

        statuses = STATUS_POOL[:]
        random.shuffle(statuses)

        for i, status in enumerate(statuses):
            qt_counter += 1
            cust = cust_list[i % len(cust_list)]
            rep = reps[i % len(reps)]

            chosen = random.sample(prod_list, min(random.randint(1, 5), len(prod_list)))
            items = []
            subtotal = Decimal("0")
            for p in chosen:
                qty = random.randint(1, 15)
                disc = Decimal(str(round(random.uniform(0.0, 0.15), 3)))
                line_total = (p.base_price * qty) * (Decimal("1") - disc)
                subtotal += line_total
                items.append(QuotationItem(
                    product=p,
                    quantity=qty,
                    unit_price=p.base_price,
                    discount=disc,
                    tax=Decimal("0.0"),
                    total_price=line_total,
                ))

            appr_level = None
            if status in ("PENDING_APPROVAL", "APPROVED", "REJECTED", "ALLOCATED"):
                appr_level = random.choice(["SALES_MANAGER", "FINANCE", None])

            q = await Quotation(
                quotation_number=f"QT-{short}-{qt_counter}",
                customer=cust,
                sales_rep=rep,
                seller_id=sid,
                status=status,
                approval_level=appr_level,
                risk_score=round(random.uniform(0.1, 0.9), 2),
                subtotal=subtotal,
                discount_total=Decimal("0.0"),
                tax_total=Decimal("0.0"),
                grand_total=subtotal,
                notes=f"B2B quotation for {cust.name} via {seller.name}.",
                items=items,
            ).insert()
            quotations.append(q)

    print(f"     -> {await Quotation.count()} quotations")

    # ─── APPROVALS + HISTORIES ───
    print("[9b] Approvals and histories ...")
    approvals = []

    # All quotations that need an approval record
    approvable_qs = [
        q for q in quotations
        if q.status in ("PENDING_APPROVAL", "APPROVED", "REJECTED", "ALLOCATED", "CLOSED_WON")
    ]
    # Add IN_REVIEW and PENDING quotations to push approval count higher
    extra_qs = [q for q in quotations if q.status in ("IN_REVIEW", "PENDING", "DRAFT")]
    all_for_approval = approvable_qs + extra_qs  # Use all for max coverage

    for q in all_for_approval:
        short = next((s for s, sel in sellers.items() if str(sel.id) == q.seller_id), None)
        if not short:
            continue

        emps = employees[short]
        mgr = next((u for u in emps if u.role == UserRole.SALES_MANAGER.value), emps[0])
        fin = next((u for u in emps if u.role == UserRole.FINANCE.value), emps[1] if len(emps) > 1 else emps[0])
        rep = next((u for u in emps if u.role == UserRole.SALES_REP.value), emps[2] if len(emps) > 2 else emps[0])

        ap_status = (
            "APPROVED" if q.status in ("APPROVED", "ALLOCATED", "CLOSED_WON")
            else "REJECTED" if q.status == "REJECTED"
            else "PENDING"
        )

        # Level 1 approval (Sales Manager)
        ap1 = await Approval(
            quotation=q,
            requested_by=rep,
            approver=mgr,
            seller_id=q.seller_id,
            level="SALES_MANAGER",
            status=ap_status,
            notes=f"Level-1 review for {q.quotation_number}.",
        ).insert()
        approvals.append(ap1)

        if ap_status != "PENDING":
            await ApprovalHistory(
                approval=ap1,
                action_by=mgr,
                action=ap_status,
                comments="Deal terms and margin analysis reviewed by Sales Manager.",
            ).insert()

        # Level 2 approval (Finance) - for higher value or higher risk
        if q.grand_total > _d("2500") or q.risk_score > 0.45:
            ap2 = await Approval(
                quotation=q,
                requested_by=mgr,
                approver=fin,
                seller_id=q.seller_id,
                level="FINANCE",
                status=ap_status,
                notes=f"Finance escalation for {q.quotation_number}.",
            ).insert()
            approvals.append(ap2)

            if ap_status in ("APPROVED", "REJECTED"):
                comment = (
                    "Financials verified. Margins within policy. Deal approved."
                    if ap_status == "APPROVED"
                    else "Financial terms do not meet policy. Rejected."
                )
                await ApprovalHistory(
                    approval=ap2,
                    action_by=fin,
                    action=ap_status,
                    comments=comment,
                ).insert()

    print(f"     -> {await Approval.count()} approvals, {await ApprovalHistory.count()} histories")

    # ─── ORDERS + INVOICES ───
    print("[10/12] Creating orders and invoices ...")
    orders = []
    order_counter = 5000

    approved_qs = [q for q in quotations if q.status in ("APPROVED", "ALLOCATED", "CLOSED_WON")]

    for q in approved_qs:
        short = next((s for s, sel in sellers.items() if str(sel.id) == q.seller_id), None)
        if not short:
            continue
        order_counter += 1
        ord_status = random.choice(["PROCESSING", "PROCESSING", "COMPLETED", "COMPLETED", "CANCELLED"])

        ord_obj = await Order(
            order_number=f"ORD-{short}-{order_counter}",
            quotation=q,
            customer=q.customer,
            seller_id=q.seller_id,
            status=ord_status,
            total_amount=q.grand_total,
        ).insert()
        orders.append(ord_obj)

        inv_status = (
            "PAID" if ord_status == "COMPLETED"
            else "SENT" if ord_status == "PROCESSING"
            else "DRAFT"
        )
        due = (_past(random.randint(1, 30)) if inv_status == "PAID" else _future(random.randint(15, 45)))
        amt_paid = q.grand_total if inv_status == "PAID" else Decimal("0.00")

        await Invoice(
            invoice_number=f"INV-{short}-{order_counter}",
            order=ord_obj,
            customer=q.customer,
            seller_id=q.seller_id,
            seller_name=sellers[short].name,
            amount_due=q.grand_total,
            amount_paid=amt_paid,
            status=inv_status,
            due_date=due,
        ).insert()

    # Top-up orders and invoices to 250 if needed
    order_count = await Order.count()
    if order_count < 250:
        needed = 250 - order_count
        print(f"     -> Topping up {needed} extra orders+invoices ...")
        for i in range(needed):
            sd = SELLER_CONFIGS[i % len(SELLER_CONFIGS)]
            short = sd["short"]
            cust = customers[short][i % len(customers[short])]
            order_counter += 1
            amount = _d(str(round(random.uniform(800, 15000), 2)))
            extra_ord = await Order(
                order_number=f"ORD-{short}-X{order_counter}",
                customer=cust,
                seller_id=str(sellers[short].id),
                status="COMPLETED",
                total_amount=amount,
            ).insert()
            orders.append(extra_ord)
            await Invoice(
                invoice_number=f"INV-{short}-X{order_counter}",
                order=extra_ord,
                customer=cust,
                seller_id=str(sellers[short].id),
                seller_name=sd["name"],
                amount_due=amount,
                amount_paid=amount,
                status="PAID",
                due_date=_past(random.randint(1, 60)),
            ).insert()

    print(f"     -> {await Order.count()} orders, {await Invoice.count()} invoices")

    # ─── SUBSCRIPTIONS (13 per seller × 20 = 260) ───
    print("[10b] Creating 260 subscriptions ...")
    SUB_STATUSES = ["ACTIVE","ACTIVE","ACTIVE","ACTIVE","ACTIVE","ACTIVE","ACTIVE",
                    "ACTIVE","PAST_DUE","PAST_DUE","CANCELLED","ACTIVE","ACTIVE"]

    for sd in SELLER_CONFIGS:
        short = sd["short"]
        seller = sellers[short]
        cust_list = customers[short]
        prod_list = products[short]

        for i in range(13):
            cust = cust_list[i % len(cust_list)]
            prod = prod_list[i % len(prod_list)]
            cycle = "MONTHLY" if i % 3 != 0 else "ANNUALLY"
            qty = Decimal(str(random.randint(2, 60)))
            price_mult = Decimal("12") if cycle == "ANNUALLY" else Decimal("1")
            recurring_price = prod.base_price * price_mult * qty

            await Subscription(
                customer=cust,
                product=prod,
                seller_id=str(seller.id),
                status=SUB_STATUSES[i],
                billing_cycle=cycle,
                recurring_price=recurring_price,
                next_billing_date=_future(random.randint(1, 35)),
            ).insert()

    print(f"     -> {await Subscription.count()} subscriptions")

    # ─── FULFILLMENT ORDERS ───
    print("[10c] Creating fulfillment orders ...")
    fo_counter = 7000
    FO_STATUSES = ["READY_FOR_DELIVERY", "DISPATCHED", "DELIVERED", "DELIVERED", "DISPATCHED"]

    for ord_obj in orders:
        if ord_obj.status == "CANCELLED":
            continue
        short = next((s for s, sel in sellers.items() if str(sel.id) == ord_obj.seller_id), None)
        if not short:
            continue

        fo_counter += 1
        fo_status = random.choice(FO_STATUSES)
        wh = warehouses[short][fo_counter % len(warehouses[short])]

        cust_doc = ord_obj.customer
        cust_name = getattr(cust_doc, "name", "Unknown Customer")
        cust_addr = getattr(cust_doc, "address", "Unknown Address")

        quot_obj = ord_obj.quotation
        if quot_obj is None:
            quot_id = None
        elif hasattr(quot_obj, "id"):
            quot_id = str(quot_obj.id)
        else:
            quot_id = None

        fo_items = [FulfillmentItem(
            product_name=products[short][0].name,
            quantity=random.randint(1, 8),
            warehouse_name=wh.name,
        )]

        await FulfillmentOrder(
            order_number=f"FO-{short}-{fo_counter}",
            quotation_id=quot_id,
            seller_id=ord_obj.seller_id,
            seller_name=sellers[short].name,
            customer_name=cust_name,
            delivery_address=cust_addr,
            product_name=products[short][0].name,
            quantity_to_deliver=fo_items[0].quantity,
            status=fo_status,
            dispatch_notes=f"Dispatched from {wh.name}.",
            items=fo_items,
        ).insert()

    # Top-up fulfillment orders to 250
    fo_count = await FulfillmentOrder.count()
    if fo_count < 250:
        needed = 250 - fo_count
        print(f"     -> Topping up {needed} extra fulfillment orders ...")
        for i in range(needed):
            sd = SELLER_CONFIGS[i % len(SELLER_CONFIGS)]
            short = sd["short"]
            wh = warehouses[short][i % len(warehouses[short])]
            cust = customers[short][i % len(customers[short])]
            fo_counter += 1
            await FulfillmentOrder(
                order_number=f"FO-{short}-EX{fo_counter}",
                seller_id=str(sellers[short].id),
                seller_name=sd["name"],
                customer_name=cust.name,
                delivery_address=cust.address or "Unknown",
                product_name=products[short][0].name,
                quantity_to_deliver=random.randint(1, 10),
                status=random.choice(FO_STATUSES),
                dispatch_notes=f"Supplementary dispatch from {wh.name}.",
                items=[FulfillmentItem(
                    product_name=products[short][0].name,
                    quantity=random.randint(1, 5),
                    warehouse_name=wh.name,
                )],
            ).insert()

    print(f"     -> {await FulfillmentOrder.count()} fulfillment orders")

    # ─── AUDIT LOGS (10 admin + 15×20 = 310) ───
    print("[11/12] Creating 310+ audit logs ...")
    audit_modules = ["quotations", "approvals", "billing", "inventory", "customers",
                     "products", "subscriptions", "fulfillment", "users"]

    for action in AUDIT_ACTIONS[:10]:
        await AuditLog(
            user_id=str(admin.id),
            user_name=admin.name,
            action=action,
            module="admin",
            resource_type="System",
            resource_id=str(admin.id),
            reason="System admin operation",
            details={"initiated_by": "super_admin"},
        ).insert()

    for seller_idx, sd in enumerate(SELLER_CONFIGS):
        short = sd["short"]
        seller = sellers[short]
        sid = str(seller.id)
        emps = employees[short]
        q_subset = [q for q in quotations if q.seller_id == sid]

        for i in range(15):
            actor = emps[i % len(emps)]
            action = AUDIT_ACTIONS[i % len(AUDIT_ACTIONS)]
            mod = audit_modules[i % len(audit_modules)]
            resource = q_subset[i % len(q_subset)] if q_subset else None

            await AuditLog(
                user_id=str(actor.id),
                user_name=actor.name,
                seller_id=sid,
                action=action,
                module=mod,
                resource_type=mod.rstrip("s").capitalize(),
                resource_id=str(resource.id) if resource else str(actor.id),
                reason=f"{action.replace('_', ' ').title()} for {seller.name}",
                details={"seller": seller.name, "role": actor.role, "seq": i},
            ).insert()

    print(f"     -> {await AuditLog.count()} audit logs")

    # ─── FINAL SUMMARY ───
    print("\n[12/12] Final record counts ...")
    counts = {
        "Users":              await User.count(),
        "Categories":         await Category.count(),
        "Products":           await Product.count(),
        "Customers":          await Customer.count(),
        "Warehouses":         await Warehouse.count(),
        "Inventory":          await Inventory.count(),
        "PriceLists":         await PriceList.count(),
        "DiscountRules":      await DiscountRule.count(),
        "Quotations":         await Quotation.count(),
        "Approvals":          await Approval.count(),
        "ApprovalHistories":  await ApprovalHistory.count(),
        "Orders":             await Order.count(),
        "Invoices":           await Invoice.count(),
        "Subscriptions":      await Subscription.count(),
        "FulfillmentOrders":  await FulfillmentOrder.count(),
        "AuditLogs":          await AuditLog.count(),
    }

    total = sum(counts.values())
    print("\n" + "=" * 65)
    print("SEEDING COMPLETE")
    print("=" * 65)
    below_250 = []
    for model, count in counts.items():
        flag = "  OK" if count >= 250 else "  <-- BELOW 250!"
        print(f"  {model:<22} {count:>5} records{flag}")
        if count < 250:
            below_250.append(model)
    print("-" * 50)
    print(f"  {'TOTAL':<22} {total:>5} records")
    print("=" * 65)

    if not below_250:
        print(f"\n  All {len(counts)} collections have 250+ records!")
    else:
        print(f"\n  Collections still below 250: {below_250}")

    print("\n  Login credentials:")
    print("    Super Admin  ->  admin@dealflow360.com    / Admin@123")
    print("    Sellers      ->  seller@<domain>          / Seller@123")
    print("    Employees    ->  <first.last.##@domain>   / Pass@123")


if __name__ == "__main__":
    asyncio.run(seed_data())
