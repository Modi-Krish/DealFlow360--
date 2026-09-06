import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  getQuotations,
  getQuotation,
  createQuotation,
  addQuotationItem,
  deleteQuotationItem,
  submitQuotation,
  getDiscountRules,
  addLineComment,
  getQuotationRecommendations
} from '../services/quotationApi';
import { getCustomers, getProducts } from '../../admin/services/adminApi';
import {
  Plus,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Search,
  FileText,
  Sparkles,
  Send,
  ShieldAlert,
  MessageSquare,
  X
} from 'lucide-react';

export const QuotationBuilder: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeQuotationId, setActiveQuotationId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(searchParams.get('new') === 'true');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Line item adder form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  // Line-level comment thread state
  const [activeCommentItem, setActiveCommentItem] = useState<any | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Queries
  const { data: quotations, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts
  });

  const { data: discountRules } = useQuery({
    queryKey: ['discountRules'],
    queryFn: getDiscountRules
  });

  const { data: activeQuotation, refetch: refetchActiveQuote } = useQuery({
    queryKey: ['quotation', activeQuotationId],
    queryFn: () => (activeQuotationId ? getQuotation(activeQuotationId) : null),
    enabled: !!activeQuotationId
  });

  const { data: dynamicRecommendations } = useQuery({
    queryKey: ['recommendations', activeQuotationId],
    queryFn: () => (activeQuotationId ? getQuotationRecommendations(activeQuotationId) : null),
    enabled: !!activeQuotationId
  });

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreatingNew(true);
    }
  }, [searchParams]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setActiveQuotationId(data.id);
      setIsCreatingNew(false);
      setSearchParams({});
      setFeedback({ type: 'success', message: `Quotation ${data.quotation_number} initialized as Draft!` });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to create quotation' });
    }
  });

  const addItemMutation = useMutation({
    mutationFn: ({ id, item }: { id: string; item: any }) => addQuotationItem(id, item),
    onSuccess: () => {
      refetchActiveQuote();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations', activeQuotationId] });
      setSelectedProduct('');
      setSelectedVariant('');
      setItemQuantity(1);
      setItemDiscount(0);
      setFeedback({ type: 'success', message: 'Item added to quotation' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to add item' });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ quoteId, itemId, payload }: { quoteId: string; itemId: string; payload: any }) =>
      addLineComment(quoteId, itemId, payload),
    onSuccess: (updatedQuote) => {
      refetchActiveQuote();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setNewCommentText('');
      // Keep activeCommentItem updated with new comment
      if (activeCommentItem && updatedQuote?.items) {
        const found = updatedQuote.items.find((it: any) => it.id === activeCommentItem.id);
        if (found) setActiveCommentItem(found);
      }
      setFeedback({ type: 'success', message: 'Comment submitted successfully' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to post comment' });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => deleteQuotationItem(id, index),
    onSuccess: () => {
      refetchActiveQuote();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setFeedback({ type: 'success', message: 'Item removed' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to remove item' });
    }
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitQuotation(id),
    onSuccess: (data) => {
      refetchActiveQuote();
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dealHealth'] });
      if (data.status === 'APPROVED') {
        setFeedback({
          type: 'success',
          message: 'Quotation auto-approved! Discounts are within customer tier limits.'
        });
      } else {
        setFeedback({
          type: 'warning',
          message: `Quotation submitted! High-discount risk detected. Routed to approval queue (${data.approval_level || 'SALES_MANAGER'}).`
        });
      }
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to submit quotation' });
    }
  });

  // Calculate dynamic discount warnings
  const selectedCustomerObj = customers?.find((c: any) => c.id === (activeQuotation?.customer_id || selectedCustomer));
  const customerTier = selectedCustomerObj?.customer_tier || 'Standard';
  const tierCeiling = discountRules?.tier_ceilings?.[customerTier] ?? 10.0;

  const hasCeilingBreach = (activeQuotation?.items || []).some(
    (item: any) => (parseFloat(item.discount_percent || 0) > tierCeiling)
  );

  const highestDiscount = (activeQuotation?.items || []).reduce(
    (max: number, it: any) => Math.max(max, parseFloat(it.discount_percent || 0)),
    0
  );

  // Quick Upsell items: prioritize AI / co-purchase recommendations, fallback to catalog
  const upsellCatalog = (dynamicRecommendations && dynamicRecommendations.length > 0)
    ? dynamicRecommendations.map((r: any) => ({
        id: r.product_id,
        name: r.product_name,
        base_price: r.base_price,
        reason: r.reason,
        is_rec: true
      }))
    : (products || []).slice(0, 4).map((p: any) => ({
        id: p.id,
        name: p.name,
        base_price: p.base_price,
        reason: 'Recommended Product',
        is_rec: false
      }));

  const handleQuickAddUpsell = (prod: any) => {
    if (!activeQuotationId) return;
    addItemMutation.mutate({
      id: activeQuotationId,
      item: { product_id: prod.id, quantity: 1, discount_percent: 0 }
    });
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuotationId || !selectedProduct) return;
    addItemMutation.mutate({
      id: activeQuotationId,
      item: {
        product_id: selectedProduct,
        variant: selectedVariant || undefined,
        quantity: Number(itemQuantity) || 1,
        discount_percent: Number(itemDiscount) || 0
      }
    });
  };

  // Filtered Quotations
  const filteredQuotations = (quotations || []).filter((q: any) => {
    const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.customer_id && q.customer_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          {activeQuotationId || isCreatingNew ? (
            <button
              onClick={() => {
                setActiveQuotationId(null);
                setIsCreatingNew(false);
                setSearchParams({});
              }}
              className="text-sm text-text-muted hover:text-primary flex items-center gap-1 mb-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Quotations List
            </button>
          ) : null}
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            {activeQuotationId
              ? `Quotation #${activeQuotation?.quotation_number || 'Details'}`
              : isCreatingNew
              ? 'Create New Quotation'
              : 'Quotations & Deals'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {activeQuotationId
              ? 'Configure line items, discounts, margin evaluation, and approval routing'
              : 'Manage customer quotes, evaluate risk margins, and track deal stages'}
          </p>
        </div>

        {!activeQuotationId && !isCreatingNew && (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="btn-primary flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : feedback.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* 1. NEW QUOTATION MODAL / SELECTION */}
      {isCreatingNew && !activeQuotationId && (
        <div className="card max-w-xl mx-auto space-y-5">
          <h2 className="text-lg font-bold text-text-main">Select Customer for Quotation</h2>
          <p className="text-xs text-text-muted">
            The customer tier dynamically dictates standard discount ceilings and risk parameters.
          </p>
          <div>
            <label className="block text-sm font-semibold text-text-main mb-2">Customer Account</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-slate-50 border border-border-light rounded-lg p-3 text-text-main font-medium focus:border-primary focus:outline-none"
            >
              <option value="">-- Choose a Customer --</option>
              {customers?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customer_tier || 'Standard'} Tier - Max {discountRules?.tier_ceilings?.[c.customer_tier || 'Standard'] ?? 10}% Disc.)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              onClick={() => setIsCreatingNew(false)}
              className="px-4 py-2 border border-border-light rounded-lg text-text-main hover:bg-slate-50 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedCustomer) {
                  createMutation.mutate({ customer_id: selectedCustomer });
                }
              }}
              disabled={!selectedCustomer || createMutation.isPending}
              className="btn-primary disabled:opacity-50 text-sm font-semibold"
            >
              {createMutation.isPending ? 'Creating...' : 'Initialize Quotation'}
            </button>
          </div>
        </div>
      )}

      {/* 2. QUOTATION LIST VIEW */}
      {!activeQuotationId && !isCreatingNew && (
        <div className="space-y-4">
          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'NEGOTIATION', 'CONFIRMED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === st
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white border border-border-light text-text-muted hover:bg-slate-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-border-light rounded-lg text-sm text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-light">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Quotation #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border-light">
                  {loadingQuotes ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                        Loading quotations...
                      </td>
                    </tr>
                  ) : filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                        No quotations found. Click "+ New Quotation" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q: any) => (
                      <tr
                        key={q.id}
                        onClick={() => setActiveQuotationId(q.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-sm text-text-main">{q.quotation_number}</span>
                          <p className="text-xs text-text-muted mt-0.5">
                            {q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Recent'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                          {q.items?.length || 0} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-main">
                          ${parseFloat(q.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {q.risk_score > 0 ? (
                            <span className={`badge text-xs font-bold ${
                              parseFloat(q.risk_score) >= 0.6 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              Risk: {(parseFloat(q.risk_score) * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="badge bg-emerald-50 text-emerald-700 text-xs font-bold">Standard</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`badge text-xs font-semibold ${
                              q.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : q.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : q.status === 'DRAFT'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuotationId(q.id);
                            }}
                            className="text-primary hover:text-emerald-700 font-semibold text-xs"
                          >
                            Open Editor &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACTIVE QUOTATION BUILDER & EDITOR VIEW */}
      {activeQuotationId && activeQuotation && (
        <div className="space-y-6">
          {/* Dynamic Real-Time Discount Warning Banner */}
          {hasCeilingBreach && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 flex items-start gap-3 shadow-sm animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Discount Warning: Ceiling Exceeded ({highestDiscount}% Requested vs {tierCeiling}% Standard Ceiling)
                </h2>
                <p className="text-xs text-amber-800 mt-1">
                  Customer tier ({customerTier}) allows up to {tierCeiling}% standard discount.
                  Submitting this quotation will automatically escalate for Sales Manager and Finance multi-tier approval.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Items Table & Add Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Line Items Card */}
              <div className="card space-y-4">
                <div className="flex justify-between items-center border-b border-border-light pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-text-main">Line Items</h2>
                    <p className="text-xs text-text-muted">
                      Customer Tier: <span className="font-semibold text-text-main">{customerTier}</span> (Max discount without approval: {tierCeiling}%)
                    </p>
                  </div>
                  <span className="badge bg-slate-100 text-slate-800 font-mono text-xs">
                    Status: {activeQuotation.status}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border-light">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted">Disc %</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-text-muted">Total</th>
                        {activeQuotation.status === 'DRAFT' && (
                          <th className="px-4 py-2 text-center text-xs font-semibold text-text-muted">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {activeQuotation.items?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                            No items added yet. Choose a product below or click a quick upsell chip.
                          </td>
                        </tr>
                      ) : (
                        activeQuotation.items?.map((item: any, idx: number) => {
                          const isBreaching = parseFloat(item.discount_percent || 0) > tierCeiling;
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-semibold text-text-main">
                                <div>
                                  {products?.find((p: any) => p.id === item.product_id)?.name || item.product_id}
                                  {item.variant && (
                                    <span className="text-[11px] font-medium text-emerald-700 block bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-emerald-100">
                                      Variant: {item.variant}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setActiveCommentItem(item)}
                                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                                  >
                                    <MessageSquare className="w-3 h-3 text-primary" />
                                    {item.comments && item.comments.length > 0
                                      ? `${item.comments.length} comment(s)`
                                      : 'Line Q&A'}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-text-main font-medium">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-text-muted">${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`font-semibold ${isBreaching ? 'text-red-600' : 'text-text-main'}`}>
                                  {item.discount_percent}%
                                </span>
                                {isBreaching && (
                                  <span className="badge bg-red-50 text-red-700 text-[10px] ml-1.5">Over limit</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-text-main">
                                ${parseFloat(item.line_total || 0).toFixed(2)}
                              </td>
                              {activeQuotation.status === 'DRAFT' && (
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => deleteItemMutation.mutate({ id: activeQuotation.id, index: idx })}
                                    className="text-text-muted hover:text-red-600 transition-colors"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Item Form (Only for DRAFT) */}
              {activeQuotation.status === 'DRAFT' && (
                <div className="card space-y-4">
                  <h2 className="text-md font-bold text-text-main">Add Product to Quotation</h2>
                  <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-muted mb-1">Product</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => {
                          setSelectedProduct(e.target.value);
                          setSelectedVariant('');
                        }}
                        className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                      >
                        <option value="">-- Select Product --</option>
                        {products?.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${p.base_price})
                          </option>
                        ))}
                      </select>

                      {/* Variant dropdown if product has variants */}
                      {(() => {
                        const prod = products?.find((p: any) => p.id === selectedProduct);
                        if (!prod?.variants || prod.variants.length === 0) return null;
                        return (
                          <div className="mt-2">
                            <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                              Choose Variant (+ Price Surcharge)
                            </label>
                            <select
                              value={selectedVariant}
                              onChange={(e) => setSelectedVariant(e.target.value)}
                              className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg p-2 text-xs text-text-main focus:border-primary focus:outline-none"
                            >
                              <option value="">Standard Base Option (No surcharge)</option>
                              {prod.variants.map((v: any, vi: number) => (
                                <option key={vi} value={`${v.attribute}: ${v.value}`}>
                                  {v.attribute}: {v.value} (+${v.price_surcharge})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={itemDiscount}
                        onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={!selectedProduct || addItemMutation.isPending}
                        className="btn-primary flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Quick Upsell Suggestions Chips */}
              {activeQuotation.status === 'DRAFT' && upsellCatalog.length > 0 && (
                <div className="card space-y-3 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-text-main">Quick Upsell Suggestions</h2>
                  </div>
                  <p className="text-xs text-text-muted">Click any item to instantly append to quote:</p>
                  <div className="flex flex-wrap gap-2">
                    {upsellCatalog.map((prod: any) => (
                      <button
                        key={prod.id}
                        onClick={() => handleQuickAddUpsell(prod)}
                        className="px-3 py-1.5 bg-white border border-emerald-200 hover:border-primary hover:bg-emerald-50 rounded-lg text-xs font-semibold text-text-main flex items-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Plus className="w-3 h-3 text-primary" />
                        {prod.name} (+${prod.base_price})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Summary & Approval Actions */}
            <div className="space-y-6">
              <div className="card space-y-4">
                <h2 className="text-lg font-bold text-text-main flex items-center gap-2 pb-2 border-b border-border-light">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Financial Summary
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-semibold text-text-main">${parseFloat(activeQuotation.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Discount Savings</span>
                    <span className="font-semibold text-red-600">-${parseFloat(activeQuotation.discount_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Tax</span>
                    <span className="font-semibold text-text-main">${parseFloat(activeQuotation.tax_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border-light pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-text-main">Grand Total</span>
                    <span className="font-bold text-xl text-primary">${parseFloat(activeQuotation.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Risk score pill */}
                <div className="p-3 bg-slate-50 rounded-xl border border-border-light flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted">Blended Risk Score</span>
                  <span className={`badge text-xs font-bold ${
                    parseFloat(activeQuotation.risk_score || 0) >= 0.6
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {(parseFloat(activeQuotation.risk_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Action button */}
                {activeQuotation.status === 'DRAFT' ? (
                  <button
                    onClick={() => submitMutation.mutate(activeQuotation.id)}
                    disabled={submitMutation.isPending || (activeQuotation.items || []).length === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50 mt-4"
                  >
                    <Send className="w-4 h-4" />
                    {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Status: {activeQuotation.status}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      {activeQuotation.status === 'APPROVED'
                        ? 'Approved & Ready for Customer Acceptance'
                        : 'Currently in Review / Approval Queue'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Item Comment & Q&A Modal */}
      {activeCommentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-border-light">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h3 className="font-bold text-text-main text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Line Item Notes & Q&A
                </h3>
                <p className="text-xs text-text-muted">
                  {products?.find((p: any) => p.id === activeCommentItem.product_id)?.name || 'Line Item'}
                  {activeCommentItem.variant ? ` (${activeCommentItem.variant})` : ''}
                </p>
              </div>
              <button
                onClick={() => setActiveCommentItem(null)}
                className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="max-h-60 overflow-y-auto space-y-3 p-1">
              {(!activeCommentItem.comments || activeCommentItem.comments.length === 0) ? (
                <div className="text-center py-6 text-xs text-text-muted">
                  No questions or comments yet on this product line.
                </div>
              ) : (
                activeCommentItem.comments.map((cmt: any, ci: number) => (
                  <div
                    key={ci}
                    className={`p-3 rounded-lg text-xs ${
                      cmt.author_role === 'CUSTOMER'
                        ? 'bg-blue-50 border border-blue-100 ml-4'
                        : 'bg-emerald-50 border border-emerald-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className={cmt.author_role === 'CUSTOMER' ? 'text-blue-900' : 'text-emerald-900'}>
                        {cmt.author_name} ({cmt.author_role === 'CUSTOMER' ? 'Customer' : 'Sales Rep'})
                      </span>
                      <span className="text-[10px] text-text-muted font-normal">
                        {cmt.created_at ? new Date(cmt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-text-main leading-relaxed">{cmt.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input form */}
            <div className="pt-2 border-t border-border-light space-y-2">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Type clarification note, customer answer, or discount justification..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-border-light focus:outline-none focus:border-primary bg-slate-50 text-text-main resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCommentItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!newCommentText.trim() || addCommentMutation.isPending}
                  onClick={() => {
                    if (!activeQuotationId || !activeCommentItem) return;
                    addCommentMutation.mutate({
                      quoteId: activeQuotationId,
                      itemId: activeCommentItem.id,
                      payload: {
                        author_name: 'Sales Rep',
                        author_role: 'SALES_REP',
                        message: newCommentText.trim()
                      }
                    });
                  }}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {addCommentMutation.isPending ? 'Posting...' : 'Post Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
