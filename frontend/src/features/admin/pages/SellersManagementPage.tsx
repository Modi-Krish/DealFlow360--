import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser } from '../services/adminRbacApi';
import { Store, Plus, Check, UserX, Loader2, AlertCircle, Building2, Mail } from 'lucide-react';

export const SellersManagementPage: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadSellers = async () => {
    setLoading(true);
    try {
      const res = await listUsers({ role: 'seller' });
      if (res.success) {
        setSellers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load sellers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await createUser({
        name,
        company_name: companyName,
        email,
        password,
        role: 'seller'
      });
      if (res.success) {
        setShowModal(false);
        setName('');
        setCompanyName('');
        setEmail('');
        setPassword('');
        loadSellers();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to onboard seller');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (seller: any) => {
    const newStatus = seller.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      if (newStatus === 'INACTIVE') {
        await deleteUser(seller.id);
      } else {
        await updateUser(seller.id, { status: 'ACTIVE' });
      }
      loadSellers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Platform Sellers & Tenant Organizations
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Super Admin platform management for onboarding independent seller organizations and managing tenant isolation.
          </p>
        </div>
        <button
          onClick={() => {
            setName('');
            setCompanyName('');
            setEmail('');
            setPassword('');
            setError('');
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Onboard Seller
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sellers.map((s) => (
            <div key={s.id} className="bg-white border border-border-light rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg border border-blue-100">
                    {s.company_name?.charAt(0) || s.name.charAt(0)}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <h3 className="font-bold text-text-main text-lg">{s.company_name || s.name}</h3>
                <p className="text-xs text-text-muted mb-4">Seller ID: <span className="font-mono text-slate-700">{s.seller_id || s.id}</span></p>

                <div className="space-y-1.5 text-xs text-text-muted border-t border-border-light pt-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact: {s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-light flex justify-end gap-2">
                <button
                  onClick={() => handleToggleStatus(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    s.status === 'ACTIVE'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {s.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          ))}

          {sellers.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-xl border border-border-light text-text-muted">
              No seller organizations found. Click "Onboard Seller" to create the first seller organization.
            </div>
          )}
        </div>
      )}

      {/* Onboard Seller Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border-light">
            <h2 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Onboard Independent Seller Organization
            </h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSeller} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="e.g. Apex Global Hardware"
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Primary Administrator Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Seller Login Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. seller@apex.com"
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border-light rounded-lg text-sm text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Onboard Seller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
