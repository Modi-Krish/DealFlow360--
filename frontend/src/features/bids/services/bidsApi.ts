import { api } from '../../../shared/lib/axios';

export interface BidHistoryItem {
  actor_role: string;
  actor_name: string;
  action: string;
  price: number | string;
  message?: string;
  timestamp: string;
}

export interface Bid {
  id: string;
  bid_number: string;
  product_id: string;
  product_name: string;
  seller_id: string;
  seller_name: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  quantity: number;
  original_price: number | string;
  proposed_price: number | string;
  seller_counter_price?: number | string | null;
  final_agreed_price?: number | string | null;
  is_final_offer: boolean;
  total_amount: number | string;
  delivery_address?: string;
  notes?: string;
  status: 'PENDING_SELLER_REVIEW' | 'SELLER_COUNTERED' | 'CUSTOMER_COUNTERED' | 'AGREED' | 'REJECTED' | 'CANCELLED';
  invoice_id?: string | null;
  invoice_number?: string | null;
  fulfillment_id?: string | null;
  fulfillment_number?: string | null;
  history: BidHistoryItem[];
  created_at?: string;
}

export interface CreateBidPayload {
  product_id: string;
  quantity: number;
  proposed_price: number;
  delivery_address: string;
  notes?: string;
}

export interface CartCheckoutItemPayload {
  product_id: string;
  quantity: number;
  proposed_price: number;
}

export interface CartCheckoutPayload {
  items: CartCheckoutItemPayload[];
  delivery_address: string;
  notes?: string;
}

export interface SellerActionPayload {
  action: 'ACCEPT' | 'COUNTER' | 'REJECT';
  counter_price?: number;
  is_final_offer?: boolean;
  notes?: string;
}

export interface CustomerActionPayload {
  action: 'ACCEPT' | 'COUNTER' | 'CANCEL';
  proposed_price?: number;
  notes?: string;
}

export interface FulfillmentOrder {
  id: string;
  order_number: string;
  bid_id?: string;
  seller_id?: string;
  seller_name?: string;
  customer_name?: string;
  delivery_address?: string;
  product_name?: string;
  quantity_to_deliver?: number;
  status: string;
  dispatch_notes?: string;
  tracking_number?: string;
  carrier?: string;
}

// Bids API
export const getBids = async (params?: { seller_id?: string; customer_id?: string; status?: string }): Promise<Bid[]> => {
  const { data } = await api.get('/bids/', { params });
  return data.data;
};

export const getBidById = async (id: string): Promise<Bid> => {
  const { data } = await api.get(`/bids/${id}`);
  return data.data;
};

export const createBid = async (payload: CreateBidPayload): Promise<Bid> => {
  const { data } = await api.post('/bids/', payload);
  return data.data;
};

export const cartCheckout = async (payload: CartCheckoutPayload): Promise<Bid[]> => {
  const { data } = await api.post('/bids/cart-checkout', payload);
  return data.data;
};

export const sellerBidAction = async ({ bidId, payload }: { bidId: string; payload: SellerActionPayload }): Promise<Bid> => {
  const { data } = await api.post(`/bids/${bidId}/seller-action`, payload);
  return data.data;
};

export const customerBidAction = async ({ bidId, payload }: { bidId: string; payload: CustomerActionPayload }): Promise<Bid> => {
  const { data } = await api.post(`/bids/${bidId}/customer-action`, payload);
  return data.data;
};

// Fulfillment & Warehouse API
export const getFulfillmentOrders = async (seller_id?: string): Promise<FulfillmentOrder[]> => {
  const { data } = await api.get('/fulfillment/orders', { params: seller_id ? { seller_id } : {} });
  return data.data;
};

export const updateDeliveryStatus = async ({
  orderId,
  payload,
}: {
  orderId: string;
  payload: { status: string; carrier?: string; tracking_number?: string; dispatch_notes?: string };
}): Promise<FulfillmentOrder> => {
  const { data } = await api.post(`/fulfillment/orders/${orderId}/status`, payload);
  return data.data;
};
