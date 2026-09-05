import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts } from '../../admin/services/adminApi';
import { getBids, createBid, customerBidAction, type Bid } from '../services/bidsApi';
import {
  ShoppingBag,
  Tag,
  Store,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Search,
  FileText,
  Truck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
} from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'catalog' | 'bids'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<string>('ALL');

  // Bid Modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [bidQuantity, setBidQuantity] = useState<number>(5);
  const [proposedPrice, setProposedPrice] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    '100 Enterprise Way, Suite 400, Chicago, IL 60601'
  );
  const [notes, setNotes] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // Customer Counter modal state
  const [counteringBidId, setCounteringBidId] = useState<string | null>(null);
  const [newProposedPrice, setNewProposedPrice] = useState<string>('');
  const [counterNotes, setCounterNotes] = useState<string>('');

  // Expand history for bids
  const [expandedBidIds, setExpandedBidIds] = useState<Record<string, boolean>>({});

  // Query products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['marketplaceProducts'],
    queryFn: () => getProducts(),
  });

  // Query bids
  const { data: bids, isLoading: loadingBids } = useQuery({
    queryKey: ['bids'],
    queryFn: () => getBids(),
    refetchInterval: 5000,
  });

  // Mutation: Place new bid
  const createBidMutation = useMutation({
    mutationFn: createBid,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      setSelectedProduct(null);
      setBidSuccess(`Bid ${data.bid_number} submitted to ${data.seller_name}!`);
      setActiveTab('bids');
      setTimeout(() => setBidSuccess(null), 5000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to place bid.';
      setBidError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  // Mutation: Customer action (Accept counter, counter again, cancel)
  const customerActionMutation = useMutation({
    mutationFn: customerBidAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setCounteringBidId(null);
      setNewProposedPrice('');
      setCounterNotes('');
      if (variables.payload.action === 'ACCEPT') {
        setBidSuccess(
          `Deal Agreed! Bill #${data.invoice_number || 'INV'} generated and Warehouse notified for delivery of ${data.quantity} units!`
        );
      } else if (variables.payload.action === 'COUNTER') {
        setBidSuccess(`Counter offer submitted to seller!`);
      } else {
        setBidSuccess('Bid withdrawn.');
      }
      setTimeout(() => setBidSuccess(null), 6000);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || 'Action failed');
    },
  });

  const handleOpenBidModal = (product: any) => {
    setSelectedProduct(product);
    setBidQuantity(Math.min(5, product.stock_quantity || 5));
    // Default proposed price: 10% discount from base price
    const base = Number(product.base_price || 0);
    const suggested = Math.round(base * 0.9);
    setProposedPrice(suggested.toString());
    setBidError(null);
  };

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const price = Number(proposedPrice);
    if (!price || price <= 0) {
      setBidError('Please specify a valid bid price per unit.');
      return;
    }
    if (bidQuantity <= 0) {
      setBidError('Quantity must be at least 1.');
      return;
    }

    createBidMutation.mutate({
      product_id: selectedProduct.id,
      quantity: bidQuantity,
      proposed_price: price,
      delivery_address: deliveryAddress,
      notes: notes.trim() || undefined,
    });
  };

  const toggleHistory = (bidId: string) => {
    setExpandedBidIds((prev) => ({ ...prev, [bidId]: !prev[bidId] }));
  };

  // Filter sellers
  const uniqueSellers: string[] = Array.from(
    new Set<string>((products || []).map((p: any) => String(p.seller_name || 'Verified Seller')))
  );

  const filteredProducts = (products || []).filter((prod: any) => {
    const matchesSearch =
      prod.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeller =
      selectedSeller === 'ALL' || (prod.seller_name || 'Verified Seller') === selectedSeller;
    return matchesSearch && matchesSeller;
  });

  // Customer's bids
  const customerBids = bids || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> Multi-Seller Marketplace
              </span>
              <span className="text-xs text-slate-400">Direct B2B Negotiation Protocol</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Marketplace & Deal Bidding
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
              Browse products from verified sellers, place custom volume bids, negotiate prices in real-time,
              and trigger instant bill generation with warehouse delivery dispatch upon agreement.
            </p>
          </div>

          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Catalog</span>
              <span className="ml-1 bg-slate-900/40 px-2 py-0.5 rounded-full text-xs">
                {products?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bids')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'bids'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>My Negotiations</span>
              {customerBids.length > 0 && (
                <span className="ml-1 bg-emerald-700/40 text-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold">
                  {customerBids.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {bidSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-5 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm">{bidSuccess}</span>
          </div>
          <button
            onClick={() => setBidSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Product Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by title, category, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Filter Seller:
              </span>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="ALL">All Verified Sellers</option>
                {uniqueSellers.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loadingProducts ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Loading seller catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card text-center py-16 bg-white border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No products match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search keywords or seller filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product: any) => {
                const stock = product.stock_quantity ?? 100;
                const inStock = stock > 0;
                const basePrice = Number(product.base_price || 0);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Card Header & Badges */}
                    <div className="p-5 border-b border-slate-100 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Store className="w-3 h-3" />
                          {product.seller_name || 'Verified Seller'}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            inStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}
                        >
                          {inStock ? `${stock} in stock` : 'Out of stock'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {product.name}
                      </h3>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {product.sku && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">
                            {product.sku}
                          </span>
                        )}
                        {product.category?.name && (
                          <span>• {product.category.name}</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                        {product.description || 'Enterprise grade product backed by seller warranty and priority delivery.'}
                      </p>
                    </div>

                    {/* Card Footer with Price & Bid Action */}
                    <div className="p-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] uppercase font-semibold text-slate-400 block tracking-wider">
                          List Price
                        </span>
                        <div className="text-xl font-extrabold text-slate-900">
                          ${basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-normal text-slate-500 ml-1">/{product.unit || 'unit'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenBidModal(product)}
                        disabled={!inStock}
                        className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Place Bid</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customer Bids & Negotiations */}
      {activeTab === 'bids' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Bids & Negotiations</h2>
              <p className="text-xs text-slate-500">
                Track seller responses, counter offers, agreed bills, and delivery dispatches.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total {customerBids.length} deal negotiations tracked
            </div>
          </div>

          {loadingBids ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Loading active negotiations...</p>
            </div>
          ) : customerBids.length === 0 ? (
            <div className="card text-center py-16 bg-white border border-slate-200">
              <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No active bids yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Explore the catalog tab to place custom volume bids directly to sellers.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="btn-primary mt-4 text-xs inline-flex items-center gap-2"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {customerBids.map((bid: Bid) => {
                const isCountered = bid.status === 'SELLER_COUNTERED';
                const isAgreed = bid.status === 'AGREED';
                const isPending = bid.status === 'PENDING_SELLER_REVIEW';
                const isFinal = bid.is_final_offer;
                const isExpanded = !!expandedBidIds[bid.id];

                return (
                  <div
                    key={bid.id}
                    className={`bg-white rounded-xl border transition-all overflow-hidden ${
                      isAgreed
                        ? 'border-emerald-300 ring-1 ring-emerald-500/10 shadow-sm'
                        : isCountered
                        ? 'border-blue-300 ring-1 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Bid Header */}
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                            {bid.bid_number}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            Sold by <strong className="text-slate-800">{bid.seller_name}</strong>
                          </span>
                          {/* Status Badge */}
                          {isAgreed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              DEAL AGREED
                            </span>
                          ) : isCountered ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isFinal
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {isFinal ? "SELLER'S FINAL OFFER (LAST PRICE)" : 'SELLER COUNTERED'}
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Pending Seller Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {bid.status}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{bid.product_name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quantity: <strong className="text-slate-800">{bid.quantity} units</strong> •
                          Delivery to: <span className="text-slate-700">{bid.delivery_address || 'Provided address'}</span>
                        </p>
                      </div>

                      {/* Pricing Summary */}
                      <div className="flex flex-wrap items-center gap-6 self-start lg:self-auto bg-white p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            List Price
                          </span>
                          <span className="text-xs text-slate-500 line-through">
                            ${Number(bid.original_price).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Your Bid Price
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            ${Number(bid.proposed_price).toLocaleString()} /unit
                          </span>
                        </div>

                        {bid.seller_counter_price && (
                          <div className="border-l border-slate-200 pl-4">
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">
                              Seller Counter
                            </span>
                            <span className="text-base font-extrabold text-blue-700">
                              ${Number(bid.seller_counter_price).toLocaleString()} /unit
                            </span>
                          </div>
                        )}

                        <div className="border-l border-slate-200 pl-4">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Total Deal Value
                          </span>
                          <span className="text-base font-extrabold text-emerald-600">
                            ${Number(bid.total_amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Agreed Status Banner: Shows Generated Bill & Warehouse Dispatch notice */}
                    {isAgreed && (
                      <div className="p-4 bg-emerald-50/70 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Deal Closed at ${Number(bid.final_agreed_price).toLocaleString()}/unit</span>
                          </div>
                          <p className="text-xs text-emerald-800">
                            The agreed total of <strong>${Number(bid.total_amount).toLocaleString()}</strong> was
                            automatically invoiced and the seller warehouse was notified to dispatch{' '}
                            <strong>{bid.quantity} units</strong>.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {bid.invoice_number && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs">
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Bill #{bid.invoice_number}</span>
                            </div>
                          )}
                          {bid.fulfillment_number && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Dispatch #{bid.fulfillment_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Bar for Customer when Countered */}
                    {isCountered && (
                      <div className="p-4 bg-blue-50/60 border-b border-blue-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            <span>
                              Seller responded with counter offer of{' '}
                              <strong className="text-blue-700">
                                ${Number(bid.seller_counter_price).toLocaleString()} /unit
                              </strong>
                            </span>
                          </div>
                          <p className="text-xs text-blue-800">
                            {isFinal
                              ? '⚠️ Seller designated this as their FINAL OFFER (Last Price). Further counters are disabled.'
                              : 'You can accept the seller price, submit another counter proposal, or withdraw.'}
                          </p>
                        </div>

                        {/* Customer Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              customerActionMutation.mutate({
                                bidId: bid.id,
                                payload: { action: 'ACCEPT' },
                              })
                            }
                            disabled={customerActionMutation.isPending}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Seller's Price (${Number(bid.seller_counter_price).toLocaleString()})</span>
                          </button>

                          {!isFinal && (
                            <button
                              onClick={() => {
                                setCounteringBidId(bid.id);
                                setNewProposedPrice(String(bid.proposed_price || ''));
                              }}
                              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors shadow-xs"
                            >
                              Make Counter Offer
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to withdraw this bid?')) {
                                customerActionMutation.mutate({
                                  bidId: bid.id,
                                  payload: { action: 'CANCEL' },
                                });
                              }
                            }}
                            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Withdraw Bid
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expandable Counter Input Box */}
                    {counteringBidId === bid.id && (
                      <div className="p-4 bg-slate-50 border-b border-slate-200 animate-in fade-in">
                        <div className="max-w-xl space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Propose New Counter Price to {bid.seller_name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-600 block mb-1 font-medium">
                                Counter Price ($/unit)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={newProposedPrice}
                                  onChange={(e) => setNewProposedPrice(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-slate-600 block mb-1 font-medium">
                                New Total Value
                              </label>
                              <div className="py-1.5 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-800">
                                ${(Number(newProposedPrice || 0) * bid.quantity).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-1 font-medium">
                              Message Note (Optional)
                            </label>
                            <input
                              type="text"
                              value={counterNotes}
                              onChange={(e) => setCounterNotes(e.target.value)}
                              placeholder="e.g. We can do $990 if you include priority shipping..."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const p = Number(newProposedPrice);
                                if (!p || p <= 0) return alert('Enter a valid price');
                                customerActionMutation.mutate({
                                  bidId: bid.id,
                                  payload: { action: 'COUNTER', proposed_price: p, notes: counterNotes },
                                });
                              }}
                              disabled={customerActionMutation.isPending}
                              className="btn-primary text-xs py-1.5 px-4"
                            >
                              Send Counter Offer
                            </button>
                            <button
                              onClick={() => setCounteringBidId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* History Collapsible */}
                    <div className="p-3 px-5 flex items-center justify-between text-xs text-slate-500 bg-white">
                      <button
                        onClick={() => toggleHistory(bid.id)}
                        className="flex items-center gap-1 font-medium text-slate-700 hover:text-emerald-600 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Negotiation History ({bid.history?.length || 0} messages)</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-400">
                        Created {bid.created_at ? new Date(bid.created_at).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>

                    {/* History Feed */}
                    {isExpanded && (
                      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
                        {bid.history?.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs ${
                              item.actor_role === 'CUSTOMER'
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 ml-4'
                                : 'bg-white border-slate-200 text-slate-900 mr-4'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold flex items-center gap-1.5">
                                {item.actor_role === 'CUSTOMER' ? '🛒 Buyer:' : '🏪 Seller:'} {item.actor_name}
                                <span className="font-semibold text-slate-500">
                                  [{item.action} at ${Number(item.price).toLocaleString()}/unit]
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-700 mt-0.5">{item.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Place Bid on Product */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Place Custom Volume Bid</h3>
                  <p className="text-xs text-slate-400">Direct offer to verified seller</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBidSubmit} className="p-6 space-y-4">
              {bidError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bidError}</span>
                </div>
              )}

              {/* Product Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Seller: <strong className="text-slate-800">{selectedProduct.seller_name || 'Verified Seller'}</strong>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedProduct.name}</h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    List Price: ${Number(selectedProduct.base_price).toLocaleString()} • In Stock:{' '}
                    {selectedProduct.stock_quantity ?? 100}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Base Unit</span>
                  <span className="text-sm font-bold text-slate-700">{selectedProduct.unit || 'unit'}</span>
                </div>
              </div>

              {/* Quantity & Proposed Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Order Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock_quantity || 500}
                    required
                    value={bidQuantity}
                    onChange={(e) => setBidQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Available: {selectedProduct.stock_quantity || 100}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Your Bid Price ($/unit) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="0.00"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setProposedPrice(String(Math.round(Number(selectedProduct.base_price) * 0.95)))
                      }
                      className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium"
                    >
                      -5%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProposedPrice(String(Math.round(Number(selectedProduct.base_price) * 0.9)))
                      }
                      className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium"
                    >
                      -10%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProposedPrice(String(Math.round(Number(selectedProduct.base_price) * 0.85)))
                      }
                      className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium"
                    >
                      -15%
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Deal Calculation Box */}
              {proposedPrice && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex justify-between items-center text-slate-600 mb-1">
                    <span>List Total ({bidQuantity} units):</span>
                    <span>${(Number(selectedProduct.base_price) * bidQuantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 font-bold text-sm">
                    <span>Your Proposed Total:</span>
                    <span>${(Number(proposedPrice) * bidQuantity).toLocaleString()}</span>
                  </div>
                  {Number(proposedPrice) < Number(selectedProduct.base_price) && (
                    <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Requesting $
                        {(
                          (Number(selectedProduct.base_price) - Number(proposedPrice)) *
                          bidQuantity
                        ).toLocaleString()}{' '}
                        savings (
                        {(
                          ((Number(selectedProduct.base_price) - Number(proposedPrice)) /
                            Number(selectedProduct.base_price)) *
                          100
                        ).toFixed(1)}
                        % off)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Destination Delivery Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Enterprise Way, Suite 400, Chicago, IL"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Note to Seller (Terms & Urgency)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bulk purchase for upcoming deployment. Looking for rapid shipment."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBidMutation.isPending}
                  className="btn-primary text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {createBidMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{createBidMutation.isPending ? 'Sending Offer...' : 'Submit Bid to Seller'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
