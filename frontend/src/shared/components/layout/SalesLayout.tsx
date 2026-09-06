import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { LayoutDashboard, FileText, CheckCircle, LogOut, TrendingUp, Store, Users, BarChart3, Building, Activity, Package, RotateCcw } from 'lucide-react';

export const SalesLayout = () => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const role = (user?.role || '').toLowerCase();

  const candidateItems = [
    { name: 'Dashboard', path: '/sales/dashboard', icon: LayoutDashboard },
    { name: 'Quotations', path: '/sales/quotations', icon: FileText, perm: 'quotations.view' },
    { name: 'Deal Health', path: '/sales/deal-health', icon: Activity, perm: 'quotations.view' },
    { name: 'Deals & Pipeline', path: '/seller/bids', icon: Store },
    { name: 'Approvals Queue', path: '/sales/approvals', icon: CheckCircle, perm: 'approval.view' },
    { name: 'Fulfillment Ops', path: '/sales/fulfillment', icon: Package, perm: 'fulfillment.view' },
    { name: 'Customers', path: '/sales/customers', icon: Users, perm: 'customers.view' },
    { name: 'Employees & Roles', path: '/sales/employees', icon: Building, perm: 'users.view' },
    { name: 'Reports & Analytics', path: '/sales/reports', icon: BarChart3, perm: 'reports.view' },
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
              {role === 'sales_manager' ? 'Sales Manager Workspace' : (role === 'seller' ? 'Seller Workspace' : 'Sales Representative')}
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
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
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
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-semibold text-text-main truncate">{user?.name || 'Sales User'}</p>
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
        {/* Top Workspace Utility Bar */}
        <header className="h-14 bg-white border-b border-border-light px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Sales Operations Workspace Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-main bg-slate-100 hover:bg-slate-200 rounded-lg border border-border-light transition-all shadow-2xs"
              title="Reload data and synchronization state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              Reload Data
            </button>

            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-main bg-slate-100 hover:bg-slate-200 rounded-lg border border-border-light transition-all shadow-2xs"
              title="Go to Back-end operations and reporting dashboard"
            >
              <Building className="w-3.5 h-3.5 text-primary" />
              Go to Back-end
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all shadow-2xs"
              title="Close Workspace session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              Close Workspace
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
