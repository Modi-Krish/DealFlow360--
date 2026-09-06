import { api } from '../../../shared/lib/axios';

export const getOrders = async () => {
  const { data } = await api.get('/billing/orders');
  return data.data;
};

export const getSubscriptions = async () => {
  const { data } = await api.get('/billing/subscriptions');
  return data.data;
};

export const getInvoices = async () => {
  const { data } = await api.get('/billing/invoices');
  return data.data;
};

export const processQuotationToBilling = async (quotationId: string) => {
  const { data } = await api.post(`/billing/process-won-quotation/${quotationId}`);
  return data;
};

export const payInvoice = async (invoiceId: string, payload: { payment_method: string; reference_id?: string; notes?: string }) => {
  const { data } = await api.post(`/billing/invoices/${invoiceId}/pay`, payload);
  return data.data;
};

export const updateSubscriptionStatus = async (subscriptionId: string, status: string) => {
  const { data } = await api.post(`/billing/subscriptions/${subscriptionId}/status`, { status });
  return data.data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const { data } = await api.post(`/billing/orders/${orderId}/status`, { status });
  return data.data;
};

export const prorateSubscription = async (
  subscriptionId: string,
  payload: { action: string; new_recurring_price?: number; new_billing_cycle?: string; reason?: string }
) => {
  const { data } = await api.post(`/billing/subscriptions/${subscriptionId}/prorate`, payload);
  return data.data;
};

export const getCreditNotes = async () => {
  const { data } = await api.get('/billing/credit-notes');
  return data.data;
};

export const createCreditNote = async (payload: { order_id?: string; customer_id?: string; subscription_id?: string; amount: number; reason: string; refund_method?: string }) => {
  const { data } = await api.post('/billing/credit-notes', payload);
  return data.data;
};

export const getSubscriptionPlans = async () => {
  const { data } = await api.get('/billing/plans');
  return data.data;
};

export const createSubscriptionPlan = async (payload: {
  name: string;
  code: string;
  billing_cycle: string;
  price_multiplier: number;
  proration_policy: string;
  cancellation_fee: number;
  description?: string;
  is_active?: boolean;
}) => {
  const { data } = await api.post('/billing/plans', payload);
  return data.data;
};

export const getSubscriptionSchedule = async (subscriptionId: string) => {
  const { data } = await api.get(`/billing/schedule/${subscriptionId}`);
  return data.data;
};
