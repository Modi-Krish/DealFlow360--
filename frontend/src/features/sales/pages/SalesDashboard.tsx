import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getQuotations, updateQuotationStatus } from '../services/quotationApi';
import { getApprovals } from '../../admin/services/adminRbacApi';
import { getAuditLogs } from '../../admin/services/adminRbacApi';
import { api } from '../../../shared/lib/axios';
import {
  FileText,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Activity,
  LayoutGrid,
  List,
  Filter,
  Download,
  Printer,
  Layers,
  Sparkles
} from 'lucide-react';

export const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  // Granular Filter state
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [repFilter, setRepFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: quotations } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations
  });

  const { data: approvalsRes } = useQuery({
    queryKey: ['approvals'],
    queryFn: getApprovals
  });

  const { data: healthReports } = useQuery({
    queryKey: ['dealHealth'],
    queryFn: async () => {
      const res = await api.get('/analytics/deal-health');
      return res.data?.data || [];
    }
  });

  const { data: auditLogsRes } = useQuery({
    queryKey: ['auditLogsRecent'],
    queryFn: async () => {
      const res = await getAuditLogs({ limit: 6 });
      return res?.data || [];
    }
  });

  // Stage update mutation for Kanban
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateQuotationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  const allQuotes = quotations || [];

  // Extract unique reps for the filter dropdown
  const uniqueReps = useMemo(() => {
    const reps = new Set<string>();
    allQuotes.forEach((q: any) => {
      if (q.sales_rep_name) reps.add(q.sales_rep_name);
      else if (q.sales_rep_id) reps.add(`Rep-${q.sales_rep_id.substring(0, 6)}`);
    });
    return Array.from(reps);
  }, [allQuotes]);

  // Apply Granular Filters
  const filteredQuotations = useMemo(() => {
    let result = allQuotes;

    // Date Filter
    if (dateFilter !== 'ALL') {
      const now = new Date();
      result = result.filter((q: any) => {
        if (!q.created_at) return true;
        const qDate = new Date(q.created_at);
        if (dateFilter === 'TODAY') {
          return qDate.toDateString() === now.toDateString();
        }
        if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return qDate >= sevenDaysAgo;
        }
        if (dateFilter === 'MONTH') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return qDate >= thirtyDaysAgo;
        }
        return true;
      });
    }

    // Rep Filter
    if (repFilter !== 'ALL') {
      result = result.filter((q: any) => {
        const repName = q.sales_rep_name || `Rep-${(q.sales_rep_id || '').substring(0, 6)}`;
        return repName === repFilter;
      });
    }

    // Search Query (Quote # or Customer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item: any) =>
        item.quotation_number?.toLowerCase().includes(q) ||
        item.customer_name?.toLowerCase().includes(q) ||
        item.customer_id?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allQuotes, dateFilter, repFilter, searchQuery]);

  const activeQuotations = filteredQuotations.filter(
    (q: any) => q.status !== 'CLOSED_WON' && q.status !== 'CLOSED_LOST' && q.status !== 'CANCELLED'
  );

  const pendingApprovalsCount = approvalsRes?.data?.length ?? 0;
  const atRiskCount = (healthReports || []).filter((r: any) => r.health?.is_at_risk).length;
  const totalPipeline = activeQuotations.reduce((sum: number, q: any) => sum + parseFloat(q.grand_total || 0), 0);

  // Kanban Stage Columns definition
  const KANBAN_STAGES = [
    { key: 'PENDING', label: 'Draft / Pending', color: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800' },
    { key: 'IN_REVIEW', label: 'In Review', color: 'border-blue-300', bg: 'bg-blue-50/40', badge: 'bg-blue-100 text-blue-800' },
    { key: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'border-amber-300', bg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-800' },
    { key: 'APPROVED', label: 'Approved', color: 'border-teal-300', bg: 'bg-teal-50/40', badge: 'bg-teal-100 text-teal-800' },
    { key: 'ALLOCATED', label: 'Stock Allocated', color: 'border-purple-300', bg: 'bg-purple-50/40', badge: 'bg-purple-100 text-purple-800' },
    { key: 'CLOSED_WON', label: 'Closed Won', color: 'border-emerald-300', bg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800' },
    { key: 'CLOSED_LOST', label: 'Closed Lost', color: 'border-rose-300', bg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-800' }
  ];

  // Export CSV
  const exportPipelineCSV = () => {
    if (filteredQuotations.length === 0) return;
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Quotation Number', 'Customer', 'Rep', 'Status', 'Grand Total', 'Risk Score', 'Created Date'];
    const rows = filteredQuotations.map((q: any) => [
      escapeCsv(q.quotation_number),
      escapeCsv(q.customer_name || q.customer_id || ''),
      escapeCsv(q.sales_rep_name || q.sales_rep_id || ''),
      escapeCsv(q.status),
      escapeCsv(q.grand_total || 0),
      escapeCsv(q.risk_score || 0),
      escapeCsv(q.created_at || '')
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.map(h => `"${h}"`).join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dealflow360_pipeline_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Sales Pipeline Workspace
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Kanban deal stages, multi-dimensional filtering, live margin analytics, and automated approval chaining
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-border-light">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${
                viewMode === 'KANBAN' ? 'bg-white text-primary shadow-xs' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition ${
                viewMode === 'TABLE' ? 'bg-white text-primary shadow-xs' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>

          {/* Export Toolbar */}
          <button
            onClick={exportPipelineCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-semibold rounded-lg transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Export XLS
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-semibold rounded-lg transition"
            title="Print PDF Report"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            Print PDF
          </button>

          <Link
            to="/sales/quotations?new=true"
            className="btn-primary flex items-center gap-2 shadow-sm text-xs font-semibold py-2 px-4"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </Link>
        </div>
      </div>

      {/* Granular Report & Deal Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-border-light shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-text-main uppercase tracking-wider">Granular Filters:</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          {/* Period Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-muted">Period:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-slate-50 border border-border-light rounded-lg px-2.5 py-1.5 text-xs text-text-main font-semibold focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-muted">Sales Rep:</span>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="bg-slate-50 border border-border-light rounded-lg px-2.5 py-1.5 text-xs text-text-main font-semibold focus:outline-none focus:border-primary max-w-[150px] truncate"
            >
              <option value="ALL">All Sales Reps</option>
              {uniqueReps.map((rep) => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <input
            type="text"
            placeholder="Filter by quote #, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 border border-border-light rounded-lg px-3 py-1.5 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary w-48"
          />

          {(dateFilter !== 'ALL' || repFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setDateFilter('ALL');
                setRepFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-primary font-bold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Approvals */}
        <Link
          to="/sales/approvals"
          className="card group hover:border-amber-300 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pending Approvals</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-3xl font-bold text-text-main">{pendingApprovalsCount}</p>
                {pendingApprovalsCount > 0 && (
                  <span className="badge bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                    Action Req.
                  </span>
                )}
              </div>
              <p className="text-xs text-primary font-medium mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Go to approval queue <ArrowRight className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
              <CheckCircle2 className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Link>

        {/* At-Risk Deals */}
        <Link
          to="/sales/deal-health"
          className="card group hover:border-red-300 transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Deals at Risk</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-3xl font-bold text-text-main">{atRiskCount}</p>
                {atRiskCount > 0 && (
                  <span className="badge bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                    Warning
                  </span>
                )}
              </div>
              <p className="text-xs text-red-600 font-medium mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Inspect deal health <ArrowRight className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Link>

        {/* Active Pipeline Total */}
        <div className="card relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Pipeline</p>
              <p className="text-3xl font-bold text-text-main mt-2">
                ${totalPipeline.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {activeQuotations.length} active deals
              </p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Total Quotes In Scope */}
        <div className="card relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Filtered Volume</p>
              <p className="text-3xl font-bold text-text-main mt-2">{filteredQuotations.length}</p>
              <p className="text-xs text-primary font-medium mt-3 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Matching current filters
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 1. KANBAN PIPELINE BOARD VIEW */}
      {viewMode === 'KANBAN' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              Interactive Deal Pipeline Board
            </h2>
            <span className="text-xs text-text-muted">
              Click arrows on deal cards to advance stages across governance milestones
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((col) => {
              const colDeals = filteredQuotations.filter((q: any) => {
                const s = (q.status || '').toUpperCase();
                if (col.key === 'PENDING') return s === 'PENDING' || s === 'DRAFT';
                return s === col.key;
              });
              const colValue = colDeals.reduce((sum: number, q: any) => sum + parseFloat(q.grand_total || 0), 0);

              return (
                <div key={col.key} className={`rounded-xl border ${col.color} ${col.bg} p-3 flex flex-col min-w-[240px]`}>
                  {/* Column Header */}
                  <div className="pb-2 mb-2 border-b border-border-light flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xs text-text-main">{col.label}</h3>
                      <p className="text-[11px] font-bold text-emerald-700 mt-0.5">${colValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <span className={`badge ${col.badge} text-[10px] font-bold px-1.5 py-0.5`}>
                      {colDeals.length}
                    </span>
                  </div>

                  {/* Deals in Column */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[540px] pr-0.5">
                    {colDeals.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-text-muted italic">No deals</div>
                    ) : (
                      colDeals.map((deal: any) => (
                        <div
                          key={deal.id}
                          className="p-3 bg-white rounded-lg border border-border-light shadow-2xs hover:shadow-md transition cursor-pointer space-y-2"
                          onClick={() => navigate('/sales/quotations')}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xs font-bold text-text-main">{deal.quotation_number}</span>
                            <span className="text-xs font-black text-emerald-700">
                              ${parseFloat(deal.grand_total || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>

                          <div className="text-[11px] text-text-muted flex justify-between items-center">
                            <span>{deal.items?.length || 0} line items</span>
                            {deal.risk_score > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Risk: {parseFloat(deal.risk_score).toFixed(1)}
                              </span>
                            )}
                          </div>

                          {/* 1-Click Stage Advancement */}
                          <div className="pt-2 border-t border-border-light flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-text-muted">Advance:</span>
                            <div className="flex gap-1">
                              {col.key === 'PENDING' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: deal.id, status: 'IN_REVIEW' })}
                                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[10px] font-bold"
                                >
                                  Submit &rarr;
                                </button>
                              )}
                              {col.key === 'IN_REVIEW' && (
                                <Link
                                  to="/sales/approvals"
                                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[10px] font-bold inline-block"
                                >
                                  Review &rarr;
                                </Link>
                              )}
                              {col.key === 'APPROVED' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: deal.id, status: 'ALLOCATED' })}
                                  className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded text-[10px] font-bold"
                                >
                                  Allocate &rarr;
                                </button>
                              )}
                              {col.key === 'ALLOCATED' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: deal.id, status: 'CLOSED_WON' })}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold"
                                >
                                  Win Deal &rarr;
                                </button>
                              )}
                              {col.key !== 'CLOSED_LOST' && col.key !== 'CLOSED_WON' && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: deal.id, status: 'CLOSED_LOST' })}
                                  className="px-1.5 py-0.5 text-slate-400 hover:text-rose-600 rounded text-[10px]"
                                  title="Mark lost"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TABLE / SUMMARY VIEW */}
      {viewMode === 'TABLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deal Health Alerts */}
          <div className="card">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Deal Health Alerts
              </h2>
              <Link to="/sales/deal-health" className="text-sm font-semibold text-primary hover:text-emerald-700">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {!healthReports || healthReports.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border-light rounded-xl bg-slate-50">
                  <p className="text-text-muted text-sm">No deal health records yet.</p>
                </div>
              ) : (
                healthReports.slice(0, 4).map((report: any) => (
                  <div
                    key={report.quotation_id}
                    className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${
                      report.health?.is_at_risk
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-white border-border-light'
                    }`}
                  >
                    <div>
                      <h3 className="text-text-main font-semibold text-sm">{report.quotation_number}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {report.health?.risk_factors && report.health.risk_factors.length > 0 ? (
                          report.health.risk_factors.map((factor: string, i: number) => (
                            <span key={i} className="badge bg-red-100 text-red-700 text-xs">
                              {factor}
                            </span>
                          ))
                        ) : (
                          <span className="badge bg-emerald-50 text-emerald-700 text-xs">
                            Optimal Margin
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <p className={`text-xl font-bold ${report.health?.is_at_risk ? 'text-red-600' : 'text-emerald-600'}`}>
                        {report.health?.health_score ?? 100}
                      </p>
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Health</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Quotations Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-light">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Filtered Quotations Pipeline
              </h2>
              <Link to="/sales/quotations" className="text-sm font-semibold text-primary hover:text-emerald-700">
                View All
              </Link>
            </div>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredQuotations.slice(0, 8).map((q: any) => (
                <div
                  key={q.id}
                  onClick={() => navigate('/sales/quotations')}
                  className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-border-light cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-slate-100 text-slate-700 font-bold text-xs">QUOTE</span>
                      <p className="font-semibold text-text-main text-sm">{q.quotation_number}</p>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{q.items?.length || 0} line items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main text-sm">
                      ${parseFloat(q.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span
                      className={`badge text-xs mt-1 font-semibold ${
                        q.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : q.status === 'CLOSED_WON'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredQuotations.length === 0 && (
                <div className="p-8 text-center border border-dashed border-border-light rounded-xl bg-slate-50">
                  <p className="text-text-muted text-sm">No matching quotations found for current filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="card">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-light">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Activity & Audit Trail
          </h2>
          <Link to="/admin/audit-logs" className="text-sm font-semibold text-primary hover:text-emerald-700">
            Full Audit Log
          </Link>
        </div>
        <div className="divide-y divide-border-light">
          {auditLogsRes && auditLogsRes.length > 0 ? (
            auditLogsRes.slice(0, 5).map((log: any) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-slate-100 text-slate-800 text-xs font-mono">
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-text-main">{log.user_name}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-1">{log.reason || `Action on ${log.resource_type || log.module}`}</p>
                </div>
                <div className="text-right whitespace-nowrap text-xs text-text-muted">
                  {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-text-muted text-sm">No recent activity recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
};
