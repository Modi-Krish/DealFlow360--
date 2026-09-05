import { api } from '../../../shared/lib/axios';

export const getDashboardMetrics = async () => {
  const { data } = await api.get('/analytics/metrics');
  return data.data;
};

export const getDealHealth = async () => {
  const { data } = await api.get('/analytics/deal-health');
  return data.data;
};
