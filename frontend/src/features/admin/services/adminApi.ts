import { api } from '../../../shared/lib/axios';

// Products API
export const getProducts = async () => {
  const { data } = await api.get('/products');
  return data.data;
};

// Customers API
export const getCustomers = async () => {
  const { data } = await api.get('/customers');
  return data.data;
};

// Pricing API
export const getPriceLists = async () => {
  const { data } = await api.get('/price-lists');
  return data.data;
};
