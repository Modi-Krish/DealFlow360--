import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../shared/store/authStore';
import { getApprovals, actOnApproval } from '../../admin/services/adminRbacApi';
import { getQuotation } from '../../sales/services/quotationApi';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Clock,
  Check,
  Eye,
  ChevronRight,
  X
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'ALL' | '1' | '2'>('ALL');

  // Action modal
  const [actionModal, setActionModal] = useState<{ approvalId: string; action: string; quotationId?: string } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Drill-down quotation detail modal
  const [inspectQuotation, setInspectQuotation] = useState<any | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await getApprovals();
      if (res.success) {
        setApprovals(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleInspectQuote = async (quotationId: string) => {
    try {
      const data = await getQuotation(quotationId);
      setInspectQuotation(data);
    } catch (err) {
      console.error('Failed to load quotation detail:', err);
    }
  };

  const handleAct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await actOnApproval(actionModal.approvalId, actionModal.action, reason);
      if (res.success) {
        setActionModal(null);
        setReason('');
        loadApprovals();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApprovals = approvals.filter((ap) => {
    if (filterLevel === '1') return ap.level === 1;
    if (filterLevel === '2') return ap.level === 2;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            Quotation Approval Queue
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Enforcing multi-tier governance, separation of duties, and discount policy compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterLevel === 'ALL'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 text-text-muted hover:bg-slate-200'
            }`}
          >
            All Pending ({approvals.length})
          </button>
          <button
            onClick={() => setFilterLevel('1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterLevel === '1'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-text-muted hover:bg-slate-200'
            }`}
          >
            Level 1: Manager ({approvals.filter(a => a.level === 1).length})
          </button>
          <button
            onClick={() => setFilterLevel('2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterLevel === '2'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-text-muted hover:bg-slate-200'
            }`}
          >
            Level 2: Finance ({approvals.filter(a => a.level === 2).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((ap) => {
            const isOwnQuote = Boolean(user && ap.requester_id === user.id);

            return (
              <div
                key={ap.id}
                className="bg-white rounded-xl border border-border-light p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-text-main text-base">
                      Quotation #{ap.quotation_id}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        ap.level === 2
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {ap.level === 2 ? 'Level 2: Finance High-Risk Escalation' : 'Level 1: Sales Manager'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ap.acted_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Multi-tier Stepper Preview */}
                  <div className="flex items-center gap-2 text-xs font-medium text-text-muted bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-emerald-700 font-semibold">1. Submitted</span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    <span className={ap.level === 1 ? 'text-purple-700 font-bold' : 'text-emerald-700 font-semibold'}>
                      2. Sales Manager {ap.level === 2 ? '✓' : '●'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    <span className={ap.level === 2 ? 'text-red-700 font-bold' : 'text-slate-400'}>
                      3. Finance Escalation {ap.level === 2 ? '●' : ''}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-slate-400">4. Final Approved</span>
                  </div>

                  {/* Why Flagged Note */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Why Flagged:
                    </p>
                    <p className="mt-0.5">{ap.reason || 'Requested quotation discount exceeds assigned customer tier limits.'}</p>
                  </div>

                  {isOwnQuote && (
                    <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200 font-medium">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>Separation of Duties Policy: You created this quotation and are prohibited from approving it.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleInspectQuote(ap.quotation_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-text-main hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  <button
                    disabled={isOwnQuote}
                    onClick={() => {
                      setActionModal({ approvalId: ap.id, action: 'APPROVE', quotationId: ap.quotation_id });
                      setReason('');
                      setError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isOwnQuote
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>

                  <button
                    disabled={isOwnQuote}
                    onClick={() => {
                      setActionModal({ approvalId: ap.id, action: 'REVISION', quotationId: ap.quotation_id });
                      setReason('');
                      setError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isOwnQuote
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Revision
                  </button>

                  <button
                    disabled={isOwnQuote}
                    onClick={() => {
                      setActionModal({ approvalId: ap.id, action: 'REJECT', quotationId: ap.quotation_id });
                      setReason('');
                      setError('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isOwnQuote
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {filteredApprovals.length === 0 && (
            <div className="bg-white p-12 text-center rounded-xl border border-border-light text-text-muted">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-text-main">Approval queue is clear</p>
              <p className="text-xs mt-1">There are currently no quotations pending your authorization level.</p>
            </div>
          )}
        </div>
      )}

      {/* Drill-down Quotation Detail Modal */}
      {inspectQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-border-light max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main">
                  Quotation Detail: {inspectQuotation.quotation_number}
                </h3>
                <p className="text-xs text-text-muted">
                  Status: <span className="font-bold text-primary">{inspectQuotation.status}</span>
                </p>
              </div>
              <button
                onClick={() => setInspectQuotation(null)}
                className="text-text-muted hover:text-text-main"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-border-light">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Grand Total</p>
                  <p className="text-base font-bold text-text-main">${parseFloat(inspectQuotation.grand_total || 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-border-light">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Discount Total</p>
                  <p className="text-base font-bold text-red-600">-${parseFloat(inspectQuotation.discount_total || 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-border-light">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Risk Score</p>
                  <p className="text-base font-bold text-amber-600">{(parseFloat(inspectQuotation.risk_score || 0) * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-border-light">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Approval Level</p>
                  <p className="text-xs font-bold text-purple-700 mt-1">{inspectQuotation.approval_level}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-text-main mb-2">Line Items Breakdown:</h4>
                <div className="border border-border-light rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-border-light text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-text-muted font-semibold">Item</th>
                        <th className="px-3 py-2 text-left text-text-muted font-semibold">Qty</th>
                        <th className="px-3 py-2 text-left text-text-muted font-semibold">Unit Price</th>
                        <th className="px-3 py-2 text-left text-text-muted font-semibold">Disc %</th>
                        <th className="px-3 py-2 text-right text-text-muted font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {inspectQuotation.items?.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-text-main">{item.product_id}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 font-semibold text-red-600">{item.discount_percent}%</td>
                          <td className="px-3 py-2 text-right font-bold text-text-main">${parseFloat(item.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border-light">
              <button
                onClick={() => setInspectQuotation(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-border-light">
            <h3 className="text-lg font-bold text-text-main">
              Confirm {actionModal.action}
            </h3>
            <p className="text-xs text-text-muted">
              Please provide mandatory business justification or notes for the audit trail.
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAct} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Reason or justification for this governance decision..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 border border-border-light rounded-lg p-3 text-sm text-text-main focus:border-primary focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 border border-border-light rounded-lg text-text-muted hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className={`px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                    actionModal.action === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionModal.action === 'REVISION'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm {actionModal.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
