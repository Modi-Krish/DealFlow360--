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

// Layouts and Pages will be imported here later
const DummyPage = ({ title }: { title: string }) => <div className="p-8 text-2xl text-white">{title}</div>;

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="price-lists" element={<PriceListsPage />} />
          <Route path="billing" element={<BillingDashboard />} />
        </Route>
        
        {/* Sales Routes */}
        <Route path="/sales" element={<SalesLayout />}>
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="quotations" element={<QuotationBuilder />} />
          <Route path="quotations/new" element={<QuotationBuilder />} />
          <Route path="approvals" element={<DummyPage title="Approvals" />} />
          <Route path="fulfillment" element={<DummyPage title="Fulfillment" />} />
        </Route>
        {/* Ops Routes */}
        <Route path="/ops" element={<OpsLayout />}>
          <Route path="dashboard" element={<OpsDashboard />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="fulfillment" element={<FulfillmentPage />} />
        </Route>

        {/* Customer Portal Routes */}
        <Route path="/portal" element={<CustomerLayout />}>
          <Route path=":customerId" element={<CustomerPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
