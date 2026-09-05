import { Outlet, Link } from 'react-router-dom';
import { Briefcase, UserCircle } from 'lucide-react';

export const CustomerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-6">
        <div className="flex items-center">
          <div className="bg-primary p-1.5 rounded-lg mr-3">
            <Briefcase className="h-5 w-5 text-text-main" />
          </div>
          <h1 className="text-xl font-bold text-text-main tracking-tight">DealFlow360 <span className="font-medium text-text-muted">| Customer Portal</span></h1>
        </div>
        <div className="flex items-center">
          <UserCircle className="h-8 w-8 text-text-main mr-2" />
          <span className="text-sm font-medium text-text-main">Client View</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-sm text-text-muted border-t border-border-light">
        &copy; {new Date().getFullYear()} DealFlow360. Powered by modern B2B logic.
      </footer>
    </div>
  );
};
