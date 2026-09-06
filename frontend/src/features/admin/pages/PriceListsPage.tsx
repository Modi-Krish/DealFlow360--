import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPriceLists, getProducts, createPriceList, addPriceListItem } from '../services/adminApi';
import {
  Plus,
  Search,
  X,
  Loader2,
  Package,
  Tag,
  DollarSign,
  Calendar,
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface PriceListItem {
  product_name?: string;
  product_id?: string;
  custom_price: number | string;
}

interface PriceList {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  seller_id?: string;
  customer_tier?: string;
  items?: PriceListItem[];
}

const formatPrice = (val: number | string, currency = 'USD') => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'No expiration';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const PriceListsPage = () => {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Add Item to Price List state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemCustomPrice, setItemCustomPrice] = useState('');
  const [itemActionMsg, setItemActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Price List form state
  const [newListName, setNewListName] = useState('');
  const [newListCurrency, setNewListCurrency] = useState('USD');
  const [newListIsActive, setNewListIsActive] = useState(true);
  const [newListValidFrom, setNewListValidFrom] = useState('');
  const [newListValidUntil, setNewListValidUntil] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: priceLists, isLoading, isError } = useQuery<PriceList[]>({
    queryKey: ['priceLists'],
    queryFn: getPriceLists,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: isCreateModalOpen || !!selectedList,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createPriceList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      setCreateSuccessMsg('Price list created successfully!');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccessMsg(null);
        setNewListName('');
        setNewListValidFrom('');
        setNewListValidUntil('');
      }, 1200);
    },
    onError: (err: any) => {
      setCreateErrorMsg(err?.response?.data?.detail || 'Failed to create price list');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ priceListId, payload }: { priceListId: string; payload: { product_id: string; custom_price: number } }) =>
      addPriceListItem(priceListId, payload),
    onSuccess: (updatedList) => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      setSelectedList(updatedList);
      setSelectedProductId('');
      setItemCustomPrice('');
      setIsAddingItem(false);
      setItemActionMsg({ type: 'success', text: 'Product price added successfully!' });
      setTimeout(() => setItemActionMsg(null), 3000);
    },
    onError: (err: any) => {
      setItemActionMsg({
        type: 'error',
        text: err?.response?.data?.detail || 'Failed to add product price',
      });
    },
  });

  // Calculate pricing statistics helper
  const getStats = (items?: PriceListItem[]) => {
    if (!items || items.length === 0) {
      return { count: 0, min: null, max: null, avg: null };
    }
    const nums = items
      .map((i) => (typeof i.custom_price === 'string' ? parseFloat(i.custom_price) : i.custom_price))
      .filter((p) => !isNaN(p) && p !== null && p !== undefined);

    if (nums.length === 0) {
      return { count: items.length, min: null, max: null, avg: null };
    }

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;

    return { count: items.length, min, max, avg };
  };

  // Filtered price lists
  const filteredLists = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter((list) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        list.name?.toLowerCase().includes(term) ||
        list.currency?.toLowerCase().includes(term) ||
        list.items?.some((i) => i.product_name?.toLowerCase().includes(term));

      const matchesCurrency = currencyFilter === 'ALL' || list.currency === currencyFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && list.is_active) ||
        (statusFilter === 'INACTIVE' && !list.is_active);

      return matchesSearch && matchesCurrency && matchesStatus;
    });
  }, [priceLists, searchTerm, currencyFilter, statusFilter]);

  // Currencies list for filters
  const availableCurrencies = useMemo(() => {
    if (!priceLists) return [];
    const set = new Set(priceLists.map((p) => p.currency).filter(Boolean));
    return Array.from(set);
  }, [priceLists]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrorMsg(null);
    if (!newListName.trim()) {
      setCreateErrorMsg('Price list name is required');
      return;
    }

    createMutation.mutate({
      name: newListName.trim(),
      currency: newListCurrency,
      is_active: newListIsActive,
      valid_from: newListValidFrom ? new Date(newListValidFrom).toISOString() : undefined,
      valid_until: newListValidUntil ? new Date(newListValidUntil).toISOString() : undefined,
    });
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !selectedProductId || !itemCustomPrice) return;
    const priceNum = parseFloat(itemCustomPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setItemActionMsg({ type: 'error', text: 'Please enter a valid price amount' });
      return;
    }

    addItemMutation.mutate({
      priceListId: selectedList.id,
      payload: {
        product_id: selectedProductId,
        custom_price: priceNum,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-primary" />
            Price Lists & Custom Pricing
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Configure tiered pricing catalogs, custom product price points, and contract rate cards
          </p>
        </div>
        <button
          onClick={() => {
            setCreateErrorMsg(null);
            setCreateSuccessMsg(null);
            setNewListName('');
            setIsCreateModalOpen(true);
          }}
          className="btn-primary flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Price List
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="card p-4 shadow-sm border border-border-light bg-surface-card flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-muted" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search price lists by name, currency, or product..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-900 text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Currency:</span>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Currencies</option>
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <div className="text-xs font-medium text-text-muted pl-2 border-l border-border-light">
            {filteredLists.length} {filteredLists.length === 1 ? 'list' : 'lists'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-muted space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading price lists...</p>
          </div>
        ) : isError ? (
          <div className="col-span-full text-center py-12 text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl">
            Failed to load price lists. Please try refreshing the page.
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-surface-card border border-border-light rounded-xl space-y-3">
            <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-text-main">No price lists found</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              {searchTerm || currencyFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'No price lists configured yet. Click "Create Price List" to get started.'}
            </p>
          </div>
        ) : (
          filteredLists.map((list) => {
            const stats = getStats(list.items);
            const hasItems = stats.count > 0 && stats.min !== null;

            return (
              <div
                key={list.id}
                onClick={() => setSelectedList(list)}
                className="card p-5 hover:border-primary/60 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between border border-border-light bg-surface-card rounded-xl relative overflow-hidden"
              >
                {/* Accent Top Border Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
                    list.is_active ? 'bg-primary group-hover:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />

                {/* Top Details & Badges */}
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base font-bold text-text-main group-hover:text-primary transition-colors truncate"
                        title={list.name}
                      >
                        {list.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {list.valid_from ? formatDate(list.valid_from) : 'Immediate'}
                          {list.valid_until ? ` → ${formatDate(list.valid_until)}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-light">
                        {list.currency}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                          list.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${list.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        />
                        {list.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* PROMINENT PRICE HIGHLIGHT SECTION */}
                  <div className="my-3.5 p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                    <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Price Range
                      </span>
                      {hasItems && stats.avg !== null && (
                        <span className="text-[11px] font-normal text-text-muted">
                          Avg: {formatPrice(stats.avg, list.currency)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      {hasItems && stats.min !== null && stats.max !== null ? (
                        stats.min === stats.max ? (
                          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatPrice(stats.min, list.currency)}
                          </div>
                        ) : (
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1.5">
                            <span>{formatPrice(stats.min, list.currency)}</span>
                            <span className="text-xs text-text-muted font-normal">–</span>
                            <span>{formatPrice(stats.max, list.currency)}</span>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-text-muted italic">No custom prices defined</span>
                      )}

                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-card border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {list.items?.length || 0} Products
                      </span>
                    </div>
                  </div>

                  {/* PRODUCT ITEMS WITH PRICES LIST */}
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                      <span>Item Prices</span>
                      <span className="text-[10px] font-normal lowercase">custom unit rate</span>
                    </div>

                    {list.items && list.items.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {list.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-border-light/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium text-text-main truncate" title={item.product_name}>
                                {item.product_name || `Product #${idx + 1}`}
                              </span>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 shrink-0">
                              {formatPrice(item.custom_price, list.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted italic py-2 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-border-light">
                        No products added to this price list
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-3.5 mt-3.5 border-t border-border-light flex items-center justify-between text-xs">
                  <div className="text-text-muted">
                    Tier: <span className="text-text-main font-medium">{list.customer_tier || 'All Customers'}</span>
                  </div>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                    View Details & Prices
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAILS & PRICING MODAL */}
      {selectedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card border border-border-light rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border-light flex justify-between items-start bg-slate-50/60 dark:bg-slate-900/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                      selectedList.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedList.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {selectedList.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-light">
                    {selectedList.currency}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-text-main">{selectedList.name}</h3>
                <p className="text-xs text-text-muted">
                  Validity Period: {formatDate(selectedList.valid_from)} — {formatDate(selectedList.valid_until)}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedList(null);
                  setIsAddingItem(false);
                  setItemActionMsg(null);
                }}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Stats Overview */}
            {(() => {
              const stats = getStats(selectedList.items);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-2">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border-light text-center">
                    <div className="text-xs text-text-muted font-medium">Total Items</div>
                    <div className="text-lg font-bold text-text-main mt-0.5">{stats.count} Products</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-center">
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Min Price</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {stats.min !== null ? formatPrice(stats.min, selectedList.currency) : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-center">
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Max Price</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {stats.max !== null ? formatPrice(stats.max, selectedList.currency) : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 text-center">
                    <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">Avg Price</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {stats.avg !== null ? formatPrice(stats.avg, selectedList.currency) : '—'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Notification message inside modal */}
            {itemActionMsg && (
              <div
                className={`mx-6 mt-3 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  itemActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {itemActionMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{itemActionMsg.text}</span>
              </div>
            )}

            {/* Modal Body / Items Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
                  <input
                    type="text"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    placeholder="Filter products in this list..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingItem ? 'Cancel' : 'Add Product Price'}
                </button>
              </div>

              {/* Add Item Inline Form */}
              {isAddingItem && (
                <form
                  onSubmit={handleAddItemSubmit}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in duration-200"
                >
                  <div className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-primary" />
                    Add Product & Custom Price to this Rate Card
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-muted mb-1">Select Product</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        required
                        className="w-full text-xs p-2 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Choose a Product --</option>
                        {products?.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.base_price ? `(Base: $${p.base_price})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-muted mb-1">
                        Custom Price ({selectedList.currency})
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-2.5 top-2 text-text-muted" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 1250.00"
                          value={itemCustomPrice}
                          onChange={(e) => setItemCustomPrice(e.target.value)}
                          required
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingItem(false)}
                      className="px-3 py-1 text-xs rounded-lg border border-border-light text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addItemMutation.isPending}
                      className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                    >
                      {addItemMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Price
                    </button>
                  </div>
                </form>
              )}

              {/* Items Table */}
              <div className="border border-border-light rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-border-light text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 font-semibold text-text-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left">#</th>
                      <th className="px-4 py-2.5 text-left">Product Name</th>
                      <th className="px-4 py-2.5 text-left">Product ID</th>
                      <th className="px-4 py-2.5 text-right">Custom Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light bg-white dark:bg-slate-900">
                    {selectedList.items && selectedList.items.length > 0 ? (
                      selectedList.items
                        .filter(
                          (item) =>
                            !modalSearchTerm ||
                            item.product_name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                            item.product_id?.toLowerCase().includes(modalSearchTerm.toLowerCase())
                        )
                        .map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5 text-text-muted">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-text-main flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{item.product_name || `Product ${idx + 1}`}</span>
                            </td>
                            <td className="px-4 py-2.5 text-text-muted font-mono text-[11px]">
                              {item.product_id || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                {formatPrice(item.custom_price, selectedList.currency)}
                              </span>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-text-muted italic">
                          No items have been assigned custom prices in this price list.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-light bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => {
                  setSelectedList(null);
                  setIsAddingItem(false);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRICE LIST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card border border-border-light rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-light flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/60">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Create New Price List
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createErrorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createErrorMsg}</span>
                </div>
              )}

              {createSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Price List Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Enterprise VIP Rate Card 2026"
                  className="w-full text-xs p-2.5 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Currency</label>
                  <select
                    value={newListCurrency}
                    onChange={(e) => setNewListCurrency(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Initial Status</label>
                  <select
                    value={newListIsActive ? 'true' : 'false'}
                    onChange={(e) => setNewListIsActive(e.target.value === 'true')}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Valid From</label>
                  <input
                    type="date"
                    value={newListValidFrom}
                    onChange={(e) => setNewListValidFrom(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Valid Until</label>
                  <input
                    type="date"
                    value={newListValidUntil}
                    onChange={(e) => setNewListValidUntil(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border-light bg-white dark:bg-slate-900 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border-light flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Price List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
