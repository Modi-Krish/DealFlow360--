import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../admin/services/adminApi';
import { Package, Search, AlertTriangle, CheckCircle2, XCircle, Boxes, Layers, RefreshCw } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventoryProducts'],
    queryFn: () => getProducts(),
    staleTime: 10000,
  });

  const productList = Array.isArray(products) ? products : [];

  const filteredProducts = productList.filter((p: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(term));

    const stock = Number(p.stock_quantity ?? 0);
    let matchesStatus = true;
    if (statusFilter === 'IN_STOCK') {
      matchesStatus = stock >= 20;
    } else if (statusFilter === 'LOW_STOCK') {
      matchesStatus = stock > 0 && stock < 20;
    } else if (statusFilter === 'OUT_OF_STOCK') {
      matchesStatus = stock <= 0;
    }

    return matchesSearch && matchesStatus;
  });

  const totalUnits = productList.reduce((acc: number, p: any) => acc + Number(p.stock_quantity ?? 0), 0);
  const lowStockCount = productList.filter((p: any) => {
    const s = Number(p.stock_quantity ?? 0);
    return s > 0 && s < 20;
  }).length;
  const outOfStockCount = productList.filter((p: any) => Number(p.stock_quantity ?? 0) <= 0).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Warehouse Inventory & Stock</h2>
          <p className="text-sm text-text-muted mt-1">
            Real-time physical stock levels, SKU distribution, and replenishment monitoring
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-border-light rounded-lg text-sm font-medium text-text-main hover:bg-slate-50 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-text-muted ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Stock
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Units on Hand</p>
              <h3 className="text-2xl font-bold text-text-main mt-1">
                {isLoading ? '...' : totalUnits.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-primary-light/50 rounded-xl text-primary">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Catalog SKUs</p>
              <h3 className="text-2xl font-bold text-text-main mt-1">
                {isLoading ? '...' : productList.length}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {isLoading ? '...' : lowStockCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Out of Stock</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {isLoading ? '...' : outOfStockCount}
              </h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search SKU, Product, or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((filter) => {
            const labels: Record<string, string> = {
              ALL: 'All Items',
              IN_STOCK: 'In Stock (≥20)',
              LOW_STOCK: 'Low Stock (<20)',
              OUT_OF_STOCK: 'Out of Stock (0)',
            };
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-text-muted hover:text-text-main hover:bg-slate-200'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-text-muted">Loading warehouse inventory records...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6">
            <Package className="w-12 h-12 text-slate-300" />
            <div>
              <p className="text-base font-semibold text-text-main">No inventory items matched</p>
              <p className="text-xs text-text-muted mt-1">
                Try adjusting your search criteria or changing the stock filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border-light text-xs font-semibold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">SKU / Code</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Unit</th>
                  <th className="py-3.5 px-4 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-center">Available Stock</th>
                  <th className="py-3.5 px-4 text-center">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredProducts.map((prod: any) => {
                  const stock = Number(prod.stock_quantity ?? 0);
                  const isOut = stock <= 0;
                  const isLow = stock > 0 && stock < 20;

                  return (
                    <tr key={prod.id || prod.sku} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-700">
                        {prod.sku || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-text-main">{prod.name}</p>
                        {prod.seller_name && (
                          <p className="text-xs text-text-muted">Seller: {prod.seller_name}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {prod.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-muted">
                        {prod.unit || 'units'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        ${Number(prod.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-sm">
                          <span
                            className={`${
                              isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {stock.toLocaleString()}
                          </span>
                          <span className="text-xs text-text-muted font-normal">units</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <XCircle className="w-3.5 h-3.5" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Optimal Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
