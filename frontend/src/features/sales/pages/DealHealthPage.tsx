import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../shared/lib/axios';
import { nudgeSalesRep, escalateDeal } from '../services/quotationApi';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Clock,
  Bell,
  ShieldAlert,
  Check
} from 'lucide-react';

export const DealHealthPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'AT_RISK' | 'HEALTHY'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const { data: healthReports, isLoading, refetch } = useQuery({
    queryKey: ['dealHealth'],
    queryFn: async () => {
      const res = await api.get('/analytics/deal-health');
      return res.data?.data || [];
    }
  });

  const nudgeMutation = useMutation({
    mutationFn: (quoteId: string) => nudgeSalesRep(quoteId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dealHealth'] });
      setFeedback({
        type: 'warning',
        message: res.message || 'Automated velocity nudge dispatched to sales representative.'
      });
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to dispatch nudge to rep'
      });
    }
  });

  const escalateMutation = useMutation({
    mutationFn: (quoteId: string) => escalateDeal(quoteId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dealHealth'] });
      setFeedback({
        type: 'success',
        message: res.message || 'Quotation escalated to Senior Management. SLA marked as DELAYED.'
      });
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to escalate quotation'
      });
    }
  });

  const filteredReports = (healthReports || []).filter((r: any) => {
    if (filter === 'AT_RISK') return r.health?.is_at_risk;
    if (filter === 'HEALTHY') return !r.health?.is_at_risk;
    return true;
  });

  const atRiskCount = (healthReports || []).filter((r: any) => r.health?.is_at_risk).length;
  const healthyCount = (healthReports || []).filter((r: any) => !r.health?.is_at_risk).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/sales/dashboard" className="text-sm text-text-muted hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Workspace
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Deal Health & Risk Intelligence
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time margin risk, discount ceiling breaches, SLA slippage, and automated rep interventions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg text-text-main hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : feedback.type === 'warning' ? (
              <Bell className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm font-medium text-text-muted">Total Active Deals</p>
          <p className="text-3xl font-bold text-text-main mt-2">{(healthReports || []).length}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-text-muted">At-Risk Deals</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-bold text-red-600">{atRiskCount}</p>
            {atRiskCount > 0 && (
              <span className="badge bg-red-50 text-red-700 text-xs font-semibold">Requires Action</span>
            )}
          </div>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-text-muted">Healthy Deals</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{healthyCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-light pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'ALL'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-muted hover:bg-slate-100'
          }`}
        >
          All Deals ({(healthReports || []).length})
        </button>
        <button
          onClick={() => setFilter('AT_RISK')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'AT_RISK'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-text-muted hover:bg-slate-100'
          }`}
        >
          At-Risk ({atRiskCount})
        </button>
        <button
          onClick={() => setFilter('HEALTHY')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'HEALTHY'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-text-muted hover:bg-slate-100'
          }`}
        >
          Healthy ({healthyCount})
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Quotation</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Deal Value</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Delivery SLA</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Health Score</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Risk Factors</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Automated Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border-light">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    Loading deal health analysis...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No deals match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report: any) => {
                  const score = report.health?.health_score ?? 100;
                  const isAtRisk = report.health?.is_at_risk;
                  const isDelayed = report.sla_status === 'DELAYED' || (report.health?.risk_factors || []).some((rf: string) => rf.includes('Delayed'));
                  const isSlaRisk = report.sla_status === 'AT_RISK' || (report.health?.risk_factors || []).some((rf: string) => rf.includes('SLA'));

                  return (
                    <tr key={report.quotation_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-semibold text-text-main text-sm">
                          {report.quotation_number}
                        </span>
                        {report.promised_delivery_date && (
                          <p className="text-[11px] text-text-muted mt-0.5">
                            Promise: {new Date(report.promised_delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-text-main">
                        ${Number(report.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="badge bg-slate-100 text-slate-700 font-medium text-xs">
                          {report.status}
                        </span>
                      </td>

                      {/* Delivery SLA Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isDelayed ? (
                          <span className="badge bg-red-100 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            SLA Delayed
                          </span>
                        ) : isSlaRisk ? (
                          <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            At Risk
                          </span>
                        ) : (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            On Schedule
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAtRisk
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {score}
                          </div>
                          <span className={`text-xs font-semibold ${isAtRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isAtRisk ? 'At Risk' : 'Healthy'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {report.health?.risk_factors && report.health.risk_factors.length > 0 ? (
                            report.health.risk_factors.map((rf: string, idx: number) => (
                              <span key={idx} className="badge bg-red-50 text-red-700 text-[11px] flex items-center gap-1 border border-red-100">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {rf}
                              </span>
                            ))
                          ) : (
                            <span className="badge bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Optimal margin & velocity
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 1-Click Action Interventions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Nudge Rep */}
                          <button
                            type="button"
                            onClick={() => nudgeMutation.mutate(report.quotation_id)}
                            disabled={nudgeMutation.isPending}
                            title="Send automated velocity alert to Sales Rep"
                            className="px-2.5 py-1 rounded font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Bell className="w-3 h-3 text-amber-600" />
                            Nudge Rep
                          </button>

                          {/* 1-Click Escalate Deal */}
                          <button
                            type="button"
                            onClick={() => escalateMutation.mutate(report.quotation_id)}
                            disabled={escalateMutation.isPending}
                            title="Flag quotation to Senior Sales Management & mark Delayed"
                            className="px-2.5 py-1 rounded font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                            Escalate
                          </button>

                          {/* Link to Quotation editor */}
                          <Link
                            to={`/sales/quotations`}
                            className="text-primary hover:text-emerald-700 font-semibold px-2 py-1"
                          >
                            Open Quote
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
