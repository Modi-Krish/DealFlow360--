import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
  getSubscriptions,
  getInvoices,
  processQuotationToBilling,
  payInvoice,
  updateSubscriptionStatus,
  updateOrderStatus,
  prorateSubscription,
  getCreditNotes,
  getSubscriptionPlans,
  createSubscriptionPlan,
  getSubscriptionSchedule
} from '../services/billingApi';
import { getQuotations } from '../../sales/services/quotationApi';
import {
  CreditCard,
  Repeat,
  PlayCircle,
  CheckCircle2,
  DollarSign,
  Pause,
  Play,
  X,
  FileText,
  Calendar,
  Layers,
  Percent,
  Download,
  Printer,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { downloadPdfFile } from '../../../shared/utils/downloadPdf';

export const BillingDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'SUBSCRIPTIONS' | 'INVOICES' | 'CREDIT_NOTES' | 'PLANS'>('OVERVIEW');

  // Payment Recording modal
  const [paymentModal, setPaymentModal] = useState<{ invoiceId: string; invoiceNumber: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceId, setReferenceId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Proration Modal state
  const [prorationModal, setProrationModal] = useState<{ subId: string; currentPrice: number; cycle: string } | null>(null);
  const [prorationAction, setProrationAction] = useState('UPGRADE');
  const [newPrice, setNewPrice] = useState('');
  const [newCycle, setNewCycle] = useState('MONTHLY');
  const [prorationReason, setProrationReason] = useState('');
  const [prorationResult, setProrationResult] = useState<any>(null);

  // Recurring Schedule Modal state
  const [scheduleModal, setScheduleModal] = useState<{ subId: string; planName: string } | null>(null);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // New Plan Modal state
  const [planModal, setPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [planCycle, setPlanCycle] = useState('MONTHLY');
  const [planMultiplier, setPlanMultiplier] = useState(1.0);
  const [planProration, setPlanProration] = useState('DAILY_PRO_RATA');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data: orders, isLoading: loadingOrders } = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const { data: subscriptions, isLoading: loadingSubs } = useQuery({ queryKey: ['subscriptions'], queryFn: getSubscriptions });
  const { data: invoices, isLoading: loadingInvoices } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: quotations } = useQuery({ queryKey: ['quotations'], queryFn: getQuotations });
  const { data: creditNotes } = useQuery({ queryKey: ['creditNotes'], queryFn: getCreditNotes });
  const { data: plans } = useQuery({ queryKey: ['subscriptionPlans'], queryFn: getSubscriptionPlans });

  // Mutations
  const processMutation = useMutation({
    mutationFn: processQuotationToBilling,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      const extra = res.data?.is_hybrid ? ' (Hybrid Order: Separated Upfront Hardware & Subscriptions)' : '';
      setFeedback({ type: 'success', message: `Order and initial invoice generated successfully!${extra}` });
    },
    onError: (error: any) => {
      setFeedback({ type: 'error', message: error.response?.data?.detail || 'Failed to process quotation' });
    }
  });

  const payMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: any }) => payInvoice(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setPaymentModal(null);
      setReferenceId('');
      setPaymentNotes('');
      setFeedback({ type: 'success', message: 'Payment recorded and invoice marked as PAID!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Payment recording failed' });
    }
  });

  const subStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateSubscriptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setFeedback({ type: 'success', message: 'Subscription status updated' });
    }
  });

  const orderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setFeedback({ type: 'success', message: 'Order status updated' });
    }
  });

  const prorateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => prorateSubscription(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      setProrationResult(data);
      setFeedback({ type: 'success', message: 'Proration calculated and applied successfully!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Proration calculation failed' });
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      setPlanModal(false);
      setPlanName('');
      setPlanCode('');
      setFeedback({ type: 'success', message: 'Subscription plan tier created!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to create plan' });
    }
  });

  const handleOpenSchedule = async (sub: any) => {
    setScheduleModal({ subId: sub.id, planName: sub.product_name || 'Subscription' });
    setLoadingSchedule(true);
    try {
      const sched = await getSubscriptionSchedule(sub.id);
      setScheduleData(sched || []);
    } catch (e) {
      setScheduleData([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Export Invoices CSV
  const exportInvoicesCSV = () => {
    if (!invoices || invoices.length === 0) return;
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Invoice Number', 'Order ID', 'Customer ID', 'Amount Due', 'Amount Paid', 'Status', 'Due Date', 'Created At'];
    const rows = invoices.map((i: any) => [
      escapeCsv(i.invoice_number),
      escapeCsv(i.order_id || ''),
      escapeCsv(i.customer_id || ''),
      escapeCsv(i.amount_due || 0),
      escapeCsv(i.amount_paid || 0),
      escapeCsv(i.status),
      escapeCsv(i.due_date || ''),
      escapeCsv(i.created_at || '')
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.map(h => `"${h}"`).join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dealflow360_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Invoices Statement
  const printStatement = () => {
    window.print();
  };

  // Filter pending billable quotations
  const pendingBillingQuotations = (quotations || []).filter(
    (q: any) => q.status === 'APPROVED' || q.status === 'ALLOCATED'
  );

  // Calculations
  const allInvoices = invoices || [];
  const totalInvoiced = allInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount_due || inv.amount || 0), 0);
  const paidInvoices = allInvoices.filter((inv: any) => inv.status === 'PAID');
  const totalCollected = paidInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount_due || inv.amount || 0), 0);
  const activeSubs = (subscriptions || []).filter((s: any) => s.status === 'ACTIVE');
  const totalMRR = activeSubs.reduce((sum: number, s: any) => sum + parseFloat(s.recurring_price || s.price || 0), 0);
  const totalCreditIssued = (creditNotes || []).reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Billing, Recurring Subscriptions & Invoicing
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Hybrid billing, mid-cycle proration engine, credit note automation, and recurring revenue governance
          </p>
        </div>

        {/* Global Export Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportInvoicesCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-semibold rounded-lg transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Export CSV
          </button>
          <button
            onClick={printStatement}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-semibold rounded-lg transition"
            title="Print PDF Statement"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            Print PDF
          </button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5 border-l-4 border-l-primary bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase">Total Invoiced</p>
            <h3 className="text-2xl font-black text-text-main mt-1">${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-text-muted mt-1 inline-block">{allInvoices.length} invoices generated</span>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase">Collected Revenue</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-emerald-600 mt-1 inline-block font-medium">{paidInvoices.length} settled payments</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase">Monthly Recurring Revenue (MRR)</p>
            <h3 className="text-2xl font-black text-blue-700 mt-1">${totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-blue-600 mt-1 inline-block font-medium">{activeSubs.length} active recurring plans</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Repeat className="w-6 h-6" />
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase">Credit Notes Issued</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">${totalCreditIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[11px] text-amber-600 mt-1 inline-block font-medium">{creditNotes?.length || 0} automated refunds/credits</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light gap-2 overflow-x-auto pb-1">
        {(['OVERVIEW', 'ORDERS', 'SUBSCRIPTIONS', 'INVOICES', 'CREDIT_NOTES', 'PLANS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:bg-slate-100'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB: Quotations Ready for Order Generation */}
      {(activeTab === 'OVERVIEW' || activeTab === 'ORDERS') && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <div>
                <h2 className="text-lg font-bold text-text-main">Quotations Ready to Bill</h2>
                <p className="text-xs text-text-muted">
                  Approved / Allocated customer quotes ready to convert into enforceable orders and generate billing
                </p>
              </div>
              <span className="badge bg-emerald-50 text-emerald-700 font-bold text-xs">
                {pendingBillingQuotations.length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {pendingBillingQuotations.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border-light rounded-xl bg-slate-50">
                  <p className="text-text-muted text-sm">No approved quotations awaiting billing conversion.</p>
                </div>
              ) : (
                pendingBillingQuotations.map((q: any) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-border-light bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-slate-200 text-slate-800 font-bold text-xs">QUOTE</span>
                        <h3 className="font-bold text-sm text-text-main">{q.quotation_number}</h3>
                        <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Amount: <span className="font-bold text-text-main">${parseFloat(q.grand_total || 0).toFixed(2)}</span> | Items: {q.items?.length || 0}
                      </p>
                    </div>

                    <button
                      onClick={() => processMutation.mutate(q.id)}
                      disabled={processMutation.isPending}
                      className="btn-primary flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 shadow-sm"
                    >
                      <PlayCircle className="w-4 h-4" />
                      {processMutation.isPending ? 'Processing...' : 'Win & Generate Billing'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {(activeTab === 'OVERVIEW' || activeTab === 'ORDERS') && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Customer Orders
            </h2>
            <span className="badge bg-slate-100 text-slate-700 font-bold text-xs">{orders?.length || 0} Orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-light">
                {loadingOrders ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">Loading orders...</td></tr>
                ) : !orders || orders.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">No confirmed orders.</td></tr>
                ) : (
                  orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-primary">{order.order_number}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-text-main">
                        ${parseFloat(order.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs font-semibold ${
                          order.status === 'COMPLETED' || order.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {order.status === 'PROCESSING' && (
                            <button
                              onClick={() => orderStatusMutation.mutate({ id: order.id, status: 'COMPLETED' })}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SUBSCRIPTIONS TAB */}
      {(activeTab === 'OVERVIEW' || activeTab === 'SUBSCRIPTIONS') && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Repeat className="w-5 h-5 text-emerald-600" />
                Active Recurring Subscriptions & Proration
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Mid-cycle quantity changes, plan upgrades/downgrades, and automated prorated refund calculations
              </p>
            </div>
            <span className="badge bg-emerald-50 text-emerald-700 font-bold text-xs">
              {subscriptions?.length || 0} Subscriptions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Plan / Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Cycle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Recurring Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Next Renewal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-light">
                {loadingSubs ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">Loading subscriptions...</td></tr>
                ) : !subscriptions || subscriptions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">No recurring subscriptions active.</td></tr>
                ) : (
                  subscriptions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-text-main">
                        {sub.product_name || 'Enterprise Service Subscription'}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted font-medium">{sub.billing_cycle || 'MONTHLY'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-700">${parseFloat(sub.recurring_price || sub.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">
                        {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : 'Auto-renewing'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs font-semibold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'PAUSED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Prorate button */}
                          <button
                            onClick={() => {
                              setProrationModal({
                                subId: sub.id,
                                currentPrice: parseFloat(sub.recurring_price || sub.price || 0),
                                cycle: sub.billing_cycle || 'MONTHLY'
                              });
                              setNewPrice(String(sub.recurring_price || sub.price || ''));
                              setProrationResult(null);
                            }}
                            className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-semibold"
                            title="Mid-cycle upgrade, downgrade, or proration"
                          >
                            Prorate / Modify
                          </button>

                          {/* View Schedule button */}
                          <button
                            onClick={() => handleOpenSchedule(sub)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-text-muted hover:text-text-main rounded text-xs font-medium flex items-center gap-1"
                            title="Projected Billing Schedule"
                          >
                            <Calendar className="w-3 h-3" />
                            Schedule
                          </button>

                          {sub.status === 'ACTIVE' && (
                            <button
                              onClick={() => subStatusMutation.mutate({ id: sub.id, status: 'PAUSED' })}
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                              title="Pause"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sub.status === 'PAUSED' && (
                            <button
                              onClick={() => subStatusMutation.mutate({ id: sub.id, status: 'ACTIVE' })}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Resume"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. INVOICES TAB */}
      {(activeTab === 'OVERVIEW' || activeTab === 'INVOICES') && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Invoices & Payment Settlements
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Itemized hybrid billing separating upfront hardware from recurring subscriptions
              </p>
            </div>
            <span className="badge bg-purple-50 text-purple-700 font-bold text-xs">{invoices?.length || 0} Invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Billing Breakdown</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Amount Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-light">
                {loadingInvoices ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">Loading invoices...</td></tr>
                ) : !invoices || invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">No invoices recorded.</td></tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-purple-700">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-xs">
                        {inv.is_hybrid ? (
                          <div className="space-y-0.5">
                            <span className="badge bg-purple-100 text-purple-800 text-[10px] font-bold">HYBRID BILLING</span>
                            <div className="text-text-muted text-[11px]">
                              Upfront: <span className="font-semibold text-text-main">${parseFloat(inv.one_time_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="text-text-muted text-[11px]">
                              Recurring: <span className="font-semibold text-emerald-700">${parseFloat(inv.recurring_amount || 0).toFixed(2)}/mo</span>
                            </div>
                          </div>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-700 text-[10px]">STANDARD INVOICE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-text-main">
                        ${parseFloat(inv.amount_due || inv.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs font-semibold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'OVERDUE'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadPdfFile(`/billing/invoices/${inv.id}/pdf`, `Invoice_${inv.invoice_number}.pdf`)}
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Download Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-purple-600" />
                            <span>PDF</span>
                          </button>
                          {inv.status !== 'PAID' ? (
                            <button
                              onClick={() =>
                                setPaymentModal({
                                  invoiceId: inv.id,
                                  invoiceNumber: inv.invoice_number,
                                  amount: parseFloat(inv.amount_due || inv.amount || 0)
                                })
                              }
                              className="btn-primary text-xs py-1.5 px-3 font-semibold shadow-sm"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CREDIT NOTES TAB */}
      {activeTab === 'CREDIT_NOTES' && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-600" />
                Credit Notes & Refund Automation
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Automatically generated proration credits for subscription downgrades and cancellations
              </p>
            </div>
            <span className="badge bg-amber-50 text-amber-800 font-bold text-xs">{creditNotes?.length || 0} Credit Notes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Credit Note #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Credit Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Refund Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">Date Issued</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border-light">
                {!creditNotes || creditNotes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">No credit notes issued yet.</td></tr>
                ) : (
                  creditNotes.map((cn: any) => (
                    <tr key={cn.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-amber-700">{cn.credit_note_number}</td>
                      <td className="px-4 py-3 text-xs text-text-main max-w-xs truncate">{cn.reason}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-700">${parseFloat(cn.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        <span className="badge bg-slate-100 text-slate-700 font-semibold text-[10px]">{cn.refund_method}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          {cn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">
                        {cn.created_at ? new Date(cn.created_at).toLocaleDateString() : 'Today'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PLANS TAB */}
      {activeTab === 'PLANS' && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Subscription Plan Tiers & Proration Rules
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Define recurring billing cycles (Monthly, Quarterly, Annual) and custom proration/cancellation policies
              </p>
            </div>
            <button
              onClick={() => setPlanModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2 px-3 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Plan Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans?.map((p: any) => (
              <div key={p.id} className="p-5 border border-border-light rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-text-main">{p.name}</h3>
                    <span className="font-mono text-[10px] text-text-muted font-bold">{p.code}</span>
                  </div>
                  <span className="badge bg-primary/10 text-primary font-bold text-xs">{p.billing_cycle}</span>
                </div>

                <p className="text-xs text-text-muted">{p.description || 'Enterprise recurring plan tier'}</p>

                <div className="pt-2 border-t border-border-light space-y-1.5 text-xs">
                  <div className="flex justify-between text-text-muted">
                    <span>Price Multiplier:</span>
                    <span className="font-bold text-text-main">{p.price_multiplier}x</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Proration Policy:</span>
                    <span className="font-bold text-emerald-700">{p.proration_policy}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Early Cancellation Fee:</span>
                    <span className="font-bold text-text-main">${p.cancellation_fee}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Mid-Cycle Proration Engine */}
      {prorationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Mid-Cycle Proration Engine
                </h3>
                <p className="text-xs text-text-muted">
                  Current rate: ${prorationModal.currentPrice.toFixed(2)} / {prorationModal.cycle}
                </p>
              </div>
              <button onClick={() => setProrationModal(null)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Proration Action</label>
                <select
                  value={prorationAction}
                  onChange={(e) => setProrationAction(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="UPGRADE">Plan Upgrade (Charge Remaining Days Delta)</option>
                  <option value="DOWNGRADE">Plan Downgrade (Generate Prorated Credit Note)</option>
                  <option value="QUANTITY_CHANGE">Quantity / Seat Adjustment</option>
                  <option value="CANCEL">Immediate Cancellation (Full Prorated Refund Credit)</option>
                </select>
              </div>

              {prorationAction !== 'CANCEL' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">New Recurring Price ($)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                      placeholder="e.g. 1500.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">New Cycle</label>
                    <select
                      value={newCycle}
                      onChange={(e) => setNewCycle(e.target.value)}
                      className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                    >
                      <option value="MONTHLY">MONTHLY</option>
                      <option value="QUARTERLY">QUARTERLY</option>
                      <option value="ANNUALLY">ANNUALLY</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Adjustment Reason</label>
                <input
                  type="text"
                  value={prorationReason}
                  onChange={(e) => setProrationReason(e.target.value)}
                  placeholder="Customer upgraded tier to support 50 additional users..."
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              {prorationResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-emerald-800">Proration Calculation Output:</div>
                  <div className="text-emerald-700">Days Remaining in Cycle: <span className="font-bold">{prorationResult.days_remaining} days</span></div>
                  <div className="text-emerald-700">Unused Credit: <span className="font-bold">${prorationResult.unused_credit}</span></div>
                  <div className="text-emerald-700">Net Adjustment: <span className="font-bold">${prorationResult.net_adjustment}</span></div>
                  {prorationResult.credit_note_number && (
                    <div className="font-bold text-amber-800">
                      Credit Note Issued: #{prorationResult.credit_note_number}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => setProrationModal(null)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  prorateMutation.mutate({
                    id: prorationModal.subId,
                    payload: {
                      action: prorationAction,
                      new_recurring_price: newPrice ? parseFloat(newPrice) : undefined,
                      new_billing_cycle: newCycle,
                      reason: prorationReason
                    }
                  });
                }}
                disabled={prorateMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {prorateMutation.isPending ? 'Calculating...' : 'Apply Proration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Recurring Billing Schedule Projection */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Recurring Billing Schedule
                </h3>
                <p className="text-xs text-text-muted">{scheduleModal.planName} - 6 Month Projection</p>
              </div>
              <button onClick={() => setScheduleModal(null)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {loadingSchedule ? (
                <div className="py-8 text-center text-xs text-text-muted">Loading projection timeline...</div>
              ) : scheduleData.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">No schedule projection available.</div>
              ) : (
                scheduleData.map((inst: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-border-light rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                        #{inst.installment_number}
                      </div>
                      <div>
                        <div className="font-bold text-text-main font-mono">{inst.billing_date}</div>
                        <div className="text-text-muted text-[10px]">{inst.cycle} Recurring Renewal</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">${inst.amount.toFixed(2)}</div>
                      <span className="badge bg-blue-50 text-blue-700 text-[10px] font-semibold">{inst.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border-light">
              <button
                onClick={() => setScheduleModal(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Subscription Plan */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Define Subscription Plan
              </h3>
              <button onClick={() => setPlanModal(false)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Cloud Annual"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Plan Code</label>
                  <input
                    type="text"
                    placeholder="ENT_ANNUAL"
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Billing Cycle</label>
                  <select
                    value={planCycle}
                    onChange={(e) => setPlanCycle(e.target.value)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="ANNUALLY">ANNUALLY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Price Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={planMultiplier}
                    onChange={(e) => setPlanMultiplier(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Proration Policy</label>
                  <select
                    value={planProration}
                    onChange={(e) => setPlanProration(e.target.value)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                  >
                    <option value="DAILY_PRO_RATA">DAILY_PRO_RATA</option>
                    <option value="FULL_PERIOD">FULL_PERIOD</option>
                    <option value="NO_REFUND">NO_REFUND</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => setPlanModal(false)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createPlanMutation.mutate({
                    name: planName,
                    code: planCode,
                    billing_cycle: planCycle,
                    price_multiplier: planMultiplier,
                    proration_policy: planProration,
                    cancellation_fee: 0
                  });
                }}
                disabled={!planName || !planCode || createPlanMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {createPlanMutation.isPending ? 'Saving...' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Payment */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border-light pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Record Payment Settlement
                </h3>
                <p className="text-xs text-text-muted font-mono">Invoice #{paymentModal.invoiceNumber}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="text-text-muted hover:text-text-main">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-border-light flex justify-between items-center">
                <span className="text-xs text-text-muted">Settlement Amount:</span>
                <span className="text-base font-black text-emerald-700">${paymentModal.amount.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                >
                  <option value="Bank Wire Transfer">Bank Wire Transfer (ACH/SWIFT)</option>
                  <option value="Corporate Credit Card">Corporate Credit Card</option>
                  <option value="Direct Debit">Direct Debit</option>
                  <option value="Check / Cash Equivalent">Check / Cash Equivalent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Transaction / Reference ID</label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-8849204..."
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">Settlement Notes</label>
                <input
                  type="text"
                  placeholder="Payment verified by Finance..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm text-text-main focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => setPaymentModal(null)}
                className="px-3.5 py-1.5 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  payMutation.mutate({
                    invoiceId: paymentModal.invoiceId,
                    payload: {
                      payment_method: paymentMethod,
                      reference_id: referenceId || `TXN-${Date.now()}`,
                      notes: paymentNotes
                    }
                  });
                }}
                disabled={payMutation.isPending}
                className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {payMutation.isPending ? 'Recording...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
