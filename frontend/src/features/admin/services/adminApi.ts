import { api } from '../../../shared/lib/axios';

export interface CreateProductPayload {
  name: string;
  sku?: string;
  category_id?: string;
  description?: string;
  base_price: number | string;
  unit?: string;
  tax_rate?: number | string;
  status?: string;
  seller_id?: string;
  seller_name?: string;
  stock_quantity?: number;
  variants?: Array<{ attribute: string; value: string; price_surcharge?: number }>;
}

export interface CreateCustomerPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  customer_tier?: string;
  address?: string;
  status?: string;
}

// Products API
export const getProducts = async () => {
  const { data } = await api.get('/products');
  return data.data;
};

export const createProduct = async (payload: CreateProductPayload) => {
  const { data } = await api.post('/products', payload);
  return data.data;
};

export const archiveProduct = async (productId: string) => {
  const { data } = await api.post(`/products/${productId}/archive`);
  return data.data;
};

// Categories API
export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return data.data;
};

export const createCategory = async (payload: { name: string; description?: string }) => {
  const { data } = await api.post('/categories', payload);
  return data.data;
};

// Customers API
export const getCustomers = async () => {
  const { data } = await api.get('/customers');
  return data.data;
};

export const createCustomer = async (payload: CreateCustomerPayload) => {
  const { data } = await api.post('/customers', payload);
  return data.data;
};

// Pricing API
export const getPriceLists = async () => {
  const { data } = await api.get('/price-lists');
  return data.data;
};
