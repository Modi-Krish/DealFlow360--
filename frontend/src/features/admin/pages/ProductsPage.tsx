import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getCategories, createProduct, archiveProduct, type CreateProductPayload } from '../services/adminApi';
import { Plus, Search, X, Loader2, Package, Check, AlertCircle, Archive } from 'lucide-react';

export const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateProductPayload>({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    base_price: '',
    unit: 'unit',
    tax_rate: 0,
    status: 'ACTIVE',
    seller_name: 'Apex Global Hardware',
    stock_quantity: 100,
  });

  // Variant state
  const [variantsList, setVariantsList] = useState<Array<{ attribute: string; value: string; price_surcharge: number }>>([]);
  const [varAttr, setVarAttr] = useState('');
  const [varVal, setVarVal] = useState('');
  const [varSurcharge, setVarSurcharge] = useState('');

  const handleAddVariant = () => {
    if (!varAttr.trim() || !varVal.trim()) return;
    setVariantsList([
      ...variantsList,
      {
        attribute: varAttr.trim(),
        value: varVal.trim(),
        price_surcharge: Number(varSurcharge) || 0,
      },
    ]);
    setVarAttr('');
    setVarVal('');
    setVarSurcharge('');
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        category_id: '',
        description: '',
        base_price: '',
        unit: 'unit',
        tax_rate: 0,
        status: 'ACTIVE',
        seller_name: 'Apex Global Hardware',
        stock_quantity: 100,
      });
      setVariantsList([]);
      setVarAttr('');
      setVarVal('');
      setVarSurcharge('');
      setErrorMsg(null);
      setSuccessMsg('Product added successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create product. Please check your inputs.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSuccessMsg('Product archived successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to archive product.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    if (!formData.base_price || isNaN(Number(formData.base_price)) || Number(formData.base_price) < 0) {
      setErrorMsg('Please enter a valid base price.');
      return;
    }

    createMutation.mutate({
      ...formData,
      base_price: Number(formData.base_price),
      tax_rate: Number(formData.tax_rate) || 0,
      stock_quantity: Number(formData.stock_quantity) || 100,
      seller_name: formData.seller_name || 'Apex Global Hardware',
      category_id: formData.category_id ? formData.category_id : undefined,
      variants: variantsList,
    });
  };

  // Filter products by search term
  const filteredProducts = products?.filter((prod: any) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = prod.name?.toLowerCase().includes(term);
    const skuMatch = prod.sku?.toLowerCase().includes(term);
    const catMatch = prod.category?.name?.toLowerCase().includes(term);
    return nameMatch || skuMatch || catMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Products</h2>
          <p className="text-sm text-text-muted mt-1">Manage your product catalog, pricing, and variants</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setVariantsList([]);
            setVarAttr('');
            setVarVal('');
            setVarSurcharge('');
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Products Table Card */}
      <div className="card p-0 overflow-hidden shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/70">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, SKU, or category..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:text-sm transition-all"
            />
          </div>
          <div className="text-xs text-text-muted self-center">
            {filteredProducts ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} found` : ''}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Product & SKU</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Base Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-text-muted">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm ? 'Try adjusting your search criteria' : 'Click "Add Product" above to create your first product.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts?.map((product: any) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                        {product.sku && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200">
                            {product.sku}
                          </span>
                        )}
                        <span>{product.variants?.length || 0} variants</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {product.seller_name || 'Apex Global Hardware'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${(product.stock_quantity ?? 100) > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                        }`}>
                        {product.stock_quantity ?? 100} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {product.category?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      ${parseFloat(product.base_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                      {product.unit || 'unit'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${product.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : (product.status === 'ARCHIVED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200')
                        }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      {product.status !== 'ARCHIVED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Archive "${product.name}"? This soft-deactivates it from new quotes while preserving historical records.`)) {
                              archiveMutation.mutate(product.id);
                            }
                          }}
                          disabled={archiveMutation.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-md border border-slate-200 transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add New Product</h3>
                  <p className="text-xs text-slate-500">Enter product details to add to catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Database Cluster"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* SKU & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    SKU / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DB-CLD-001 (auto if empty)"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="">Select a category...</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Base Price & Unit Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Base Price ($) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Billing Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="unit">unit (one-time)</option>
                    <option value="month">month (subscription)</option>
                    <option value="year">year (subscription)</option>
                    <option value="hour">hour (services)</option>
                    <option value="user">user / seat</option>
                    <option value="license">license</option>
                  </select>
                </div>
              </div>

              {/* Status & Tax Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Seller & Stock Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Seller Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.seller_name}
                    onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option value="Apex Global Hardware">Apex Global Hardware</option>
                    <option value="CloudScale Technologies">CloudScale Technologies</option>
                    <option value="Infratel Systems Inc">Infratel Systems Inc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Initial Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description of the product or service..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Product Variants Setup */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Product Variants & Surcharges (Optional)
                  </label>
                  <span className="text-[10px] text-text-muted">e.g. Size, Pack, Capacity Tier</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Attribute (e.g. Storage)"
                    value={varAttr}
                    onChange={(e) => setVarAttr(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 10TB / 5-Pack)"
                    value={varVal}
                    onChange={(e) => setVarVal(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="+$ Surcharge"
                      value={varSurcharge}
                      onChange={(e) => setVarSurcharge(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs w-full"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded text-xs font-bold whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {variantsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {variantsList.map((v, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-300 text-xs font-medium text-slate-800 shadow-2xs">
                        <strong>{v.attribute}:</strong> {v.value} (+${v.price_surcharge})
                        <button
                          type="button"
                          onClick={() => setVariantsList(variantsList.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 font-bold ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{createMutation.isPending ? 'Saving...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
