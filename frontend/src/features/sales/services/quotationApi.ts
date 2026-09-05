import { api } from '../../../shared/lib/axios';

export const getQuotations = async () => {
  const { data } = await api.get('/quotations');
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
