import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarehouses, createWarehouse, updateWarehouse } from '../../ops/services/fulfillmentApi';
import {
  Warehouse as WarehouseIcon,
  PlusCircle,
  Edit2,
  X,
  MapPin
} from 'lucide-react';

export const WarehousesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [shippingCost, setShippingCost] = useState(5.0);
  const [priorityWeight, setPriorityWeight] = useState(1);
  const [reorderPoint, setReorderPoint] = useState(15);
  const [reorderQty, setReorderQty] = useState(50);
  const [isActive, setIsActive] = useState(true);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: getWarehouses,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingId) {
        return updateWarehouse(editingId, payload);
      }
      return createWarehouse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setModalOpen(false);
      resetForm();
      setFeedback({ type: 'success', message: `Warehouse ${editingId ? 'updated' : 'created'} successfully!` });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to save warehouse' });
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setShippingCost(5.0);
    setPriorityWeight(1);
    setReorderPoint(15);
    setReorderQty(50);
    setIsActive(true);
  };

  const handleEdit = (w: any) => {
    setEditingId(w.id);
    setName(w.name);
    setLocation(w.location || '');
    setShippingCost(w.shipping_cost_per_kg || 5.0);
    setPriorityWeight(w.priority_weight || 1);
    setReorderPoint(w.reorder_point || 15);
    setReorderQty(w.reorder_quantity || 50);
    setIsActive(w.is_active ?? true);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-primary" />
            Warehouse Logistics & Replenishment Setup
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Configure multi-facility distribution centers, shipping cost weightings, and automated inventory replenishment triggers
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2.5 px-4 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Add Warehouse
        </button>
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

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-sm text-text-muted">Loading warehouses...</div>
        ) : !warehouses || warehouses.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-sm text-text-muted">No warehouses configured yet.</div>
        ) : (
          warehouses.map((w: any) => (
            <div key={w.id} className="card p-5 space-y-4 hover:shadow-md transition bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-text-main flex items-center gap-1.5">
                    <WarehouseIcon className="w-4 h-4 text-primary" />
                    {w.name}
                  </h3>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {w.location || 'Primary Region Hub'}
                  </p>
                </div>
                <span className={`badge text-[10px] font-bold ${w.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {w.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Freight Rate / kg:</span>
                  <span className="font-bold text-text-main">${(w.shipping_cost_per_kg || 5.0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Split Priority:</span>
                  <span className="font-bold text-primary">Priority #{w.priority_weight || 1}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Reorder Point:</span>
                  <span className="font-bold text-amber-700">{w.reorder_point || 15} units</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Restock Batch:</span>
                  <span className="font-bold text-emerald-700">+{w.reorder_quantity || 50} units</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border-light">
                <button
                  onClick={() => handleEdit(w)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Edit2 className="w-3 h-3" /> Configure
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-primary" />
                {editingId ? 'Edit Warehouse Logistics' : 'Add New Distribution Warehouse'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Facility / Warehouse Name</label>
                <input
                  type="text"
                  placeholder="e.g. Northeast Regional Fulfillment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Physical Location / Metro</label>
                <input
                  type="text"
                  placeholder="e.g. Boston, MA (Zone 1)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Shipping Cost Weight ($/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">Used by auto-split engine</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Priority Weight (1=Top, 10=Low)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={priorityWeight}
                    onChange={(e) => setPriorityWeight(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">Fulfillment tiebreaker</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Auto-Replenish Trigger (Units)</label>
                  <input
                    type="number"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">Safety stock threshold</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Restock Batch Size (Units)</label>
                  <input
                    type="number"
                    value={reorderQty}
                    onChange={(e) => setReorderQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">Standard replenishment PO</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveWh"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border-light text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="isActiveWh" className="text-xs font-medium text-text-main cursor-pointer">
                  Warehouse active for automated inventory allocation
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveMutation.mutate({
                    name,
                    location,
                    shipping_cost_per_kg: shippingCost,
                    priority_weight: priorityWeight,
                    reorder_point: reorderPoint,
                    reorder_quantity: reorderQty,
                    is_active: isActive
                  });
                }}
                disabled={!name || saveMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Warehouse' : 'Create Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
