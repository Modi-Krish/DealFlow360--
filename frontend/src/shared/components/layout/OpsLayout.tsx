import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { LayoutDashboard, Package, Truck, LogOut } from 'lucide-react';

export const OpsLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/ops/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', path: '/ops/inventory', icon: Package },
    { name: 'Fulfillment', path: '/ops/fulfillment', icon: Truck },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-slate-700 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white tracking-wide">DealFlow360</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operations</p>
          </div>
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">
              {user?.name?.charAt(0) || 'O'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.name || 'Ops Manager'}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-slate-300 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
