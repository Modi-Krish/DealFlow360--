import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission
}) => {
  const { user, token, hasRole, hasPermission } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If user is loaded, check permissions
  if (user) {
    let allowed = true;

    if (requiredRole && !hasRole(requiredRole)) {
      allowed = false;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      allowed = false;
    }

    if (!allowed) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-2">403 - Access Forbidden</h2>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Your account role (<span className="font-semibold text-slate-800">{user.role}</span>) does not have sufficient permissions to access this module.
              {requiredPermission && (
                <span className="block mt-2 font-mono text-xs bg-slate-100 text-slate-700 py-1 px-2 rounded">
                  Required: {requiredPermission}
                </span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={user.role === 'customer' ? '/marketplace' : (user.role === 'super_admin' ? '/admin/dashboard' : '/sales/dashboard')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
