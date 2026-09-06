import { api } from '../../../shared/lib/axios';

export const getQuotations = async () => {
  const { data } = await api.get('/quotations');
  return data.data;
};

export const getQuotation = async (id: string) => {
  const { data } = await api.get(`/quotations/${id}`);
  return data.data;
};

export const createQuotation = async (quotationData: { customer_id: string }) => {
  const { data } = await api.post('/quotations', quotationData);
  return data.data;
};

export const addQuotationItem = async (quotationId: string, itemData: any) => {
  const { data } = await api.post(`/quotations/${quotationId}/items`, itemData);
  return data.data;
};

export const deleteQuotationItem = async (quotationId: string, itemIndex: number) => {
  const { data } = await api.delete(`/quotations/${quotationId}/items/${itemIndex}`);
  return data.data;
};

export const submitQuotation = async (quotationId: string) => {
  const { data } = await api.post(`/quotations/${quotationId}/submit`);
  return data.data;
};

export const getDiscountRules = async () => {
  const { data } = await api.get('/pricing/discount-rules');
  return data.data;
};

export const updateDiscountRules = async (rulesData: any) => {
  const { data } = await api.put('/pricing/discount-rules', rulesData);
  return data.data;
};

export const addLineComment = async (quotationId: string, itemId: string, payload: { author_name: string; author_role?: string; message: string }) => {
  const { data } = await api.post(`/quotations/${quotationId}/items/${itemId}/comments`, payload);
  return data.data;
};

export const getQuotationRecommendations = async (quotationId: string) => {
  const { data } = await api.get(`/recommendations/${quotationId}`);
  return data.data;
};

export const nudgeSalesRep = async (quotationId: string, reason?: string) => {
  const { data } = await api.post(`/quotations/${quotationId}/nudge`, { reason });
  return data.data;
};

export const escalateDeal = async (quotationId: string, reason?: string) => {
  const { data } = await api.post(`/quotations/${quotationId}/escalate`, { reason });
  return data.data;
};

export const updateQuotationStatus = async (quotationId: string, status: string) => {
  const { data } = await api.put(`/quotations/${quotationId}/status`, { status });
  return data.data;
};
