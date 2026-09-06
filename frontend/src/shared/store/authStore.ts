import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions?: string[];
  seller_id?: string | null;
  company_name?: string | null;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isInitializing: boolean;
  initAuth: () => Promise<void>;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isInitializing: !!localStorage.getItem('access_token'),
  initAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, token: null, isInitializing: false });
      return;
    }
    try {
      const { api } = await import('../lib/axios');
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.data) {
        set({
          user: response.data.data,
          token,
          isInitializing: false
        });
      } else {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isInitializing: false });
      }
    } catch (err) {
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isInitializing: false });
    }
  },
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token, isInitializing: false });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null, isInitializing: false });
  },
  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    if (role === 'super_admin' || role === 'admin') return true;

    // Operations persona inherently has operational authorization over logistics & stock
    if (['operations', 'ops', 'warehouse_ops'].includes(role)) {
      const opsModules = [
        'warehouse.view', 'warehouses.view', 'warehouse.create', 'warehouse.update', 'warehouses.update',
        'inventory.view', 'inventories.view', 'inventory.manage', 'inventory.create', 'inventory.update',
        'fulfillment.view', 'fulfillment.split', 'fulfillment.override', 'fulfillment.backorder', 'fulfillment.consolidate',
        'dashboard.view', 'audit_logs.view', 'products.view'
      ];
      if (opsModules.includes(permission)) return true;
    }

    // Seller organization owner has inherent access to view and manage their sales pipeline, quotations, warehouse dispatch & fulfillment
    if (['seller', 'sales_manager'].includes(role)) {
      const sellerModules = [
        'warehouse.view', 'warehouses.view', 'inventory.view', 'inventories.view',
        'fulfillment.view', 'quotations.view', 'approval.view', 'customers.view',
        'users.view', 'reports.view', 'products.view', 'pricing.view', 'billing.view'
      ];
      if (sellerModules.includes(permission)) return true;
    }
    
    const perms = user.permissions || [];
    if (perms.includes('*') || perms.includes(permission)) return true;
    
    // Check wildcard module match (e.g. 'quotations.*')
    const moduleName = permission.split('.')[0];
    if (perms.includes(`${moduleName}.*`)) return true;

    // Singular / Plural and Feature aliases
    const aliases: Record<string, string[]> = {
      'warehouse.view': ['warehouses.view', 'inventory.view', 'fulfillment.view'],
      'warehouses.view': ['warehouse.view', 'inventory.view'],
      'warehouse.create': ['warehouses.create'],
      'warehouses.create': ['warehouse.create'],
      'warehouse.update': ['warehouses.update'],
      'warehouses.update': ['warehouse.update'],
      'inventory.view': ['inventories.view', 'warehouses.view', 'warehouse.view'],
      'inventories.view': ['inventory.view', 'warehouse.view', 'warehouses.view'],
      'pricing.view': ['price_lists.view', 'discounts.view'],
      'price_lists.view': ['pricing.view'],
      'discounts.view': ['pricing.view']
    };

    const altList = aliases[permission] || [];
    for (const alt of altList) {
      if (perms.includes(alt) || perms.includes(`${alt.split('.')[0]}.*`)) {
        return true;
      }
    }

    return false;
  },
  hasRole: (roles: string | string[]) => {
    const { user } = get();
    if (!user) return false;
    const userRole = (user.role || '').toLowerCase();
    if (userRole === 'super_admin' || userRole === 'admin') return true;

    const allowed = Array.isArray(roles) ? roles : [roles];
    const normalizedAllowed = allowed.map(r => r.toLowerCase());
    return normalizedAllowed.includes(userRole);
  }
}));
