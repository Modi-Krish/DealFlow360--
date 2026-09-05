import { api } from '../../../shared/lib/axios';

export const getFulfillmentOrders = async () => {
  const { data } = await api.get('/fulfillment/orders');
  return data.data;
};

export const allocateQuotation = async (quotationId: string) => {
  const { data } = await api.post(`/fulfillment/allocate/${quotationId}`);
  return data; // returning the whole response since we want to know success/fail for shortages
};
