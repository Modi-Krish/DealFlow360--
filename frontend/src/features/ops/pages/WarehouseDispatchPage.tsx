import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFulfillmentOrders, updateDeliveryStatus, type FulfillmentOrder } from '../../bids/services/bidsApi';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Search,
  Send,
  Loader2,
  Store,
  X,
} from 'lucide-react';

export const WarehouseDispatchPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Dispatch modal state
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [carrier, setCarrier] = useState('FedEx Freight');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Delivery Challan modal state
  const [viewingChallan, setViewingChallan] = useState<FulfillmentOrder | null>(null);

  // Query orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['fulfillmentOrders'],
    queryFn: () => getFulfillmentOrders(),
    refetchInterval: 5000,
  });

  // Mutation to update delivery status
  const updateStatusMutation = useMutation({
    mutationFn: updateDeliveryStatus,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setSelectedOrder(null);
      setCarrier('FedEx Freight');
      setTrackingNumber('');
      setDispatchNotes('');
      setActionSuccess(
        `Order #${data.order_number} status updated to ${variables.payload.status}!`
      );
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || 'Failed to update order status');
    },
  });

  const allOrders = orders || [];

  // Filter orders
  const filteredOrders = allOrders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL' || o.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.order_number?.toLowerCase().includes(term) ||
      o.product_name?.toLowerCase().includes(term) ||
      o.customer_name?.toLowerCase().includes(term) ||
      o.seller_name?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const readyOrders = allOrders.filter((o) => o.status === 'READY_FOR_DELIVERY');
  const totalQuantityToDeliver = readyOrders.reduce(
    (sum, o) => sum + (o.quantity_to_deliver || 0),
    0
  );
  const dispatchedCount = allOrders.filter((o) => o.status === 'DISPATCHED').length;
  const deliveredCount = allOrders.filter((o) => o.status === 'DELIVERED').length;

  const handleOpenDispatchModal = (order: FulfillmentOrder) => {
    setSelectedOrder(order);
    setTrackingNumber(`TRK-${Math.floor(100000 + Math.random() * 900000)}`);
    setDispatchNotes(
      `Package inspected and prepared for ${order.customer_name}. Quantity: ${order.quantity_to_deliver} units.`
    );
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    updateStatusMutation.mutate({
      orderId: selectedOrder.id,
      payload: {
        status: 'DISPATCHED',
        carrier,
        tracking_number: trackingNumber,
        dispatch_notes: dispatchNotes,
      },
    });
  };

  const handleMarkDelivered = (order: FulfillmentOrder) => {
    if (confirm(`Confirm successful delivery for Order #${order.order_number}?`)) {
      updateStatusMutation.mutate({
        orderId: order.id,
        payload: {
          status: 'DELIVERED',
          dispatch_notes: `${order.dispatch_notes || ''} [Delivered successfully to recipient]`.trim(),
        },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Warehouse Fulfillment System
            </span>
            <span className="text-xs text-slate-400">
              Seller Warehouse Delivery Dispatch Queue
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Warehouse Delivery Queue
          </h1>
          <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
            Directly notified when seller & buyer agree on bid price. Review exact units to go for delivery,
            customer shipping destination, and dispatch shipments with live tracking.
          </p>
        </div>

        {/* KPI Counter Boxes */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="bg-slate-800/90 border border-amber-500/30 p-3.5 px-5 rounded-xl text-center min-w-[120px]">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
              Units To Deliver
            </span>
            <span className="text-2xl font-black text-amber-300">
              {totalQuantityToDeliver}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {readyOrders.length} orders pending
            </span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 px-5 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">
              Out for Delivery
            </span>
            <span className="text-2xl font-black text-white">{dispatchedCount}</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 px-5 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              Delivered
            </span>
            <span className="text-2xl font-black text-emerald-400">{deliveredCount}</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search dispatches by Order #, customer, product, or seller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Orders', count: allOrders.length },
            { id: 'READY_FOR_DELIVERY', label: 'Ready for Delivery', count: readyOrders.length },
            { id: 'DISPATCHED', label: 'Out for Delivery', count: dispatchedCount },
            { id: 'DELIVERED', label: 'Delivered', count: deliveredCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className="ml-1 opacity-70 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dispatches List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
          <p className="text-xs">Loading warehouse dispatch queue...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card text-center py-16 bg-white border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No delivery orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When a seller accepts a customer's bid or a buyer accepts a counter price, the agreed
            quantity automatically arrives in this queue ready for delivery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const isReady = order.status === 'READY_FOR_DELIVERY';
            const isDispatched = order.status === 'DISPATCHED';
            const isDelivered = order.status === 'DELIVERED';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                  isReady
                    ? 'border-amber-300 ring-2 ring-amber-500/10 shadow-sm'
                    : isDispatched
                    ? 'border-blue-300 ring-1 ring-blue-500/10 shadow-sm'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                        {order.order_number}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        {order.seller_name || 'Seller Depot'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {order.product_name}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      READY FOR DELIVERY
                    </span>
                  ) : isDispatched ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      OUT FOR DELIVERY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      DELIVERED
                    </span>
                  )}
                </div>

                {/* Main Content Area */}
                <div className="p-5 flex-1 space-y-4">
                  {/* QUANTITY TO DELIVER HIGHLIGHT BANNER */}
                  <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-black">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-800 block tracking-wider">
                          Quantity to go for Delivery
                        </span>
                        <div className="text-xl font-black text-amber-950">
                          {order.quantity_to_deliver || 1} units
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-white/80 px-2.5 py-1 rounded-md border border-amber-200">
                      Allocated from Stock
                    </span>
                  </div>

                  {/* Recipient & Destination Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="font-bold text-slate-500 w-20 shrink-0">Customer:</span>
                      <span className="font-semibold text-slate-900">{order.customer_name || 'B2B Client'}</span>
                    </div>

                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-bold text-slate-500 w-16 shrink-0">Shipping:</span>
                      <span className="text-slate-800 font-medium leading-relaxed">
                        {order.delivery_address || 'Destination address on file'}
                      </span>
                    </div>

                    {order.dispatch_notes && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 border border-slate-200 text-[11px] leading-relaxed">
                        <strong className="text-slate-800">Dispatch Notes: </strong>
                        {order.dispatch_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setViewingChallan(order)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Delivery Challan</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isReady && (
                      <button
                        onClick={() => handleOpenDispatchModal(order)}
                        className="btn-primary bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Dispatch Shipment</span>
                      </button>
                    )}

                    {isDispatched && (
                      <button
                        onClick={() => handleMarkDelivered(order)}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Delivered</span>
                      </button>
                    )}

                    {isDelivered && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed & Delivered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Dispatch Shipment */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Dispatch Delivery #{selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Preparing {selectedOrder.quantity_to_deliver} units for transport
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{selectedOrder.product_name}</div>
                <div className="text-slate-600 mt-0.5">
                  Delivering <strong>{selectedOrder.quantity_to_deliver} units</strong> to{' '}
                  <strong>{selectedOrder.customer_name}</strong>
                </div>
                <div className="text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedOrder.delivery_address}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Logistics Carrier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 font-medium"
                  >
                    <option value="FedEx Freight">FedEx Freight</option>
                    <option value="DHL Express">DHL Express</option>
                    <option value="BlueDart B2B">BlueDart B2B</option>
                    <option value="In-House Seller Depot Fleet">In-House Seller Fleet</option>
                    <option value="Apex Express Logistics">Apex Logistics Truck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Waybill / Tracking # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Dispatch & Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Mark Dispatched & Out for Delivery</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delivery Challan Print/Preview */}
      {viewingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <div className="text-xl font-black text-slate-900">DELIVERY CHALLAN & DISPATCH SLIP</div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Dispatch Order: {viewingChallan.order_number}
                </div>
              </div>
              <button
                onClick={() => setViewingChallan(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                  Origin Seller Warehouse:
                </span>
                <p className="font-bold text-slate-900 text-sm">{viewingChallan.seller_name || 'Apex Global Hardware'}</p>
                <p className="text-slate-600 mt-1">Central Warehouse Depot, Dock Bay 4</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                  Ship To Customer:
                </span>
                <p className="font-bold text-slate-900 text-sm">{viewingChallan.customer_name}</p>
                <p className="text-slate-600 mt-1">{viewingChallan.delivery_address}</p>
              </div>
            </div>

            <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-slate-700 uppercase">Item Description</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-700 uppercase">Quantity</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-900">{viewingChallan.product_name}</td>
                  <td className="px-4 py-3 text-right font-black text-amber-600 text-sm">
                    {viewingChallan.quantity_to_deliver} units
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                      {viewingChallan.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="btn-primary text-xs py-2 px-4 cursor-pointer"
              >
                Print Dispatch Slip
              </button>
              <button
                onClick={() => setViewingChallan(null)}
                className="px-4 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
