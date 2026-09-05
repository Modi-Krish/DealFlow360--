import { api } from '../../../shared/lib/axios';

export const listUsers = async (params?: { role?: string; seller_id?: string }) => {
  const response = await api.get('/users/', { params });
  return response.data;
};

export const createUser = async (userData: any) => {
  const response = await api.post('/users/', userData);
  return response.data;
};

export const updateUser = async (userId: string, data: any) => {
  const response = await api.put(`/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const getAuditLogs = async (params?: { module?: string; action?: string; limit?: number }) => {
  const response = await api.get('/audit-logs/', { params });
  return response.data;
};

export const getSystemRoles = async () => {
  const response = await api.get('/users/meta/roles');
  return response.data;
};

export const getSystemPermissions = async () => {
  const response = await api.get('/users/meta/permissions');
  return response.data;
};

export const getApprovals = async () => {
  const response = await api.get('/approvals/');
  return response.data;
};

export const actOnApproval = async (approvalId: string, action: string, reason: string) => {
  const response = await api.post(`/approvals/${approvalId}/act`, { action, reason });
  return response.data;
};

export const overrideWarehouseSplit = async (orderId: string, warehouseName: string, reason: string) => {
  const response = await api.post(`/fulfillment/orders/${orderId}/override`, {
    warehouse_name: warehouseName,
    reason: reason
  });
  return response.data;
};
