import { Outlet, Link } from 'react-router-dom';
import { Briefcase, UserCircle } from 'lucide-react';

export const CustomerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-16 bg-surface border-b border-slate-700 flex items-center justify-between px-6">
        <div className="flex items-center">
          <Briefcase className="h-6 w-6 text-primary mr-3" />
          <h1 className="text-xl font-bold text-white tracking-wide">DealFlow360 <span className="font-light text-slate-400">| Customer Portal</span></h1>
        </div>
        <div className="flex items-center">
          <UserCircle className="h-8 w-8 text-slate-400 mr-2" />
          <span className="text-sm font-medium text-slate-200">Client View</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-800">
        &copy; {new Date().getFullYear()} DealFlow360. Powered by modern B2B logic.
      </footer>
    </div>
  );
};
