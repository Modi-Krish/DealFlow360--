import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { PersonaSwitcher } from '../PersonaSwitcher';
import { LayoutDashboard, Truck, PackageCheck, CreditCard, CheckCircle, BarChart3, LogOut, TrendingUp } from 'lucide-react';

export const OpsLayout = () => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const role = (user?.role || '').toLowerCase();
  const isFinance = role === 'finance';

  const candidateItems = isFinance ? [
    { name: 'Financial Dashboard', path: '/ops/dashboard', icon: LayoutDashboard },
    { name: 'Approvals Queue', path: '/sales/approvals', icon: CheckCircle, perm: 'approval.view' },
    { name: 'Billing & Invoices', path: '/admin/billing', icon: CreditCard, perm: 'billing.view' },
    { name: 'Financial Reports', path: '/admin/dashboard', icon: BarChart3, perm: 'reports.view' },
  ] : [
    { name: 'Ops Dashboard', path: '/ops/dashboard', icon: LayoutDashboard },
    { name: 'Warehouse Dispatch', path: '/ops/warehouse', icon: Truck, perm: 'warehouses.view' },
    { name: 'Fulfillment Orders', path: '/ops/fulfillment', icon: PackageCheck, perm: 'fulfillment.view' },
    { name: 'Inventory & Stock', path: '/ops/inventory', icon: PackageCheck },
  ];

  const navItems = candidateItems.filter(item => !item.perm || hasPermission(item.perm));

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-border-light flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border-light">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-text-main" />
            </div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">DealFlow360</h1>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-6 mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {isFinance ? 'Finance Workspace' : 'Operations & Logistics'}
            </p>
          </div>
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-light text-primary' 
                      : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border-light">
          <div className="flex items-center mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 uppercase">
              {user?.name?.charAt(0) || 'O'}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-semibold text-text-main truncate">{user?.name || 'Operations'}</p>
              <p className="text-xs text-text-muted uppercase font-mono">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-text-muted rounded-lg hover:bg-slate-50 hover:text-danger transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-text-muted group-hover:text-danger" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PersonaSwitcher />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
