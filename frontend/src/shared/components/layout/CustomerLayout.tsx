import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Briefcase, LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const CustomerLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isInternalUser = user && (user.role || '').toLowerCase() !== 'customer';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-6 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <div className="bg-primary p-1.5 rounded-lg mr-3 shadow-xs">
              <Briefcase className="h-5 w-5 text-text-main" />
            </div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">
              DealFlow360 <span className="font-medium text-text-muted">| Customer Portal</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isInternalUser && (
            <Link
              to="/admin/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-primary bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Seller/Admin View</span>
            </Link>
          )}

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-300">
              {(user?.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-text-main leading-tight truncate max-w-[160px]">
                {user?.company_name || user?.name || 'Client Buyer View'}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Verified B2B Account
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-xs text-text-muted border-t border-border-light bg-white">
        &copy; {new Date().getFullYear()} DealFlow360 B2B Autonomous Sales Operations Platform.
      </footer>
    </div>
  );
};
