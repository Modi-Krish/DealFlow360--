import { api } from '../../../shared/lib/axios';

export const getFulfillmentOrders = async () => {
  const { data } = await api.get('/fulfillment/orders');
  return data.data;
};

export const allocateQuotation = async (quotationId: string) => {
  const { data } = await api.post(`/fulfillment/allocate/${quotationId}`);
  return data;
};

export const updateDeliveryStatus = async (orderId: string, payload: { status: string; carrier?: string; tracking_number?: string; dispatch_notes?: string }) => {
  const { data } = await api.post(`/fulfillment/orders/${orderId}/status`, payload);
  return data.data;
};

export const overrideWarehouseSplit = async (orderId: string, warehouseName: string, reason: string) => {
  const { data } = await api.post(`/fulfillment/orders/${orderId}/override`, {
    warehouse_name: warehouseName,
    reason
  });
  return data.data;
};

export const consolidateBackorders = async (orderId: string) => {
  const { data } = await api.post(`/fulfillment/orders/${orderId}/consolidate`);
  return data.data;
};

export const getWarehouses = async () => {
  const { data } = await api.get('/fulfillment/warehouses');
  return data.data;
};

export const createWarehouse = async (payload: {
  name: string;
  location?: string;
  shipping_cost_per_kg?: number;
  priority_weight?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active?: boolean;
}) => {
  const { data } = await api.post('/fulfillment/warehouses', payload);
  return data.data;
};

export const updateWarehouse = async (
  warehouseId: string,
  payload: {
    name: string;
    location?: string;
    shipping_cost_per_kg?: number;
    priority_weight?: number;
    reorder_point?: number;
    reorder_quantity?: number;
    is_active?: boolean;
  }
) => {
  const { data } = await api.put(`/fulfillment/warehouses/${warehouseId}`, payload);
  return data.data;
};
