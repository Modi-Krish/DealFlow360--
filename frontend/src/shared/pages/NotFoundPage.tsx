import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, FileQuestion } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const getHomeRoute = () => {
    if (!user) return '/login';
    const role = (user.role || '').toLowerCase();
    if (role === 'customer') return '/marketplace';
    if (role === 'super_admin') return '/admin/dashboard';
    if (role === 'operations') return '/ops/dashboard';
    return '/sales/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <FileQuestion className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 inline-block mb-3">
          Error 404 • Page Not Found
        </span>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          Lost in Deal Space?
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          The requested sales operations route does not exist or has been moved to another workflow. Check the URL or return to your active workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-all hover:border-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <Link
            to={getHomeRoute()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Home className="w-4 h-4" />
            Go to Workspace
          </Link>
        </div>
      </div>

      <p className="relative z-10 text-xs text-slate-600 mt-8">
        DealFlow360 Autonomous Sales Operations Platform
      </p>
    </div>
  );
};
