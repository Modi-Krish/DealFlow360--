import { Outlet, Link, useLocation } from 'react-router-dom';
import { Briefcase, UserCircle, ShoppingBag } from 'lucide-react';
import { PersonaSwitcher } from '../PersonaSwitcher';

export const CustomerLayout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Persona Bar */}
      <PersonaSwitcher />

      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-6 sticky top-8 z-20 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <div className="bg-primary p-1.5 rounded-lg mr-3">
              <Briefcase className="h-5 w-5 text-text-main" />
            </div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">DealFlow360 <span className="font-medium text-text-muted">| Customer Portal</span></h1>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                location.pathname === '/marketplace'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Marketplace & Bids</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center">
          <UserCircle className="h-8 w-8 text-text-main mr-2" />
          <span className="text-sm font-medium text-text-main">Client Buyer View</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-sm text-text-muted border-t border-border-light">
        &copy; {new Date().getFullYear()} DealFlow360. Powered by modern B2B logic.
      </footer>
    </div>
  );
};
