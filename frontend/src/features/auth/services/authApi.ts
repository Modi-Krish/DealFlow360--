import { api } from '../../../shared/lib/axios';

export const login = async (credentials: any) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const signup = async (userData: any) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const fetchMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
