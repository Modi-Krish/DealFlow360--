import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFulfillmentOrders, allocateQuotation } from '../services/fulfillmentApi';
import { getQuotations } from '../../sales/services/quotationApi';
import { Truck, Check, AlertTriangle } from 'lucide-react';

export const FulfillmentPage = () => {
  const queryClient = useQueryClient();
  
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['fulfillmentOrders'],
    queryFn: getFulfillmentOrders,
  });

  const { data: quotations } = useQuery({
    queryKey: ['quotations'],
    queryFn: getQuotations,
  });

  const allocateMutation = useMutation({
    mutationFn: allocateQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillmentOrders'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to allocate inventory');
    }
  });

  const handleAllocate = (quotationId: string) => {
    allocateMutation.mutate(quotationId);
  };

  // Find approved quotations that are not yet allocated
  const pendingQuotations = quotations?.filter((q: any) => q.status === 'APPROVED');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main tracking-tight">Fulfillment Center</h2>
          <p className="text-sm text-text-muted mt-1">Manage orders and allocate inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-text-main mb-4">Pending Allocations (Approved Quotes)</h3>
          <div className="space-y-4">
            {pendingQuotations?.length === 0 ? (
              <p className="text-text-muted text-sm">No approved quotations awaiting allocation.</p>
            ) : (
              pendingQuotations?.map((q: any) => (
                <div key={q.id} className="border border-border-light rounded-lg p-4 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h4 className="text-text-main font-medium">{q.quotation_number}</h4>
                    <p className="text-sm text-text-muted">Total: ${q.grand_total} | Items: {q.items?.length || 0}</p>
                  </div>
                  <button 
                    onClick={() => handleAllocate(q.id)}
                    className="btn-primary flex items-center text-sm px-3 py-1.5"
                    disabled={allocateMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Allocate Inventory
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-0">
          <div className="p-4 border-b border-border-light bg-slate-50/50 rounded-t-lg">
            <h3 className="text-lg font-medium text-text-main">Active Fulfillment Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Tracking</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-700">
                {loadingOrders ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
                ) : orders?.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-text-muted">No orders found.</td></tr>
                ) : (
                  orders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-main">{order.quotation_id.substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{order.tracking_number || 'Pending'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
