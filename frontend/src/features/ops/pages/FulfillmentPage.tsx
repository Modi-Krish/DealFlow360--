import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFulfillmentOrders,
  allocateQuotation,
  updateDeliveryStatus,
  overrideWarehouseSplit,
  consolidateBackorders
} from '../services/fulfillmentApi';
import { getQuotations } from '../../sales/services/quotationApi';
import {
  Package,
  Truck,
  RotateCcw,
  Warehouse as WarehouseIcon,
  ShieldAlert,
  Send,
  X,
  Layers,
  Sparkles,
  Calendar
} from 'lucide-react';

export const FulfillmentPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [overrideModal, setOverrideModal] = useState<{ orderId: string; currentWh: string } | null>(null);
  const [overrideWarehouse, setOverrideWarehouse] = useState('Central Logistics Hub');
  const [overrideReason, setOverrideReason] = useState('');

  const [dispatchModal, setDispatchModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [carrier, setCarrier] = useState('FedEx Freight');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['fulfillmentOrders'],
    queryFn: getFulfillmentOrders,
  });

  const { data: quotations } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations,
  });

  const consolidateMutation = useMutation({
    mutationFn: (orderId: string) => consolidateBackorders(orderId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setFeedback({ type: 'success', message: data.message || 'Backorders consolidated into unified shipment!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to consolidate backorder' });
    }
  });

  const allocateMutation = useMutation({
    mutationFn: allocateQuotation,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (data.success) {
        setFeedback({ type: 'success', message: 'Inventory allocated successfully across warehouses!' });
      } else {
        setFeedback({ type: 'error', message: data.message || 'Insufficient inventory to fulfill quotation' });
      }
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error.response?.data?.detail || 'Failed to allocate inventory' });
    }
  });

  const overrideMutation = useMutation({
    mutationFn: ({ orderId, warehouseName, reason }: { orderId: string; warehouseName: string; reason: string }) =>
      overrideWarehouseSplit(orderId, warehouseName, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setOverrideModal(null);
      setOverrideReason('');
      setFeedback({ type: 'success', message: 'Warehouse split overridden and logged to audit trail' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Override failed' });
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: any }) =>
      updateDeliveryStatus(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      setDispatchModal(null);
      setTrackingNumber('');
      setDispatchNotes('');
      setFeedback({ type: 'success', message: 'Shipment dispatched with carrier tracking!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to dispatch' });
    }
  });

  // Approved quotes ready for inventory allocation
  const pendingQuotations = quotations?.filter((q: any) => q.status === 'APPROVED');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Fulfillment & Split Warehouse Dispatch
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Automated multi-warehouse inventory allocation, split fulfillment, and audit-governed overrides
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className="text-sm font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Pending Allocations & Active Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Pending Allocations */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-lg font-bold text-text-main">Approved Quotations</h2>
            <span className="badge bg-emerald-50 text-emerald-700 font-bold text-xs">
              {pendingQuotations?.length || 0} Ready
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Quotations approved through governance matrix awaiting warehouse inventory reservation.
          </p>

          <div className="space-y-3">
            {!pendingQuotations || pendingQuotations.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border-light rounded-xl bg-slate-50">
                <p className="text-text-muted text-sm">No approved quotations awaiting allocation.</p>
              </div>
            ) : (
              pendingQuotations.map((q: any) => (
                <div key={q.id} className="p-4 rounded-xl border border-border-light bg-slate-50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-text-main">{q.quotation_number}</p>
                      <p className="text-xs text-text-muted mt-0.5">{q.items?.length || 0} line items</p>
                    </div>
                    <span className="font-bold text-sm text-text-main">
                      ${parseFloat(q.grand_total || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => allocateMutation.mutate(q.id)}
                    disabled={allocateMutation.isPending}
                    className="w-full btn-primary flex items-center justify-center gap-1.5 text-xs font-semibold py-2"
                  >
                    <Package className="w-3.5 h-3.5" />
                    {allocateMutation.isPending ? 'Allocating...' : 'Allocate Inventory'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 2 Cols: Active Fulfillment Orders Table */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Active Fulfillment & Delivery Orders
            </h2>
            <span className="badge bg-blue-50 text-blue-700 font-bold text-xs">
              {orders?.length || 0} Orders
            </span>
          </div>

          {/* Automated Consolidate Backorder Prompt */}
          {(orders || []).some((o: any) => o.can_consolidate || o.status === 'BACKORDER') && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-900 block">Stock Arrival Consolidation Prompt</span>
                  <span className="text-emerald-700 text-[11px]">
                    Warehouse stock replenished. Consolidate remaining split backorders into single shipments to cut freight fees.
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const target = (orders || []).find((o: any) => o.can_consolidate || o.status === 'BACKORDER');
                  if (target) consolidateMutation.mutate(target.id);
                }}
                disabled={consolidateMutation.isPending}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {consolidateMutation.isPending ? 'Consolidating...' : 'Consolidate Backorders'}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Warehouse Split</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">SLA Delivery Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-light">
                {loadingOrders ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                      Loading fulfillment orders...
                    </td>
                  </tr>
                ) : !orders || orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                      No active fulfillment orders. Allocate an approved quote above to generate orders.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord: any) => {
                    const currentWh = ord.items?.[0]?.warehouse_name || 'Central Warehouse';
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-text-main">{ord.order_number || ord.id.substring(0, 8)}</p>
                            {ord.is_consolidated && (
                              <span className="badge bg-teal-50 text-teal-700 text-[10px] font-bold">Consolidated</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">{ord.items?.length || 0} items allocated</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1 text-xs text-text-main font-semibold">
                            <WarehouseIcon className="w-3.5 h-3.5 text-primary" />
                            {currentWh}
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-xs">
                            {ord.dispatch_notes || 'Cost-weighted split routing'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted font-mono">
                          {ord.estimated_delivery_date ? (
                            <span className="flex items-center gap-1 text-slate-700">
                              <Calendar className="w-3 h-3 text-primary" />
                              {ord.estimated_delivery_date}
                            </span>
                          ) : (
                            '3-Day SLA'
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted font-mono">
                          {ord.tracking_number || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`badge text-xs font-semibold ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ord.status === 'DISPATCHED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : ord.status === 'BACKORDER'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          <div className="flex justify-end gap-1.5">
                            {(ord.can_consolidate || ord.status === 'BACKORDER') && (
                              <button
                                onClick={() => consolidateMutation.mutate(ord.id)}
                                disabled={consolidateMutation.isPending}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold flex items-center gap-1"
                                title="Consolidate backorder into unified shipment"
                              >
                                <Layers className="w-3 h-3" /> Consolidate
                              </button>
                            )}
                            <button
                              onClick={() => setOverrideModal({ orderId: ord.id, currentWh })}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded-lg font-semibold flex items-center gap-1 transition-colors"
                              title="Manual Warehouse Override"
                            >
                              <RotateCcw className="w-3 h-3" /> Override
                            </button>
                            {ord.status !== 'DISPATCHED' && ord.status !== 'DELIVERED' && (
                              <button
                                onClick={() => {
                                  setDispatchModal({ orderId: ord.id, orderNumber: ord.order_number || ord.id.substring(0, 8) });
                                  setTrackingNumber(`TRK-${Math.floor(100000 + Math.random() * 900000)}`);
                                }}
                                className="btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" /> Dispatch
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Warehouse Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-border-light">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Operations Warehouse Override
              </h3>
              <button onClick={() => setOverrideModal(null)} className="text-text-muted hover:text-text-main">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Manually change the fulfillment warehouse. This action is logged into the compliance audit trail.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Target Warehouse</label>
                <select
                  value={overrideWarehouse}
                  onChange={(e) => setOverrideWarehouse(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="Central Logistics Hub">Central Logistics Hub</option>
                  <option value="East Coast Fulfillment Facility">East Coast Fulfillment Facility</option>
                  <option value="West Coast Express Warehouse">West Coast Express Warehouse</option>
                  <option value="Southern Distribution Center">Southern Distribution Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Justification Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="E.g., Customer requested urgent local pickup / stock consolidation..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => setOverrideModal(null)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (overrideReason.trim()) {
                    overrideMutation.mutate({
                      orderId: overrideModal.orderId,
                      warehouseName: overrideWarehouse,
                      reason: overrideReason
                    });
                  }
                }}
                disabled={!overrideReason.trim() || overrideMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {overrideMutation.isPending ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Shipment Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-border-light">
            <div className="flex justify-between items-center border-b border-border-light pb-2">
              <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Dispatch Shipment #{dispatchModal.orderNumber}
              </h3>
              <button onClick={() => setDispatchModal(null)} className="text-text-muted hover:text-text-main">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Logistics Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="FedEx Freight">FedEx Freight</option>
                  <option value="UPS Supply Chain Solutions">UPS Supply Chain Solutions</option>
                  <option value="DHL Express Global">DHL Express Global</option>
                  <option value="Dedicated Seller Fleet">Dedicated Seller Fleet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Dispatch Notes</label>
                <input
                  type="text"
                  placeholder="Pallet sealed, dock clearance verified..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => setDispatchModal(null)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatchMutation.mutate({
                    orderId: dispatchModal.orderId,
                    payload: {
                      status: 'DISPATCHED',
                      carrier,
                      tracking_number: trackingNumber,
                      dispatch_notes: dispatchNotes
                    }
                  });
                }}
                disabled={dispatchMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
