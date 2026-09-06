import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getCustomerQuotations, acceptQuotation, negotiateQuotation, addPortalLineComment } from '../services/portalApi';
import { useAuthStore } from '../../../shared/store/authStore';
import {
  FileText,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  X,
  Search,
  DollarSign,
  Sparkles,
  Truck,
  Download
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'CONFIRMED' | 'NEGOTIATING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [negotiateQuoteId, setNegotiateQuoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [counterDiscount, setCounterDiscount] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Line-level item discussion state
  const [activeLineItem, setActiveLineItem] = useState<{ quotationId: string; item: any } | null>(null);
  const [customerCommentText, setCustomerCommentText] = useState('');

  const { data: rawQuotations, isLoading } = useQuery({
    queryKey: ['customerQuotations', customerId || 'me'],
    queryFn: () => getCustomerQuotations(customerId || ''),
  });

  const quotations = rawQuotations || [];

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const actionRequiredCount = quotations.filter((q: any) => q.status === 'APPROVED' || q.status === 'NEGOTIATING').length;
    const confirmedCount = quotations.filter((q: any) => ['CONFIRMED', 'ALLOCATED', 'CLOSED_WON'].includes(q.status)).length;
    const totalPipeline = quotations.reduce((sum: number, q: any) => sum + parseFloat(q.grand_total || 0), 0);

    return { totalCount, actionRequiredCount, confirmedCount, totalPipeline };
  }, [quotations]);

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q: any) => {
      // Tab filter
      if (filterTab === 'ACTION_REQUIRED' && !(q.status === 'APPROVED' || q.status === 'NEGOTIATING')) {
        return false;
      }
      if (filterTab === 'CONFIRMED' && !['CONFIRMED', 'ALLOCATED', 'CLOSED_WON'].includes(q.status)) {
        return false;
      }
      if (filterTab === 'NEGOTIATING' && q.status !== 'NEGOTIATING') {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const numMatch = (q.quotation_number || '').toLowerCase().includes(query);
        const sellerMatch = (q.seller_name || '').toLowerCase().includes(query);
        const itemMatch = (q.items || []).some((item: any) =>
          (item.product?.name || item.product_id || '').toLowerCase().includes(query)
        );
        return numMatch || sellerMatch || itemMatch;
      }

      return true;
    });
  }, [quotations, filterTab, searchQuery]);

  const acceptMutation = useMutation({
    mutationFn: acceptQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerQuotations'] });
      setFeedback({
        type: 'success',
        message: 'Quotation digitally confirmed & signed! Fulfillment order dispatched to warehouse.'
      });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to accept quotation' });
    }
  });

  const negotiateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { notes: string; counter_discount_percent?: number } }) =>
      negotiateQuotation(id, payload),
    onSuccess: (res) => {
      setNegotiateQuoteId(null);
      setNotes('');
      setCounterDiscount('');
      queryClient.invalidateQueries({ queryKey: ['customerQuotations'] });
      setFeedback({
        type: 'warning',
        message: res.message || 'Counter-proposal received. Our sales team is evaluating your requested terms.'
      });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Negotiation failed' });
    }
  });

  const lineCommentMutation = useMutation({
    mutationFn: ({ quoteId, itemId, text }: { quoteId: string; itemId: string; text: string }) =>
      addPortalLineComment(quoteId, itemId, {
        author_name: user?.name || 'Customer Contact',
        author_role: 'CUSTOMER',
        message: text
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerQuotations'] });
      setCustomerCommentText('');
      setActiveLineItem(null);
      setFeedback({
        type: 'success',
        message: 'Your line-item note was sent directly to the dedicated account team.'
      });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err?.response?.data?.detail || 'Failed to submit comment' });
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> B2B Commercial Buyer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Commercial Quotations & Contracts
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Review live seller proposals, negotiate pricing terms, ask item-level questions, and digitally execute agreements with instant warehouse delivery tracking.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-end gap-1 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/60 shadow-inner w-full md:w-auto">
          <span className="text-xs text-slate-400 font-semibold uppercase">Account Buyer Profile</span>
          <span className="text-sm font-bold text-emerald-400">{user?.company_name || user?.name || 'Verified B2B Buyer'}</span>
          <span className="text-[11px] text-slate-400">{user?.email}</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border-light shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Total Proposals</p>
            <p className="text-2xl font-bold text-text-main mt-1">{metrics.totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-light shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Action Required</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.actionRequiredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-light shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Confirmed Deals</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.confirmedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border-light shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Total Contract Value</p>
            <p className="text-2xl font-bold text-text-main mt-1">
              ${metrics.totalPipeline.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs and Controls */}
      <div className="bg-white p-4 rounded-xl border border-border-light shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { key: 'ALL', label: `All Quotes (${metrics.totalCount})` },
            { key: 'ACTION_REQUIRED', label: `Action Required (${metrics.actionRequiredCount})` },
            { key: 'CONFIRMED', label: `Confirmed Contracts (${metrics.confirmedCount})` },
            { key: 'NEGOTIATING', label: `In Negotiation` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Quote #, seller, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border-light rounded-lg focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="card text-center py-16 text-text-muted space-y-2">
          <Clock className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold">Retrieving your commercial contracts...</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="card text-center py-16 space-y-4 bg-white rounded-xl border border-border-light p-8">
          <FileText className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-text-main">No Commercial Proposals Match Your Filter</h2>
            <p className="text-sm text-text-muted mt-1">There are currently no active quotes matching this view.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuotations.map((q: any) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-border-light shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-primary"
            >
              {/* Card Top Header */}
              <div className="p-5 bg-slate-50/70 border-b border-border-light flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-extrabold text-text-main">{q.quotation_number}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      q.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : q.status === 'NEGOTIATING'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : ['CONFIRMED', 'ALLOCATED', 'CLOSED_WON'].includes(q.status)
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {q.status === 'APPROVED'
                      ? 'Approved — Action Required'
                      : q.status === 'NEGOTIATING'
                      ? 'Counter Terms Pending Review'
                      : q.status === 'CONFIRMED' || q.status === 'ALLOCATED' || q.status === 'CLOSED_WON'
                      ? 'Contract Confirmed'
                      : q.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  {q.seller_name && (
                    <span className="bg-slate-200/80 text-slate-800 font-bold px-2.5 py-1 rounded-md">
                      Seller: {q.seller_name}
                    </span>
                  )}
                  <span className="text-text-muted">
                    Created: {q.created_at ? new Date(q.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  {/* Notes notice if any */}
                  {q.customer_notes && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <span className="font-bold flex items-center gap-1 text-amber-800">
                        <MessageSquare className="w-3.5 h-3.5" /> Your Counter Offer Notes:
                      </span>
                      <p className="leading-relaxed">{q.customer_notes}</p>
                    </div>
                  )}

                  {/* Financial overview breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-border-light">
                      <p className="text-text-muted font-medium">Gross Subtotal</p>
                      <p className="text-sm font-bold text-text-main mt-0.5">
                        ${parseFloat(q.subtotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-border-light">
                      <p className="text-text-muted font-medium">Negotiated Savings</p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5">
                        -${parseFloat(q.discount_total || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-border-light">
                      <p className="text-text-muted font-medium">Applicable Taxes</p>
                      <p className="text-sm font-bold text-text-main mt-0.5">
                        ${parseFloat(q.tax_total || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-emerald-800 font-bold">Total Contract Payable</p>
                      <p className="text-base font-extrabold text-emerald-950 mt-0.5">
                        ${parseFloat(q.grand_total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-border-light rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-100/80 px-4 py-2 text-xs font-bold text-slate-700 border-b border-border-light flex justify-between">
                      <span>Itemized Commercial Products</span>
                      <span>{q.items?.length || 0} Line Item(s)</span>
                    </div>
                    <div className="divide-y divide-border-light bg-white">
                      {q.items?.map((item: any, idx: number) => {
                        const commentsCount = item.comments?.length || 0;
                        return (
                          <div key={idx} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-main text-sm">
                                  {item.product?.name || item.product_id}
                                </span>
                                {item.variant && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Variant: {item.variant}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-text-muted text-[11px]">
                                <span>Quantity: <strong className="text-text-main">{item.quantity}</strong></span>
                                <span>•</span>
                                <span>Unit Base: <strong>${parseFloat(item.unit_price || 0).toFixed(2)}</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLineItem({ quotationId: q.id, item });
                                  setCustomerCommentText('');
                                }}
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                  commentsCount > 0
                                    ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span>{commentsCount > 0 ? `${commentsCount} Question(s)` : 'Line Discussion'}</span>
                              </button>

                              <div className="text-right">
                                <div className="font-extrabold text-text-main text-sm">
                                  ${parseFloat(item.total_price || item.line_total || 0).toFixed(2)}
                                </div>
                                {parseFloat(item.discount || item.discount_percent || 0) > 0 && (
                                  <span className="text-[11px] font-bold text-emerald-600">
                                    ({parseFloat(item.discount || item.discount_percent || 0)}% discount)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Action Box */}
                <div className="lg:w-72 flex flex-col justify-start space-y-3 bg-slate-50 p-4 rounded-xl border border-border-light">
                  <span className="text-xs font-bold text-text-main uppercase tracking-wider border-b border-slate-200 pb-2">
                    Commercial Actions
                  </span>

                  <a
                    href={`/api/v1/bids/${q.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1.5 shadow-2xs"
                    title="Download PDF Proposal"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Download PDF Proposal
                  </a>

                  {q.status === 'APPROVED' ? (
                    <>
                      <button
                        onClick={() => acceptMutation.mutate(q.id)}
                        disabled={acceptMutation.isPending}
                        className="btn-primary w-full py-2.5 text-xs font-bold flex justify-center items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {acceptMutation.isPending ? 'Signing Contract...' : 'Accept & Confirm Contract'}
                      </button>

                      <button
                        onClick={() => {
                          setNegotiateQuoteId(negotiateQuoteId === q.id ? null : q.id);
                          setNotes('');
                          setCounterDiscount('');
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        Propose Counter Offer
                      </button>
                    </>
                  ) : q.status === 'NEGOTIATING' ? (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Under Executive Review
                      </div>
                      <p className="text-[11px] text-amber-800/90 leading-relaxed">
                        Your requested discount / terms are currently under evaluation by the seller management team.
                      </p>
                    </div>
                  ) : ['CONFIRMED', 'ALLOCATED', 'CLOSED_WON'].includes(q.status) ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Agreement Executed
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Contract confirmed. Automated warehouse allocation and delivery dispatch active.
                      </p>
                      <div className="pt-2 border-t border-emerald-200/60 mt-2 flex items-center gap-1 text-emerald-900 font-bold text-[11px]">
                        <Truck className="w-3.5 h-3.5 text-emerald-700" /> Status: Dispatched
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-200/60 text-xs text-text-muted text-center italic">
                      Proposal is currently being prepared by account team.
                    </div>
                  )}

                  {/* Inline Counter Offer Drawer */}
                  {negotiateQuoteId === q.id && (
                    <div className="mt-2 p-3.5 bg-white rounded-xl border border-amber-200 shadow-sm space-y-3 animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Counter Terms Form
                        </span>
                        <button onClick={() => setNegotiateQuoteId(null)} className="text-slate-400 hover:text-slate-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-700 font-bold mb-1">
                          Counter Discount Target (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          placeholder="e.g. 15%"
                          value={counterDiscount}
                          onChange={(e) => setCounterDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-text-main focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-700 font-bold mb-1">
                          Negotiation Notes & Custom Requirements
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Requesting 15% discount for 90-day volume commitment..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs text-text-main focus:outline-none focus:border-primary resize-none"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (notes.trim() || counterDiscount !== '') {
                            negotiateMutation.mutate({
                              id: q.id,
                              payload: {
                                notes: notes.trim() || `Customer requested ${counterDiscount}% discount`,
                                counter_discount_percent: counterDiscount !== '' ? Number(counterDiscount) : undefined
                              }
                            });
                          }
                        }}
                        disabled={negotiateMutation.isPending || (!notes.trim() && counterDiscount === '')}
                        className="w-full btn-primary py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        {negotiateMutation.isPending ? 'Submitting Proposal...' : 'Submit Counter Offer'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Line-Level Discussion / Question Modal */}
      {activeLineItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-border-light">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h3 className="font-bold text-text-main text-base flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Line Item Discussion & Q&A
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {activeLineItem.item?.product?.name || activeLineItem.item?.product_id}
                  {activeLineItem.item?.variant ? ` (${activeLineItem.item?.variant})` : ''}
                </p>
              </div>
              <button
                onClick={() => setActiveLineItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation History */}
            <div className="max-h-64 overflow-y-auto space-y-3 p-1">
              {(!activeLineItem.item?.comments || activeLineItem.item.comments.length === 0) ? (
                <div className="text-center py-8 text-xs text-text-muted space-y-1">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No questions or notes on this product yet.</p>
                  <p className="text-[11px]">Ask our sales engineering team about technical specs, warranty, or delivery dates.</p>
                </div>
              ) : (
                activeLineItem.item.comments.map((cmt: any, ci: number) => (
                  <div
                    key={ci}
                    className={`p-3.5 rounded-xl text-xs space-y-1 ${
                      cmt.author_role === 'CUSTOMER'
                        ? 'bg-blue-50 border border-blue-200 text-blue-950 mr-4'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-950 ml-4'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className={cmt.author_role === 'CUSTOMER' ? 'text-blue-900' : 'text-emerald-900'}>
                        {cmt.author_name} ({cmt.author_role === 'CUSTOMER' ? 'Your Team' : 'Sales Representative'})
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {cmt.created_at ? new Date(cmt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="leading-relaxed">{cmt.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input form */}
            <div className="pt-3 border-t border-border-light space-y-2.5">
              <textarea
                value={customerCommentText}
                onChange={(e) => setCustomerCommentText(e.target.value)}
                placeholder="Ask about product specifications, timeline, or bulk pricing options..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-border-light focus:outline-none focus:border-primary bg-slate-50 text-text-main resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLineItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-text-muted hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!customerCommentText.trim() || lineCommentMutation.isPending}
                  onClick={() => {
                    if (!activeLineItem?.item?.id) return;
                    lineCommentMutation.mutate({
                      quoteId: activeLineItem.quotationId,
                      itemId: activeLineItem.item.id,
                      text: customerCommentText.trim()
                    });
                  }}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 font-bold disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {lineCommentMutation.isPending ? 'Sending Message...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
