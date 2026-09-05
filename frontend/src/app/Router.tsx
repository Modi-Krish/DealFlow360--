import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { AdminLayout } from '../shared/components/layout/AdminLayout';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';
import { ProductsPage } from '../features/admin/pages/ProductsPage';
import { CustomersPage } from '../features/admin/pages/CustomersPage';
import { PriceListsPage } from '../features/admin/pages/PriceListsPage';
import { SalesLayout } from '../shared/components/layout/SalesLayout';
import { SalesDashboard } from '../features/sales/pages/SalesDashboard';
import { QuotationBuilder } from '../features/sales/pages/QuotationBuilder';
import { OpsLayout } from '../shared/components/layout/OpsLayout';
import { OpsDashboard } from '../features/ops/pages/OpsDashboard';
import { InventoryPage } from '../features/ops/pages/InventoryPage';
import { FulfillmentPage } from '../features/ops/pages/FulfillmentPage';
import { BillingDashboard } from '../features/billing/pages/BillingDashboard';
import { CustomerLayout } from '../shared/components/layout/CustomerLayout';
import { CustomerPortal } from '../features/portal/pages/CustomerPortal';

// Multi-Seller Marketplace, Negotiations, and Warehouse Delivery modules
import { MarketplacePage } from '../features/bids/pages/MarketplacePage';
import { SellerBidsPage } from '../features/bids/pages/SellerBidsPage';
import { WarehouseDispatchPage } from '../features/ops/pages/WarehouseDispatchPage';

const DummyPage = ({ title }: { title: string }) => (
  <div className="p-8 text-2xl text-text-main">{title}</div>
);

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

        {/* Dedicated Seller Portal Routes */}
        <Route path="/seller" element={<SalesLayout />}>
          <Route path="bids" element={<SellerBidsPage />} />
          <Route index element={<Navigate to="/seller/bids" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="bids" element={<SellerBidsPage />} />
          <Route path="warehouse" element={<WarehouseDispatchPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="price-lists" element={<PriceListsPage />} />
          <Route path="billing" element={<BillingDashboard />} />
        </Route>

        {/* Sales Routes */}
        <Route path="/sales" element={<SalesLayout />}>
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="bids" element={<SellerBidsPage />} />
          <Route path="quotations" element={<QuotationBuilder />} />
          <Route path="quotations/new" element={<QuotationBuilder />} />
          <Route path="approvals" element={<DummyPage title="Approvals" />} />
          <Route path="fulfillment" element={<DummyPage title="Fulfillment" />} />
        </Route>

        {/* Ops & Warehouse Routes */}
        <Route path="/ops" element={<OpsLayout />}>
          <Route path="dashboard" element={<OpsDashboard />} />
          <Route path="warehouse" element={<WarehouseDispatchPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="fulfillment" element={<FulfillmentPage />} />
        </Route>

        {/* Customer Portal Specific Route */}
        <Route path="/portal" element={<CustomerLayout />}>
          <Route path=":customerId" element={<CustomerPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
