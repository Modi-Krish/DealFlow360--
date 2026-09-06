import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';
import { getProducts } from '../services/adminApi';
import {
  Sparkles,
  PlusCircle,
  Trash2,
  TrendingUp,
  Package,
  ArrowRight,
  X
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [recommendedId, setRecommendedId] = useState('');
  const [priority, setPriority] = useState(3);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data: rules, isLoading } = useQuery<any[]>({
    queryKey: ['recommendationRules'],
    queryFn: async () => {
      const { data } = await api.get('/recommendations/rules/list');
      return data.data || [];
    }
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: getProducts
  });

  const rulesList: any[] = Array.isArray(rules) ? rules : [];
  const productList: any[] = Array.isArray(products) ? products : [];

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/recommendations/rules', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendationRules'] });
      setModalOpen(false);
      setSourceId('');
      setRecommendedId('');
      setReason('');
      setFeedback({ type: 'success', message: 'Cross-sell / Upsell pairing rule created!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to create rule' });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/recommendations/rules/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendationRules'] });
      setFeedback({ type: 'success', message: 'Recommendation rule removed' });
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Upsell & Cross-Sell Recommendation Governance
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Define co-purchase pairings, promoted accessories, and margin-optimizing recommendation triggers
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2.5 px-4 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add Pairing Rule
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className="text-sm font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Rules Table */}
      <div className="card space-y-4">
        <div className="flex justify-between items-center border-b border-border-light pb-3">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Active Product Pairing Rules ({rules?.length || 0})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Source Product in Cart</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Recommended Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Priority & Reason</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border-light">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">Loading recommendation rules...</td></tr>
              ) : rulesList.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">No recommendation pairing rules found.</td></tr>
              ) : (
                rulesList.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-sm font-semibold text-text-main flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-primary" />
                      {rule.source_product_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                      {rule.recommended_product_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <span className="badge bg-primary/10 text-primary text-[10px] font-bold">Priority #{rule.priority}</span>
                        <span>{rule.reason}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Add Cross-Sell / Upsell Rule
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">When Cart Contains (Source Product)</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="">Select source product...</option>
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${parseFloat(p.base_price || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Recommend Item (Target Product)</label>
                <select
                  value={recommendedId}
                  onChange={(e) => setRecommendedId(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="">Select recommended cross-sell product...</option>
                  {productList.filter((p: any) => p.id !== sourceId).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${parseFloat(p.base_price || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Priority (1 = Standard, 5 = Highest)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Sales Pitch / Recommendation Reason</label>
                <input
                  type="text"
                  placeholder="Frequently bundled for +35% margin expansion..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createRuleMutation.mutate({
                    source_product_id: sourceId,
                    recommended_product_id: recommendedId,
                    priority,
                    reason: reason || 'Recommended complementary product'
                  });
                }}
                disabled={!sourceId || !recommendedId || createRuleMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {createRuleMutation.isPending ? 'Saving...' : 'Create Pairing Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
