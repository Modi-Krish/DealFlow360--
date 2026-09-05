import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { login, signup, fetchMe } from '../services/authApi';
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

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
      if (response.success) {
        localStorage.setItem('access_token', response.data.access_token);
        const meResponse = await fetchMe();
        if (meResponse.success) {
          const user = meResponse.data;
          setAuth(user, response.data.access_token);

          // Route to appropriate initial dashboard
          const r = (user.role || '').toLowerCase();
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
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
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
          disabled={loading}
          className="w-full btn-primary py-2.5 mt-2 flex items-center justify-center gap-2 font-semibold text-sm"
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
      
      <div className="mt-6 text-center text-sm">
        <span className="text-text-muted">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
        </span>
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="font-medium text-primary hover:underline"
        >
          {isLogin ? 'Register as Customer Buyer' : 'Sign in to existing account'}
        </button>
      </div>
    </div>
  );
};
