import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { login, signup, fetchMe } from '../services/authApi';
import { PERSONAS, type Persona } from '../../../shared/components/PersonaSwitcher';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoadingId, setQuickLoadingId] = useState<string | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const routeByRole = (role: string, targetRoute?: string) => {
    if (targetRoute) {
      navigate(targetRoute);
      return;
    }
    const r = (role || '').toLowerCase();
    if (r === 'super_admin' || r === 'admin') {
      navigate('/admin/dashboard');
    } else if (r === 'seller') {
      navigate('/admin/dashboard');
    } else if (r === 'sales_manager') {
      navigate('/sales/approvals');
    } else if (r === 'sales_rep') {
      navigate('/sales/quotations');
    } else if (r === 'finance' || r === 'operations') {
      navigate('/ops/dashboard');
    } else {
      navigate('/marketplace');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // Public registration strictly registers as customer
        const signupRes = await signup({ name, email, password });
        if (!signupRes.success) throw new Error(signupRes.message);
      }

      const response = await login({ email, password });
      if (response.success && response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        const meResponse = await fetchMe();
        if (meResponse.success) {
          const user = meResponse.data;
          setAuth(user, response.data.access_token);
          routeByRole(user.role);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (persona: Persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    setError('');
    setQuickLoadingId(persona.id);

    try {
      const response = await login({ email: persona.email, password: persona.password });
      if (response.success && response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        const meResponse = await fetchMe();
        if (meResponse.success) {
          const user = meResponse.data;
          setAuth(user, response.data.access_token);
          routeByRole(user.role, persona.targetRoute);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Quick login failed. Please verify credentials.');
    } finally {
      setQuickLoadingId(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Company / Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp Procurement"
              className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
              required={!isLogin}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
            required
          />
        </div>

        {!isLogin && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              Public registration creates a verified B2B Customer Buyer account. Seller and internal organization accounts are provisioned via administrative invite.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!quickLoadingId}
          className="w-full btn-primary py-2.5 mt-2 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>{isLogin ? 'Sign In' : 'Create Customer Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <span className="text-text-muted">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="font-medium text-primary hover:underline cursor-pointer"
        >
          {isLogin ? 'Register as Customer Buyer' : 'Sign in to existing account'}
        </button>
      </div>

      {/* Quick Login RBAC Section */}
      {isLogin && (
        <div className="mt-6 pt-5 border-t border-border-light">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                RBAC Role Switcher
              </span>
              <span className="text-xs font-semibold text-text-main">
                Quick Login
              </span>
            </div>
            <span className="text-[11px] text-text-muted hidden sm:inline">
              1-click instant demo access
            </span>
          </div>

          <p className="text-xs text-text-muted mb-3">
            Select a role to auto-fill & login to test tenant isolation and permissions:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isPending = quickLoadingId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading || !!quickLoadingId}
                  onClick={() => handleQuickLogin(p)}
                  className="flex flex-col items-start p-2.5 rounded-lg text-left bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-xs group disabled:opacity-50"
                  title={`Login as ${p.roleTitle} (${p.email})`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={`w-4 h-4 ${p.color}`} />
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-300">
                        ({p.sub})
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold truncate w-full text-slate-100">
                    {p.roleTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate w-full">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
