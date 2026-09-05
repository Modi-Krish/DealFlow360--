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
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    if (role === 'super_admin' || role === 'admin') return true;
    
    const perms = user.permissions || [];
    if (perms.includes('*') || perms.includes(permission)) return true;
    
    // Check wildcard module match (e.g. 'quotations.*')
    const moduleName = permission.split('.')[0];
    if (perms.includes(`${moduleName}.*`)) return true;

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
