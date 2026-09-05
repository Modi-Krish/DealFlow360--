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
