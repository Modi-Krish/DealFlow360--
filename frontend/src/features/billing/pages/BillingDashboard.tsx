import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getSubscriptions, getInvoices, processQuotationToBilling } from '../services/billingApi';
import { getQuotations } from '../../sales/services/quotationApi';
import { CreditCard, FileText, Repeat, PlayCircle } from 'lucide-react';

export const BillingDashboard = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading: loadingOrders } = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const { data: subscriptions, isLoading: loadingSubs } = useQuery({ queryKey: ['subscriptions'], queryFn: getSubscriptions });
  const { data: invoices, isLoading: loadingInvoices } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: quotations } = useQuery({ queryKey: ['quotations'], queryFn: getQuotations });

  const processMutation = useMutation({
    mutationFn: processQuotationToBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to process quotation');
    }
  });

  // Find allocated quotations ready to be billed
  const pendingBillingQuotations = quotations?.filter((q: any) => q.status === 'ALLOCATED');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Billing & Subscriptions</h2>
          <p className="text-sm text-slate-400 mt-1">Manage orders, recurring billing, and invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="h-16 w-16 text-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Total Orders</p>
            <p className="text-3xl font-semibold text-white">{orders?.length || 0}</p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Repeat className="h-16 w-16 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Active Subscriptions</p>
            <p className="text-3xl font-semibold text-white">{subscriptions?.length || 0}</p>
          </div>
        </div>
        
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard className="h-16 w-16 text-blue-500" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Generated Invoices</p>
            <p className="text-3xl font-semibold text-white">{invoices?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Convert Quotations to Orders section */}
      <div className="card">
        <h3 className="text-lg font-medium text-white mb-4">Quotations Ready for Billing (Allocated)</h3>
        {pendingBillingQuotations?.length === 0 ? (
          <p className="text-slate-400 text-sm">No allocated quotations ready to be converted into orders.</p>
        ) : (
          <div className="space-y-4">
            {pendingBillingQuotations?.map((q: any) => (
              <div key={q.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50 flex justify-between items-center">
                <div>
                  <h4 className="text-white font-medium">{q.quotation_number}</h4>
                  <p className="text-sm text-slate-400">Total: ${q.grand_total} | Customer: {q.customer?.name || q.customer_id}</p>
                </div>
                <button 
                  onClick={() => processMutation.mutate(q.id)}
                  className="btn-primary flex items-center text-sm px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700"
                  disabled={processMutation.isPending}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Generate Order & Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-lg">
            <h3 className="text-lg font-medium text-white">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Order Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-slate-700">
                {loadingOrders ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : orders?.slice(0, 5).map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">${order.total_amount}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-lg">
            <h3 className="text-lg font-medium text-white">Recent Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-slate-700">
                {loadingInvoices ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : invoices?.slice(0, 5).map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">${invoice.amount_due}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        invoice.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
