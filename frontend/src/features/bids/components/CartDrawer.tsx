import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../../../shared/context/CartContext';
import { cartCheckout } from '../services/bidsApi';
import {
  ShoppingBag,
  X,
  Trash2,
  Store,
  Send,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';

interface CartDrawerProps {
  onSuccessSubmit?: (message: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onSuccessSubmit }) => {
  const queryClient = useQueryClient();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartItem,
    clearCart,
    cartBySeller,
  } = useCart();

  const [deliveryAddress, setDeliveryAddress] = useState(
    '100 Enterprise Way, Suite 400, Chicago, IL 60601'
  );
  const [notes, setNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: cartCheckout,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      clearCart();
      setIsCartOpen(false);
      const sellerCount = Object.keys(cartBySeller).length;
      const msg = `Multi-Vendor Checkout Complete! Created ${data.length} proposals routed across ${sellerCount} seller(s).`;
      if (onSuccessSubmit) {
        onSuccessSubmit(msg);
      }
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      let msg = 'Checkout failed.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('; ');
      } else if (err?.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err?.message) {
        msg = err.message;
      }
      setCheckoutError(msg);
    },
  });

  if (!isCartOpen) return null;

  const sellerEntries = Object.entries(cartBySeller);

  // Grand Total Calculation
  const grandTotal = cartItems.reduce((acc, item) => acc + item.proposed_price * item.quantity, 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!deliveryAddress || deliveryAddress.length < 5) {
      setCheckoutError('Please enter a valid delivery address (min 5 chars).');
      return;
    }

    // Front-end stock guard before sending to backend
    const overStockItem = cartItems.find(
      (i) => (i.stock_quantity ?? 0) > 0 && i.quantity > (i.stock_quantity ?? 0)
    );
    if (overStockItem) {
      setCheckoutError(
        `"${overStockItem.name}" only has ${overStockItem.stock_quantity} units available. Please update the quantity.`
      );
      return;
    }

    setCheckoutError(null);
    checkoutMutation.mutate({
      items: cartItems.map((i) => ({
        product_id: i.product_id,
        quantity: Math.max(1, Number(i.quantity) || 1),
        proposed_price: Number(i.proposed_price) > 0 ? Number(i.proposed_price) : Number(i.base_price || 1),
      })),
      delivery_address: deliveryAddress,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl border border-emerald-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Procurement Cart</h2>
                <p className="text-xs text-slate-400">
                  {cartItems.length} product(s) across {sellerEntries.length} vendor(s)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {checkoutError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Browse products in the marketplace and click "Add to Cart" to build multi-vendor proposals.
                </p>
              </div>
            ) : (
              sellerEntries.map(([sId, sellerGroup]) => {
                const sellerSubtotal = sellerGroup.items.reduce(
                  (acc, i) => acc + i.proposed_price * i.quantity,
                  0
                );

                return (
                  <div
                    key={sId}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Seller Group Header */}
                    <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        {sellerGroup.seller_name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {sellerGroup.items.length} product(s) grouped together
                      </span>
                    </div>

                    {/* Vendor Items */}
                    <div className="divide-y divide-slate-100">
                      {sellerGroup.items.map((item) => (
                        <div key={item.product_id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                              <span className="text-[11px] text-slate-500">
                                List Price: ${item.base_price.toLocaleString()} /{item.unit || 'unit'}
                              </span>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quantity & Proposed Price Inputs */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                             <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Order Quantity
                              </label>
                              <div className={`flex items-center border rounded-lg bg-white overflow-hidden ${
                                (item.stock_quantity ?? 0) > 0 && item.quantity > (item.stock_quantity ?? 0)
                                  ? 'border-red-400 ring-1 ring-red-300/50'
                                  : 'border-slate-300'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItem(item.product_id, {
                                      quantity: Math.max(1, item.quantity - 1),
                                    })
                                  }
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.stock_quantity || 9999}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateCartItem(item.product_id, {
                                      quantity: Math.max(1, Number(e.target.value)),
                                    })
                                  }
                                  className="w-full text-center text-xs font-bold text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartItem(item.product_id, {
                                      quantity: Math.min(item.quantity + 1, item.stock_quantity || 9999),
                                    })
                                  }
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              {(item.stock_quantity ?? 0) > 0 && item.quantity > (item.stock_quantity ?? 0) ? (
                                <span className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1 font-semibold">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  Only {item.stock_quantity} units available
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Avail: <strong className="text-emerald-600">{item.stock_quantity ?? '—'}</strong>
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Target Price ($/unit)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.proposed_price}
                                  onChange={(e) =>
                                    updateCartItem(item.product_id, {
                                      proposed_price: Number(e.target.value),
                                    })
                                  }
                                  className="w-full pl-6 pr-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-xs font-semibold text-slate-600 pt-1">
                            Line Total:{' '}
                            <strong className="text-slate-900 font-extrabold">
                              ${(item.proposed_price * item.quantity).toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vendor Subtotal */}
                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-600">Quotation Subtotal ({sellerGroup.seller_name}):</span>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        ${sellerSubtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {cartItems.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Delivery & Order Details
                </h4>

                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">
                    Delivery Facility Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1 font-medium">
                    Special Notes / Specifications (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Please expedite delivery for central facility..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-white border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Grand Total Proposal Value
                </span>
                <span className="text-2xl font-black text-slate-900">
                  ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Auto Vendor Splitting Enabled:</strong> Items from the same vendor will be consolidated into 1 proposal. Items from different vendors will automatically generate separate proposals sent to each respective seller.
              </div>

              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={checkoutMutation.isPending || cartItems.some((i) => (i.stock_quantity ?? 0) > 0 && i.quantity > (i.stock_quantity ?? 0))}
                className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Multi-Vendor Bids...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Multi-Vendor Quotations ({sellerEntries.length} Sellers)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
