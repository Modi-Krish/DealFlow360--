import { api } from '../../../shared/lib/axios';

export const getCustomerQuotations = async (customerId?: string) => {
  const url = customerId ? `/portal/customer/${customerId}/quotations` : `/portal/me/quotations`;
  const { data } = await api.get(url);
  return data.data;
};

export const acceptQuotation = async (quotationId: string) => {
  const { data } = await api.post(`/portal/quotation/${quotationId}/accept`);
  return data;
};

export const negotiateQuotation = async (quotationId: string, payload: { notes: string; counter_discount_percent?: number } | string) => {
  const body = typeof payload === 'string' ? { notes: payload } : payload;
  const { data } = await api.post(`/portal/quotation/${quotationId}/negotiate`, body);
  return data;
};

export const addPortalLineComment = async (quotationId: string, itemId: string, payload: { author_name: string; author_role?: string; message: string }) => {
  const { data } = await api.post(`/quotations/${quotationId}/items/${itemId}/comments`, payload);
  return data;
};
