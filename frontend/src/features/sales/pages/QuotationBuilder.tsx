import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuotation, addQuotationItem } from '../services/quotationApi';
import { getCustomers, getProducts } from '../../admin/services/adminApi';
import { Plus, ShoppingCart, TrendingUp } from 'lucide-react';

export const QuotationBuilder = () => {
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [activeQuotation, setActiveQuotation] = useState<any>(null);

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  
  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: (data) => {
      setActiveQuotation(data);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  const addItemMutation = useMutation({
    mutationFn: ({ id, item }: { id: string, item: any }) => addQuotationItem(id, item),
    onSuccess: (data) => {
      setActiveQuotation(data);
    }
  });

  const handleCreate = () => {
    if (selectedCustomer) {
      createMutation.mutate({ customer_id: selectedCustomer });
    }
  };

  const handleAddItem = (productId: string) => {
    if (activeQuotation) {
      addItemMutation.mutate({
        id: activeQuotation.id,
        item: { product_id: productId, quantity: 1, discount_percent: 0 }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Quotation Builder</h2>
          <p className="text-sm text-text-muted mt-1">Create and manage sales quotations</p>
        </div>
        {!activeQuotation && (
          <button onClick={handleCreate} disabled={!selectedCustomer} className="btn-primary flex items-center disabled:opacity-50">
            <Plus className="w-4 h-4 mr-2" />
            Start Quotation
          </button>
        )}
      </div>

      {!activeQuotation ? (
        <div className="card max-w-xl">
          <h3 className="text-lg font-medium text-text-main mb-4">Select Customer</h3>
          <select 
            className="w-full bg-slate-50 border border-border-light rounded p-3 text-text-main focus:border-primary focus:outline-none transition-colors"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">-- Choose a customer --</option>
            {customers?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({c.customer_tier})</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Builder Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-text-main">Quotation #{activeQuotation.quotation_number}</h3>
                  <p className="text-sm text-text-muted">Status: <span className="text-accent">{activeQuotation.status}</span></p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-text-muted">Product</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted">Qty</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs text-text-muted">Disc %</th>
                      <th className="px-4 py-2 text-right text-xs text-text-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {activeQuotation.items?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No items added yet.</td>
                      </tr>
                    ) : (
                      activeQuotation.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-text-main">{item.product_id}</td>
                          <td className="px-4 py-3 text-sm"><input type="number" defaultValue={item.quantity} className="w-16 bg-slate-50 border-border-light rounded px-2 py-1 text-text-main" /></td>
                          <td className="px-4 py-3 text-sm text-text-main">${item.unit_price}</td>
                          <td className="px-4 py-3 text-sm"><input type="number" defaultValue={item.discount_percent} className="w-16 bg-slate-50 border-border-light rounded px-2 py-1 text-text-main" /></td>
                          <td className="px-4 py-3 text-sm text-right text-text-main font-medium">${item.line_total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-text-main mb-4">Product Catalog</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products?.map((p: any) => (
                  <div key={p.id} className="border border-border-light rounded-lg p-3 hover:border-slate-500 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-text-main">{p.name}</p>
                      <p className="text-xs text-text-muted">${p.base_price}</p>
                    </div>
                    <button 
                      onClick={() => handleAddItem(p.id)}
                      className="p-2 bg-slate-50 hover:bg-primary text-text-main rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-medium text-text-main mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Subtotal</span>
                  <span className="text-text-main">${activeQuotation.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Discount</span>
                  <span className="text-danger">-${activeQuotation.discount_total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Tax</span>
                  <span className="text-text-main">${activeQuotation.tax_total}</span>
                </div>
                <div className="border-t border-border-light pt-3 flex justify-between">
                  <span className="text-text-main font-medium">Grand Total</span>
                  <span className="text-text-main font-bold text-lg">${activeQuotation.grand_total}</span>
                </div>
                
                <div className="bg-slate-50/50 p-3 rounded-lg mt-4 flex justify-between items-center border border-border-light">
                  <span className="text-sm text-text-main flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-success" />
                    Est. Margin
                  </span>
                  <span className="text-success font-medium">${activeQuotation.margin_amount}</span>
                </div>
              </div>
              
              <button className="w-full btn-primary mt-6">Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
