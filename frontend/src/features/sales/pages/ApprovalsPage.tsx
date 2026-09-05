import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../shared/store/authStore';
import { getApprovals, actOnApproval } from '../../admin/services/adminRbacApi';
import { CheckCircle2, XCircle, RotateCcw, ShieldAlert, Loader2, AlertCircle, Clock, Check } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ approvalId: string; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await getApprovals();
      if (res.success) {
        setApprovals(res.data);
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          Quotation Approval Queue
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Review discount threshold exceptions and high-risk commercial deal terms.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((ap) => {
            const isOwnQuote = Boolean(user && ap.requester_id === user.id);

            return (
              <div key={ap.id} className="bg-white rounded-xl border border-border-light p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-text-main text-base">
                      Quotation ID: {ap.quotation_id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      ap.level === 2
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {ap.level === 2 ? 'Level 2: Finance High-Risk' : 'Level 1: Sales Manager'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ap.acted_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-text-main bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs">
                    {ap.reason || 'Requested approval for discount ceiling exception'}
                  </p>

                  {isOwnQuote && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>Separation of Duties Policy: You created this quotation and cannot approve it.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={isOwnQuote}
                    onClick={() => {
                      setActionModal({ approvalId: ap.id, action: 'APPROVE' });
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
                      setActionModal({ approvalId: ap.id, action: 'REVISION' });
                      setReason('');
                      setError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Revision
                  </button>

                  <button
                    disabled={isOwnQuote}
                    onClick={() => {
                      setActionModal({ approvalId: ap.id, action: 'REJECT' });
                      setReason('');
                      setError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {approvals.length === 0 && (
            <div className="bg-white p-12 text-center rounded-xl border border-border-light text-text-muted">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-text-main">Approval queue is clear</p>
              <p className="text-xs mt-1">There are currently no quotations pending your authorization level.</p>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-light">
            <h3 className="font-bold text-text-main text-lg mb-2">
              Confirm {actionModal.action}
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Please enter an explanation or business justification. This will be recorded in the permanent audit trail.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleAct} className="space-y-4">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Reason or justification for this decision..."
                rows={3}
                className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-xs text-text-main"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-xs hover:opacity-90 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
