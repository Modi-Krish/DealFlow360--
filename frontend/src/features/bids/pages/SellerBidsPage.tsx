import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBids, sellerBidAction, type Bid } from '../services/bidsApi';
import { useAuthStore } from '../../../shared/store/authStore';
import {
  Store,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  Send,
  XCircle,
  Package,
  MessageSquare,
  Loader2,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { downloadPdfFile, getBackendPdfUrl } from '../../../shared/utils/downloadPdf';

export const SellerBidsPage: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);

  // Counter form state
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [isFinalOffer, setIsFinalOffer] = useState<boolean>(false);
  const [sellerNote, setSellerNote] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Query bids
  const { data: bids, isLoading } = useQuery({
    queryKey: ['bids'],
    queryFn: () => getBids(),
    refetchInterval: 5000,
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: sellerBidAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setCounterPrice('');
      setSellerNote('');
      setIsFinalOffer(false);
      setShowRejectBox(false);
      setActionError(null);

      if (variables.payload.action === 'ACCEPT') {
        setActionSuccess(
          `Deal Agreed! Bill #${data.invoice_number || 'INV'} generated and Warehouse notified to deliver ${data.quantity} units!`
        );
      } else if (variables.payload.action === 'COUNTER') {
        setActionSuccess(
          variables.payload.is_final_offer
            ? `Final offer of $${variables.payload.counter_price}/unit sent to buyer.`
            : `Counter offer of $${variables.payload.counter_price}/unit sent to buyer.`
        );
      } else {
        setActionSuccess(`Bid #${data.bid_number} declined.`);
      }
      setTimeout(() => setActionSuccess(null), 6000);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to process seller action';
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ') : JSON.stringify(detail));
      setActionError(msg);
      setTimeout(() => setActionError(null), 8000);
    },
  });

  const allBids = bids || [];

  // Filter bids by seller if logged in as a specific seller
  const sellerBids = allBids.filter((b) => {
    if (user?.role === 'SELLER' || user?.role === 'SELLER_EMPLOYEE') {
      if (user.seller_id) {
        return b.seller_id === user.seller_id;
      }
    }
    return true; // Admin / Manager views all
  });

  // Filter by status tab
  const filteredBids = sellerBids.filter((b) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTION_REQUIRED')
      return b.status === 'PENDING_SELLER_REVIEW' || b.status === 'CUSTOMER_COUNTERED';
    if (filterStatus === 'AGREED') return b.status === 'AGREED';
    if (filterStatus === 'COUNTERED') return b.status === 'SELLER_COUNTERED';
    if (filterStatus === 'REJECTED') return b.status === 'REJECTED';
    return true;
  });

  const selectedBid = sellerBids.find((b) => b.id === selectedBidId) || filteredBids[0] || null;

  // Key metrics
  const pendingCount = sellerBids.filter(
    (b) => b.status === 'PENDING_SELLER_REVIEW' || b.status === 'CUSTOMER_COUNTERED'
  ).length;
  const agreedCount = sellerBids.filter((b) => b.status === 'AGREED').length;
  const agreedTotal = sellerBids
    .filter((b) => b.status === 'AGREED')
    .reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

  const handleAccept = (bid: Bid) => {
    if (
      confirm(
        `Accept customer's price of $${Number(bid.proposed_price).toLocaleString()}/unit for ${bid.quantity} units?\n\nThis will automatically:\n1. Generate an official Bill/Invoice\n2. Notify your warehouse to dispatch ${bid.quantity} units for delivery.`
      )
    ) {
      actionMutation.mutate({
        bidId: bid.id,
        payload: { action: 'ACCEPT' },
      });
    }
  };

  const handleCounter = (bid: Bid) => {
    const price = Number(counterPrice);
    if (!price || price <= 0) {
      alert('Please enter a valid counter price.');
      return;
    }

    actionMutation.mutate({
      bidId: bid.id,
      payload: {
        action: 'COUNTER',
        counter_price: price,
        is_final_offer: isFinalOffer,
        notes: sellerNote.trim() || undefined,
      },
    });
  };

  const handleReject = (bid: Bid) => {
    actionMutation.mutate({
      bidId: bid.id,
      payload: {
        action: 'REJECT',
        notes: rejectionReason.trim() || 'Seller declined offer.',
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Store className="w-3.5 h-3.5" /> Seller Deal Command Center
            </span>
            <span className="text-xs text-slate-400">
              {user?.company_name || 'Apex Global Hardware'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Inbound Bids & Deal Negotiations
          </h1>
          <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
            Review incoming purchase bids from B2B customers. Accept offers to trigger automatic bill
            generation and warehouse delivery dispatch, or propose a counter price with a final price option.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="bg-slate-800/80 border border-slate-700 p-3 px-4 rounded-xl text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
              Needs Review
            </span>
            <span className="text-2xl font-black text-white">{pendingCount}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-3 px-4 rounded-xl text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              Agreed Deals
            </span>
            <span className="text-2xl font-black text-white">{agreedCount}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-3 px-4 rounded-xl text-center min-w-[120px]">
            <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">
              Closed Value
            </span>
            <span className="text-lg font-black text-emerald-400">
              ${agreedTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-5 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 px-5 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium text-sm">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 p-1 rounded-md"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Bids List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filter Tabs */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'All Bids', count: sellerBids.length },
              { id: 'ACTION_REQUIRED', label: 'Action Required', count: pendingCount },
              { id: 'AGREED', label: 'Agreed Deals', count: agreedCount },
              { id: 'COUNTERED', label: 'Countered', count: sellerBids.filter((b) => b.status === 'SELLER_COUNTERED').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                  filterStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-70 text-[10px]">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Bids List */}
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs">Loading incoming bids...</p>
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No bids in this view</h4>
              <p className="text-xs text-slate-400 mt-1">
                New buyer purchase bids will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBids.map((bid) => {
                const isSelected = selectedBid?.id === bid.id;
                const isActionNeeded =
                  bid.status === 'PENDING_SELLER_REVIEW' || bid.status === 'CUSTOMER_COUNTERED';
                const isAgreed = bid.status === 'AGREED';

                return (
                  <div
                    key={bid.id}
                    onClick={() => {
                      setSelectedBidId(bid.id);
                      setCounterPrice(String(bid.seller_counter_price || bid.proposed_price || ''));
                      setShowRejectBox(false);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {bid.bid_number}
                      </span>

                      {/* Status Tag */}
                      {isAgreed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Agreed
                        </span>
                      ) : isActionNeeded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Action Required
                        </span>
                      ) : bid.status === 'SELLER_COUNTERED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          Countered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          {bid.status}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {bid.product_name}
                    </h4>

                    <div className="text-xs text-slate-600 mt-1 flex items-center justify-between">
                      <span>
                        Buyer: <strong className="text-slate-800">{bid.customer_name}</strong>
                      </span>
                      <span className="font-semibold text-slate-700">
                        Qty: {bid.quantity} units
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Proposed Price
                        </span>
                        <span className="font-extrabold text-slate-900">
                          ${Number(bid.proposed_price).toLocaleString()} /unit
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Total Value
                        </span>
                        <span className="font-extrabold text-emerald-600">
                          ${Number(bid.total_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Negotiation Console (7 cols) */}
        <div className="lg:col-span-7">
          {selectedBid ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden space-y-0">
              {/* Console Header */}
              <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                      {selectedBid.bid_number}
                    </span>
                    <span className="text-xs text-slate-300">
                      Product: <strong>{selectedBid.product_name}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Deal Negotiation Console</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Buyer: {selectedBid.customer_name} ({selectedBid.customer_email})
                  </p>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Deal Amount
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    ${Number(selectedBid.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Delivery & Quantity Card */}
              <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                    Requested Quantity
                  </span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {selectedBid.quantity} units
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ✓ Stock available for delivery
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                    List vs Proposed
                  </span>
                  <div className="mt-0.5">
                    <span className="text-slate-400 line-through mr-1">
                      ${Number(selectedBid.original_price).toLocaleString()}
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      ${Number(selectedBid.proposed_price).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Difference: -$
                    {(
                      Number(selectedBid.original_price) - Number(selectedBid.proposed_price)
                    ).toLocaleString()}{' '}
                    /unit
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                    Delivery Address
                  </span>
                  <p className="text-slate-800 font-medium mt-0.5 leading-snug">
                    {selectedBid.delivery_address || '450 Innovation Blvd, Austin, TX 78701'}
                  </p>
                </div>
              </div>

              {/* Agreed Deal Status Banner */}
              {selectedBid.status === 'AGREED' && (
                <div className="p-5 bg-emerald-50 border-b border-emerald-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Deal Agreed at ${Number(selectedBid.final_agreed_price).toLocaleString()} /unit!
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    The agreed amount of{' '}
                    <strong>${Number(selectedBid.total_amount).toLocaleString()}</strong> was
                    automatically converted into an official Bill and sent to your warehouse dispatch
                    queue.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href={getBackendPdfUrl(`/bids/${selectedBid.id}/pdf`)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        downloadPdfFile(`/bids/${selectedBid.id}/pdf`, `Proposal_${selectedBid.bid_number}.pdf`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
                      title="Download Official Proposal PDF"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>PDF Proposal</span>
                    </a>

                    {(selectedBid.invoice_id || selectedBid.invoice_number) && (
                      <a
                        href={getBackendPdfUrl(selectedBid.invoice_id ? `/billing/invoices/${selectedBid.invoice_id}/pdf` : `/bids/${selectedBid.id}/invoice-pdf`)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          const target = selectedBid.invoice_id ? `/billing/invoices/${selectedBid.invoice_id}/pdf` : `/bids/${selectedBid.id}/invoice-pdf`;
                          downloadPdfFile(target, `Bill_${selectedBid.invoice_number || selectedBid.bid_number}.pdf`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
                        title="Download Official PDF Bill"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>PDF Bill (#{selectedBid.invoice_number})</span>
                      </a>
                    )}
                    {selectedBid.fulfillment_number && (
                      <Link
                        to={
                          location.pathname.startsWith('/seller')
                            ? `/seller/warehouse?search=${selectedBid.fulfillment_number}`
                            : `/sales/warehouse?search=${selectedBid.fulfillment_number}`
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                        <span>View Warehouse Dispatch #{selectedBid.fulfillment_number}</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div className="p-5 border-b border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  Negotiation Dialogue Thread ({selectedBid.history?.length || 0})
                </h4>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
                  {selectedBid.history?.map((h, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-xs ${
                        h.actor_role === 'SELLER'
                          ? 'bg-blue-50/80 border-blue-200 text-blue-950 ml-6'
                          : 'bg-slate-50 border-slate-200 text-slate-900 mr-6'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold flex items-center gap-1.5">
                          {h.actor_role === 'SELLER' ? '🏪 You (Seller):' : '🛒 Buyer:'} {h.actor_name}
                          <span className="font-semibold text-slate-500">
                            [{h.action} @ ${Number(h.price).toLocaleString()}/unit]
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700">{h.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seller Action Terminal (Active when not Agreed/Rejected) */}
              {selectedBid.status !== 'AGREED' && selectedBid.status !== 'REJECTED' && (
                <div className="p-6 bg-slate-50/60 space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Take Action on Bid #{selectedBid.bid_number}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Buyer offered: <strong>${Number(selectedBid.proposed_price).toLocaleString()}</strong>
                    </span>
                  </div>

                  {/* Accept Option (Option 1) */}
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Option 1: Agree to Buyer's Price (${Number(selectedBid.proposed_price).toLocaleString()}/unit)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically generates Bill/Invoice for $
                        {(Number(selectedBid.proposed_price) * selectedBid.quantity).toLocaleString()}{' '}
                        and dispatches notification to warehouse to prepare {selectedBid.quantity} units.
                      </p>
                    </div>
                    <button
                      onClick={() => handleAccept(selectedBid)}
                      disabled={actionMutation.isPending}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {actionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      )}
                      <span>Accept & Generate Bill</span>
                    </button>
                  </div>

                  {/* Counter Offer Option (Option 2) */}
                  <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs space-y-4">
                    <div className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Option 2: Propose Counter Price (or Last Price)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Counter Price ($/unit) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            placeholder="e.g. 1050.00"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Calculated Total Deal
                        </label>
                        <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-black text-slate-900">
                          ${(Number(counterPrice || 0) * selectedBid.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Final Offer Toggle Checkbox */}
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="finalOfferCheck"
                        checked={isFinalOffer}
                        onChange={(e) => setIsFinalOffer(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="finalOfferCheck" className="text-xs text-amber-900 cursor-pointer">
                        <strong className="block font-bold">
                          Mark as Final Price (Last Offer - Take it or leave it)
                        </strong>
                        If checked, the customer will only have the option to <strong>Accept</strong> or{' '}
                        <strong>Cancel</strong>. Further counter-proposals from the buyer will be disabled.
                      </label>
                    </div>

                    {/* Counter Note */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Message Note to Buyer
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. We can do $1,050/unit for immediate delivery from our central depot."
                        value={sellerNote}
                        onChange={(e) => setSellerNote(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => handleCounter(selectedBid)}
                      disabled={actionMutation.isPending || !counterPrice}
                      className="btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      {actionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>
                        {isFinalOffer
                          ? 'Send Final Offer (Last Price)'
                          : 'Send Counter Proposal to Buyer'}
                      </span>
                    </button>
                  </div>

                  {/* Reject Option */}
                  <div className="pt-2 flex justify-between items-center text-xs">
                    {!showRejectBox ? (
                      <button
                        onClick={() => setShowRejectBox(true)}
                        className="text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
                      >
                        Decline this bid offer...
                      </button>
                    ) : (
                      <div className="w-full p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                        <label className="block text-xs font-bold text-red-900">
                          Decline Reason Note
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Price too low for requested volume."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-xs bg-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(selectedBid)}
                            className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-xs"
                          >
                            Confirm Decline
                          </button>
                          <button
                            onClick={() => setShowRejectBox(false)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Select a bid to begin negotiation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
