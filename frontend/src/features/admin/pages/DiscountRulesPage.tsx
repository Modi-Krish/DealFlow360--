import React, { useEffect, useState } from 'react';
import { getDiscountRules, updateDiscountRules } from '../../sales/services/quotationApi';
import { Percent, Shield, Save, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export const DiscountRulesPage: React.FC = () => {
  const [tierCeilings, setTierCeilings] = useState<Record<string, number>>({});
  const [categoryCeilings, setCategoryCeilings] = useState<Record<string, number>>({});
  const [salesManagerThreshold, setSalesManagerThreshold] = useState<number>(15);
  const [financeThreshold, setFinanceThreshold] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newTierName, setNewTierName] = useState('');
  const [newTierValue, setNewTierValue] = useState(10);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryValue, setNewCategoryValue] = useState(10);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await getDiscountRules();
      if (res) {
        setTierCeilings(res.tier_ceilings || {});
        setCategoryCeilings(res.category_ceilings || {});
        setSalesManagerThreshold(res.sales_manager_threshold ?? 15);
        setFinanceThreshold(res.finance_threshold ?? 25);
      }
    } catch (err: any) {
      console.error('Failed to load discount rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await updateDiscountRules({
        tier_ceilings: tierCeilings,
        category_ceilings: categoryCeilings,
        sales_manager_threshold: Number(salesManagerThreshold),
        finance_threshold: Number(financeThreshold)
      });
      setFeedback({ type: 'success', message: 'Discount rules & multi-level thresholds saved! Quotations will now route accordingly.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to update discount rules' });
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (name: string, val: number) => {
    setTierCeilings(prev => ({ ...prev, [name]: val }));
  };

  const removeTier = (name: string) => {
    setTierCeilings(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const addTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim()) return;
    setTierCeilings(prev => ({ ...prev, [newTierName.trim()]: Number(newTierValue) }));
    setNewTierName('');
  };

  const updateCategory = (name: string, val: number) => {
    setCategoryCeilings(prev => ({ ...prev, [name]: val }));
  };

  const removeCategory = (name: string) => {
    setCategoryCeilings(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryCeilings(prev => ({ ...prev, [newCategoryName.trim()]: Number(newCategoryValue) }));
    setNewCategoryName('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Discount Policy & Approval Matrix
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Configure dynamic maximum discount ceilings by customer tier and product category
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Rules'}
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12 text-text-muted">Loading discount policies...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Tier Ceilings */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h2 className="text-lg font-bold text-text-main">Customer Tier Max Discounts</h2>
                <p className="text-xs text-text-muted">Maximum allowable discount before triggering approval</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(tierCeilings).map(([tier, ceiling]) => (
                <div key={tier} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-border-light">
                  <div>
                    <p className="font-semibold text-text-main text-sm">{tier}</p>
                    <p className="text-xs text-text-muted">Ceiling threshold</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={ceiling}
                        onChange={(e) => updateTier(tier, parseFloat(e.target.value) || 0)}
                        className="w-20 pr-6 pl-2 py-1 bg-white border border-border-light rounded text-right font-bold text-text-main focus:border-primary focus:outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-text-muted font-bold">%</span>
                    </div>
                    <button
                      onClick={() => removeTier(tier)}
                      className="text-text-muted hover:text-red-600 transition-colors"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addTier} className="pt-3 border-t border-border-light flex gap-2">
              <input
                type="text"
                placeholder="New Tier (e.g. VIP)"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                className="flex-1 bg-slate-50 border border-border-light rounded px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="%"
                  value={newTierValue}
                  onChange={(e) => setNewTierValue(parseFloat(e.target.value) || 0)}
                  className="w-full pr-6 pl-2 py-1.5 bg-slate-50 border border-border-light rounded text-right font-medium text-sm text-text-main focus:outline-none focus:border-primary"
                />
                <span className="absolute right-2 top-2 text-xs text-text-muted font-bold">%</span>
              </div>
              <button
                type="submit"
                disabled={!newTierName.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>

          {/* Product Category Ceilings */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h2 className="text-lg font-bold text-text-main">Product Category Ceilings</h2>
                <p className="text-xs text-text-muted">Discounts above these limits flag category-specific risk</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(categoryCeilings).map(([cat, ceiling]) => (
                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-border-light">
                  <div>
                    <p className="font-semibold text-text-main text-sm">{cat}</p>
                    <p className="text-xs text-text-muted">Category threshold</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={ceiling}
                        onChange={(e) => updateCategory(cat, parseFloat(e.target.value) || 0)}
                        className="w-20 pr-6 pl-2 py-1 bg-white border border-border-light rounded text-right font-bold text-text-main focus:border-primary focus:outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-text-muted font-bold">%</span>
                    </div>
                    <button
                      onClick={() => removeCategory(cat)}
                      className="text-text-muted hover:text-red-600 transition-colors"
                      title="Remove category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addCategory} className="pt-3 border-t border-border-light flex gap-2">
              <input
                type="text"
                placeholder="New Category (e.g. Consulting)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 bg-slate-50 border border-border-light rounded px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="%"
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(parseFloat(e.target.value) || 0)}
                  className="w-full pr-6 pl-2 py-1.5 bg-slate-50 border border-border-light rounded text-right font-medium text-sm text-text-main focus:outline-none focus:border-primary"
                />
                <span className="absolute right-2 top-2 text-xs text-text-muted font-bold">%</span>
              </div>
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>

          {/* Configurable Multi-Level Escalation Thresholds */}
          <div className="lg:col-span-2 card bg-gradient-to-r from-slate-50 to-blue-50/30 border border-border-light space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-light pb-3">
              <div>
                <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Approval Escalation Thresholds (Governance Controls)
                </h2>
                <p className="text-xs text-text-muted">
                  Configure maximum discount thresholds that dictate escalation paths to Sales Management and Finance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge bg-amber-50 text-amber-800 font-bold text-xs">Level 1 Escalation</span>
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={salesManagerThreshold}
                      onChange={(e) => setSalesManagerThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full pr-6 pl-2 py-1.5 bg-slate-50 border border-amber-300 rounded text-right font-bold text-sm text-text-main focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-xs text-text-muted font-bold">%</span>
                  </div>
                </div>
                <h3 className="font-bold text-text-main text-sm">Sales Manager Threshold</h3>
                <p className="text-xs text-text-muted">
                  Discounts exceeding customer tier ceilings or this baseline percentage route directly to the Sales Manager approval queue.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-red-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge bg-red-50 text-red-800 font-bold text-xs">Level 2 Escalation</span>
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={financeThreshold}
                      onChange={(e) => setFinanceThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full pr-6 pl-2 py-1.5 bg-slate-50 border border-red-300 rounded text-right font-bold text-sm text-text-main focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-xs text-text-muted font-bold">%</span>
                  </div>
                </div>
                <h3 className="font-bold text-text-main text-sm">Finance Escalation Threshold</h3>
                <p className="text-xs text-text-muted">
                  Discounts exceeding this critical threshold automatically trigger multi-tier escalation, requiring Finance sign-off.
                </p>
              </div>
            </div>
          </div>

          {/* Routing Matrix Overview */}
          <div className="lg:col-span-2 card">
            <h2 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Dynamic Approval Routing Matrix
            </h2>
            <p className="text-sm text-text-muted mb-4">
              How the engine automatically assigns approval workflows based on blended discount risk:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <span className="badge bg-emerald-100 text-emerald-800 font-semibold mb-2">Level 0: Auto-Approve</span>
                <p className="text-sm font-bold text-text-main">Within Tier & Category Ceilings</p>
                <p className="text-xs text-text-muted mt-1">Quotations pass automatically without human intervention. Deals immediately ready for customer signing.</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="badge bg-amber-100 text-amber-800 font-semibold mb-2">Level 1: Sales Manager</span>
                <p className="text-sm font-bold text-text-main">Over Ceiling (Risk Score &lt; 0.6)</p>
                <p className="text-xs text-text-muted mt-1">Moderate discount breach. Routed to the organization's Sales Manager queue with separation of duties enforcement.</p>
              </div>
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                <span className="badge bg-red-100 text-red-800 font-semibold mb-2">Level 2: Finance Escalation</span>
                <p className="text-sm font-bold text-text-main">High Risk (Risk Score &ge; 0.6)</p>
                <p className="text-xs text-text-muted mt-1">Severe discount or negative margin risk. Requires Sales Manager sign-off first, then automatically escalates to Finance.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
