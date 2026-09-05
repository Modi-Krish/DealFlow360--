import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { login, signup, fetchMe } from '../services/authApi';

export const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SALES_REP');
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
        const signupRes = await signup({ name, email, password, role });
        if (!signupRes.success) throw new Error(signupRes.message);
      }

      const response = await login({ email, password });
      if (response.success) {
        // Fetch user info
        localStorage.setItem('access_token', response.data.access_token);
        const meResponse = await fetchMe();
        if (meResponse.success) {
          setAuth(meResponse.data, response.data.access_token);
          if (meResponse.data.role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else if (meResponse.data.role === 'FINANCE_OPS') {
            navigate('/ops/dashboard');
          } else {
            navigate('/sales/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
              required={!isLogin} 
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-main mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-main mb-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
            required 
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white border border-border-light rounded-lg p-2.5 text-text-main focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors shadow-sm"
            >
              <option value="SALES_REP">Sales Rep</option>
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="FINANCE_OPS">Operations</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full btn-primary py-2.5 mt-2"
        >
          {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
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
          className="font-medium text-primary hover:text-emerald-700"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
};
