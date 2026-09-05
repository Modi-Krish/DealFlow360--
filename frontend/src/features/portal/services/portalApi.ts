import { api } from '../../../shared/lib/axios';

export const getCustomerQuotations = async (customerId: string) => {
  const { data } = await api.get(`/portal/customer/${customerId}/quotations`);
  return data.data;
};

export const acceptQuotation = async (quotationId: string) => {
  const { data } = await api.post(`/portal/quotation/${quotationId}/accept`);
  return data;
};

export const negotiateQuotation = async (quotationId: string, notes: string) => {
  const { data } = await api.post(`/portal/quotation/${quotationId}/negotiate`, { notes });
  return data;
};
