import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../shared/store/authStore';
import { login, fetchMe } from '../services/authApi';

export const LoginForm = () => {
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
      const response = await login({ email, password });
      if (response.success) {
        // Fetch user info
        localStorage.setItem('access_token', response.data.access_token);
        const meResponse = await fetchMe();
        if (meResponse.success) {
          setAuth(meResponse.data, response.data.access_token);
          if (meResponse.data.role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else {
            navigate('/sales/dashboard');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-danger/20 text-danger border border-danger p-3 rounded text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-primary focus:outline-none transition-colors"
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-primary focus:outline-none transition-colors"
          required 
        />
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full btn-primary py-3"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};
