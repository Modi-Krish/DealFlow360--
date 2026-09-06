from typing import List, Dict, Set, Optional
from enum import Enum

class Permission(str, Enum):
    # Users
    USERS_VIEW = "users.view"
    USERS_CREATE = "users.create"
    USERS_UPDATE = "users.update"
    USERS_DELETE = "users.delete"
    
    # Sellers
    SELLERS_VIEW = "sellers.view"
    SELLERS_CREATE = "sellers.create"
    SELLERS_UPDATE = "sellers.update"
    SELLERS_DELETE = "sellers.delete"
    
    # Products
    PRODUCTS_VIEW = "products.view"
    PRODUCTS_CREATE = "products.create"
    PRODUCTS_UPDATE = "products.update"
    PRODUCTS_DELETE = "products.delete"
    
    # Price lists
    PRICE_LISTS_VIEW = "price_lists.view"
    PRICE_LISTS_CREATE = "price_lists.create"
    PRICE_LISTS_UPDATE = "price_lists.update"
    PRICE_LISTS_DELETE = "price_lists.delete"
    
    # Discounts
    DISCOUNTS_VIEW = "discounts.view"
    DISCOUNTS_CREATE = "discounts.create"
    DISCOUNTS_UPDATE = "discounts.update"
    DISCOUNTS_DELETE = "discounts.delete"
    DISCOUNTS_APPROVE = "discounts.approve"
    
    # Approval
    APPROVAL_VIEW = "approval.view"
    APPROVAL_APPROVE = "approval.approve"
    APPROVAL_REJECT = "approval.reject"
    APPROVAL_RETURN = "approval.return"
    
    # Quotations
    QUOTATIONS_VIEW = "quotations.view"
    QUOTATIONS_CREATE = "quotations.create"
    QUOTATIONS_UPDATE = "quotations.update"
    QUOTATIONS_DELETE = "quotations.delete"
    QUOTATIONS_SUBMIT = "quotations.submit"
    QUOTATIONS_NEGOTIATE = "quotations.negotiate"
    QUOTATIONS_CONFIRM = "quotations.confirm"
    
    # Customers
    CUSTOMERS_VIEW = "customers.view"
    CUSTOMERS_CREATE = "customers.create"
    CUSTOMERS_UPDATE = "customers.update"
    
    # Warehouses
    WAREHOUSES_VIEW = "warehouses.view"
    WAREHOUSES_CREATE = "warehouses.create"
    WAREHOUSES_UPDATE = "warehouses.update"
    WAREHOUSES_DELETE = "warehouses.delete"
    WAREHOUSE_VIEW = "warehouse.view"
    WAREHOUSE_CREATE = "warehouse.create"
    WAREHOUSE_UPDATE = "warehouse.update"
    WAREHOUSE_DELETE = "warehouse.delete"
    
    # Inventory
    INVENTORY_VIEW = "inventory.view"
    INVENTORY_CREATE = "inventory.create"
    INVENTORY_UPDATE = "inventory.update"
    INVENTORY_DELETE = "inventory.delete"
    INVENTORY_MANAGE = "inventory.manage"
    INVENTORIES_VIEW = "inventories.view"
    
    # Fulfillment
    FULFILLMENT_VIEW = "fulfillment.view"
    FULFILLMENT_SPLIT = "fulfillment.split"
    FULFILLMENT_OVERRIDE = "fulfillment.override"
    FULFILLMENT_BACKORDER = "fulfillment.backorder"
    FULFILLMENT_CONSOLIDATE = "fulfillment.consolidate"
    
    # Subscriptions
    SUBSCRIPTIONS_VIEW = "subscriptions.view"
    SUBSCRIPTIONS_CREATE = "subscriptions.create"
    SUBSCRIPTIONS_UPDATE = "subscriptions.update"
    SUBSCRIPTIONS_CANCEL = "subscriptions.cancel"
    
    # Billing
    BILLING_VIEW = "billing.view"
    BILLING_CREATE = "billing.create"
    BILLING_UPDATE = "billing.update"
    BILLING_RECONCILE = "billing.reconcile"
    
    # Credit Notes
    CREDIT_NOTES_VIEW = "credit_notes.view"
    CREDIT_NOTES_CREATE = "credit_notes.create"
    CREDIT_NOTES_APPROVE = "credit_notes.approve"
    
    # Reports
    REPORTS_VIEW = "reports.view"
    REPORTS_EXPORT = "reports.export"
    
    # Dashboard
    DASHBOARD_VIEW = "dashboard.view"
    DASHBOARD_DEAL_HEALTH = "dashboard.deal_health"
    
    # Upsell
    UPSELL_VIEW = "upsell.view"
    UPSELL_CREATE = "upsell.create"
    UPSELL_UPDATE = "upsell.update"
    UPSELL_DELETE = "upsell.delete"
    
    # Pricing
    PRICING_VIEW = "pricing.view"
    PRICING_MANAGE = "pricing.manage"
    
    # Audit Logs
    AUDIT_LOGS_VIEW = "audit_logs.view"
    
    # Settings
    SETTINGS_VIEW = "settings.view"
    SETTINGS_UPDATE = "settings.update"

PERMISSION_ALIASES: Dict[str, List[str]] = {
    # Singular <-> Plural warehouse mapping
    "warehouse.view": ["warehouses.view", "inventory.view", "inventories.view"],
    "warehouses.view": ["warehouse.view", "inventory.view", "inventories.view"],
    "warehouse.create": ["warehouses.create"],
    "warehouses.create": ["warehouse.create"],
    "warehouse.update": ["warehouses.update"],
    "warehouses.update": ["warehouse.update"],
    "warehouse.delete": ["warehouses.delete"],
    "warehouses.delete": ["warehouse.delete"],

    # Inventory mapping
    "inventory.view": ["inventories.view", "warehouse.view", "warehouses.view"],
    "inventories.view": ["inventory.view", "warehouse.view", "warehouses.view"],
    "inventory.manage": ["inventory.create", "inventory.update", "warehouse.update"],

    # Pricing mapping
    "pricing.view": ["price_lists.view", "discounts.view"],
    "price_lists.view": ["pricing.view"],
    "discounts.view": ["pricing.view"],
}

# Role Default Permissions mapping
ROLE_DEFAULT_PERMISSIONS: Dict[str, List[str]] = {
    "super_admin": [
        "*"  # Super admin has all permissions platform-wide
    ],
    "seller": [
        # Employees & Users within seller organization
        "users.view", "users.create", "users.update", "users.delete",
        # Products
        "products.view", "products.create", "products.update", "products.delete",
        # Price Lists & Pricing
        "price_lists.view", "price_lists.create", "price_lists.update", "price_lists.delete",
        "pricing.view", "pricing.manage",
        # Discounts
        "discounts.view", "discounts.create", "discounts.update", "discounts.delete", "discounts.approve",
        # Approvals
        "approval.view", "approval.approve", "approval.reject", "approval.return",
        # Quotations
        "quotations.view", "quotations.create", "quotations.update", "quotations.delete", "quotations.submit", "quotations.negotiate", "quotations.confirm",
        # Customers
        "customers.view", "customers.create", "customers.update",
        # Warehouses, Inventory & Fulfillment
        "warehouses.view", "warehouses.create", "warehouses.update", "warehouses.delete",
        "warehouse.view", "warehouse.create", "warehouse.update", "warehouse.delete",
        "inventory.view", "inventory.create", "inventory.update", "inventory.manage", "inventories.view",
        "fulfillment.view", "fulfillment.split", "fulfillment.override", "fulfillment.backorder", "fulfillment.consolidate",
        # Subscriptions & Billing
        "subscriptions.view", "subscriptions.create", "subscriptions.update", "subscriptions.cancel",
        "billing.view", "billing.create", "billing.update", "billing.reconcile",
        "credit_notes.view", "credit_notes.create", "credit_notes.approve",
        # Reports, Upsell, Settings & Audit Logs
        "reports.view", "reports.export",
        "dashboard.view", "dashboard.deal_health",
        "upsell.view", "upsell.create", "upsell.update", "upsell.delete",
        "audit_logs.view",
        "settings.view", "settings.update"
    ],
    "sales_manager": [
        "quotations.view", "quotations.create", "quotations.update", "quotations.submit", "quotations.negotiate",
        "approval.view", "approval.approve", "approval.reject", "approval.return",
        "discounts.view", "discounts.approve",
        "products.view",
        "price_lists.view", "pricing.view",
        "customers.view", "customers.create", "customers.update",
        "dashboard.view", "dashboard.deal_health",
        "reports.view", "reports.export",
        "upsell.view"
    ],
    "sales_rep": [
        "quotations.view", "quotations.create", "quotations.update", "quotations.submit", "quotations.negotiate",
        "products.view",
        "price_lists.view", "pricing.view",
        "customers.view", "customers.create",
        "dashboard.view", "dashboard.deal_health",
        "upsell.view"
    ],
    "finance": [
        "approval.view", "approval.approve", "approval.reject", "approval.return",
        "discounts.view", "discounts.approve",
        "quotations.view",
        "billing.view", "billing.create", "billing.update", "billing.reconcile",
        "credit_notes.view", "credit_notes.create", "credit_notes.approve",
        "subscriptions.view",
        "reports.view", "reports.export",
        "dashboard.view"
    ],
    "operations": [
        "warehouses.view", "warehouses.create", "warehouses.update",
        "warehouse.view", "warehouse.create", "warehouse.update",
        "inventory.view", "inventory.create", "inventory.update", "inventory.manage", "inventories.view",
        "fulfillment.view", "fulfillment.split", "fulfillment.override", "fulfillment.backorder", "fulfillment.consolidate",
        "products.view",
        "quotations.view",
        "dashboard.view",
        "audit_logs.view"
    ],
    "customer": [
        "quotations.view", "quotations.negotiate", "quotations.confirm",
        "subscriptions.view",
        "billing.view",
        "dashboard.view"
    ]
}

def normalize_role(role: str) -> str:
    """Normalize role string to canonical lowercase role format."""
    if not role:
        return "customer"
    r = role.strip().lower()
    mapping = {
        "admin": "super_admin",
        "superadmin": "super_admin",
        "super_admin": "super_admin",
        "seller": "seller",
        "seller_employee": "sales_rep",
        "sales_manager": "sales_manager",
        "salesmanager": "sales_manager",
        "sales_rep": "sales_rep",
        "salesrep": "sales_rep",
        "finance": "finance",
        "finance_ops": "finance",
        "operations": "operations",
        "warehouse_ops": "operations",
        "ops": "operations",
        "customer": "customer",
    }
    return mapping.get(r, r)

def get_effective_permissions(role: str, user_permissions: Optional[List[str]] = None) -> Set[str]:
    """Calculate effective permissions for a given role and permission overrides."""
    normalized_role = normalize_role(role)
    defaults = set(ROLE_DEFAULT_PERMISSIONS.get(normalized_role, []))
    if user_permissions:
        defaults.update(user_permissions)
    
    # Automatically expand aliases so callers receive both canonical and aliased forms
    expanded = set(defaults)
    for perm in list(defaults):
        if perm in PERMISSION_ALIASES:
            expanded.update(PERMISSION_ALIASES[perm])
    return expanded

def user_has_permission(role: str, user_permissions: Optional[List[str]], required_permission: str) -> bool:
    """Check if the given role + permissions satisfy the required permission."""
    norm_role = normalize_role(role)
    if norm_role == "super_admin":
        return True
    
    # Fast path for operations role operational features
    if norm_role == "operations" and required_permission in [
        "warehouse.view", "warehouses.view", "warehouse.update",
        "inventory.view", "inventories.view", "inventory.manage",
        "fulfillment.view", "dashboard.view", "audit_logs.view"
    ]:
        return True

    effective = get_effective_permissions(norm_role, user_permissions)
    if "*" in effective or required_permission in effective:
        return True

    # Check aliases
    aliases = PERMISSION_ALIASES.get(required_permission, [])
    for alias in aliases:
        if alias in effective:
            return True

    # Module-level wildcard match (e.g. 'quotations.*')
    module = required_permission.split(".")[0]
    if f"{module}.*" in effective:
        return True
    return False
