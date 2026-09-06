import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';

// Layouts
import { AdminLayout } from '../shared/components/layout/AdminLayout';
import { SalesLayout } from '../shared/components/layout/SalesLayout';
import { OpsLayout } from '../shared/components/layout/OpsLayout';
import { CustomerLayout } from '../shared/components/layout/CustomerLayout';

// Admin / Super Admin Pages
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';
import { ProductsPage } from '../features/admin/pages/ProductsPage';
import { CustomersPage } from '../features/admin/pages/CustomersPage';
import { PriceListsPage } from '../features/admin/pages/PriceListsPage';
import { EmployeeManagementPage } from '../features/admin/pages/EmployeeManagementPage';
import { SellersManagementPage } from '../features/admin/pages/SellersManagementPage';
import { UserManagementPage } from '../features/admin/pages/UserManagementPage';
import { AuditLogsPage } from '../features/admin/pages/AuditLogsPage';
import { WarehousesPage } from '../features/admin/pages/WarehousesPage';
import { RecommendationsPage } from '../features/admin/pages/RecommendationsPage';

// Sales Pages
import { SalesDashboard } from '../features/sales/pages/SalesDashboard';
import { QuotationBuilder } from '../features/sales/pages/QuotationBuilder';
import { ApprovalsPage } from '../features/sales/pages/ApprovalsPage';
import { DealHealthPage } from '../features/sales/pages/DealHealthPage';
import { DiscountRulesPage } from '../features/admin/pages/DiscountRulesPage';

// Ops & Warehouse Pages
import { OpsDashboard } from '../features/ops/pages/OpsDashboard';
import { InventoryPage } from '../features/ops/pages/InventoryPage';
import { FulfillmentPage } from '../features/ops/pages/FulfillmentPage';
import { WarehouseDispatchPage } from '../features/ops/pages/WarehouseDispatchPage';

// Billing
import { BillingDashboard } from '../features/billing/pages/BillingDashboard';

// Customer & Marketplace Pages
import { CustomerPortal } from '../features/portal/pages/CustomerPortal';
import { MarketplacePage } from '../features/bids/pages/MarketplacePage';
import { SellerBidsPage } from '../features/bids/pages/SellerBidsPage';

// Utility Pages
import { NotFoundPage } from '../shared/pages/NotFoundPage';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Customer Portal & Marketplace Routes */}
        <Route path="/marketplace" element={<CustomerLayout />}>
          <Route index element={<MarketplacePage />} />
        </Route>

        <Route path="/portal" element={<CustomerLayout />}>
          <Route index element={<CustomerPortal />} />
          <Route path=":customerId" element={<CustomerPortal />} />
        </Route>

        {/* Dedicated Seller Portal Routes */}
        <Route path="/seller" element={<SalesLayout />}>
          <Route index element={<Navigate to="/seller/bids" replace />} />
          <Route path="bids" element={<SellerBidsPage />} />
          <Route
            path="employees"
            element={
              <ProtectedRoute requiredRole={['seller', 'super_admin']}>
                <EmployeeManagementPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin & Super Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole={['super_admin', 'seller']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route
            path="sellers"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <SellersManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees"
            element={
              <ProtectedRoute requiredRole={['seller', 'super_admin']}>
                <EmployeeManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <ProtectedRoute requiredPermission="audit_logs.view">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="products"
            element={
              <ProtectedRoute requiredPermission="products.view">
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers"
            element={
              <ProtectedRoute requiredPermission="customers.view">
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="price-lists"
            element={
              <ProtectedRoute requiredPermission="pricing.view">
                <PriceListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="discount-rules"
            element={
              <ProtectedRoute requiredPermission="pricing.view">
                <DiscountRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="warehouses"
            element={
              <ProtectedRoute requiredRole={['super_admin', 'seller']}>
                <WarehousesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="recommendations"
            element={
              <ProtectedRoute requiredRole={['super_admin', 'seller']}>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="billing"
            element={
              <ProtectedRoute requiredPermission="billing.view">
                <BillingDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="warehouse"
            element={
              <ProtectedRoute requiredPermission="warehouse.view">
                <WarehouseDispatchPage />
              </ProtectedRoute>
            }
          />
          <Route path="bids" element={<SellerBidsPage />} />
        </Route>

        {/* Sales Routes */}
        <Route path="/sales" element={<SalesLayout />}>
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="bids" element={<SellerBidsPage />} />
          <Route
            path="quotations"
            element={
              <ProtectedRoute requiredPermission="quotations.view">
                <QuotationBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="quotations/new"
            element={
              <ProtectedRoute requiredPermission="quotations.create">
                <QuotationBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="approvals"
            element={
              <ProtectedRoute requiredPermission="approval.view">
                <ApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="deal-health"
            element={
              <ProtectedRoute requiredPermission="quotations.view">
                <DealHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="fulfillment"
            element={
              <ProtectedRoute requiredPermission="fulfillment.view">
                <FulfillmentPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Ops & Warehouse Routes */}
        <Route path="/ops" element={<OpsLayout />}>
          <Route path="dashboard" element={<OpsDashboard />} />
          <Route
            path="warehouse"
            element={
              <ProtectedRoute requiredPermission="warehouse.view">
                <WarehouseDispatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute requiredPermission="inventory.view">
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="fulfillment"
            element={
              <ProtectedRoute requiredPermission="fulfillment.view">
                <FulfillmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <ProtectedRoute requiredPermission="audit_logs.view">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Real 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
