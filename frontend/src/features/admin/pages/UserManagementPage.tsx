import React, { useEffect, useState, useMemo } from 'react';
import { listUsers, createUser, updateUser, deleteUser, getSystemPermissions } from '../services/adminRbacApi';
import { 
  Users, Filter, Check, UserX, Loader2, Shield, Key, X, Plus, Search, 
  UserPlus, Mail, Lock, Building, CheckSquare, Square, AlertCircle, 
  Sparkles, CheckCircle2, RotateCcw
} from 'lucide-react';

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  super_admin: [
    'users.view', 'users.create', 'users.update', 'users.delete',
    'sellers.view', 'sellers.create', 'sellers.update', 'sellers.delete',
    'products.view', 'products.create', 'products.update', 'products.delete',
    'price_lists.view', 'price_lists.create', 'price_lists.update', 'price_lists.delete',
    'pricing.view', 'pricing.manage',
    'discounts.view', 'discounts.create', 'discounts.update', 'discounts.delete', 'discounts.approve',
    'approval.view', 'approval.approve', 'approval.reject', 'approval.return',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.delete', 'quotations.submit', 'quotations.negotiate', 'quotations.confirm',
    'customers.view', 'customers.create', 'customers.update',
    'warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete',
    'warehouse.view', 'warehouse.create', 'warehouse.update', 'warehouse.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.manage', 'inventories.view',
    'fulfillment.view', 'fulfillment.split', 'fulfillment.override', 'fulfillment.backorder', 'fulfillment.consolidate',
    'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel',
    'billing.view', 'billing.create', 'billing.update', 'billing.reconcile',
    'credit_notes.view', 'credit_notes.create', 'credit_notes.approve',
    'reports.view', 'reports.export',
    'dashboard.view', 'dashboard.deal_health',
    'upsell.view', 'upsell.create', 'upsell.update', 'upsell.delete',
    'audit_logs.view',
    'settings.view', 'settings.update'
  ],
  seller: [
    'users.view', 'users.create', 'users.update', 'users.delete',
    'products.view', 'products.create', 'products.update', 'products.delete',
    'price_lists.view', 'price_lists.create', 'price_lists.update', 'price_lists.delete',
    'pricing.view', 'pricing.manage',
    'discounts.view', 'discounts.create', 'discounts.update', 'discounts.delete', 'discounts.approve',
    'approval.view', 'approval.approve', 'approval.reject', 'approval.return',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.delete', 'quotations.submit', 'quotations.negotiate', 'quotations.confirm',
    'customers.view', 'customers.create', 'customers.update',
    'warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.manage',
    'fulfillment.view', 'fulfillment.split', 'fulfillment.override', 'fulfillment.backorder', 'fulfillment.consolidate',
    'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel',
    'billing.view', 'billing.create', 'billing.update', 'billing.reconcile',
    'credit_notes.view', 'credit_notes.create', 'credit_notes.approve',
    'reports.view', 'reports.export',
    'dashboard.view', 'dashboard.deal_health',
    'upsell.view', 'upsell.create', 'upsell.update', 'upsell.delete',
    'audit_logs.view',
    'settings.view', 'settings.update'
  ],
  sales_manager: [
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.submit', 'quotations.negotiate',
    'approval.view', 'approval.approve', 'approval.reject', 'approval.return',
    'discounts.view', 'discounts.approve',
    'products.view',
    'price_lists.view', 'pricing.view',
    'customers.view', 'customers.create', 'customers.update',
    'dashboard.view', 'dashboard.deal_health',
    'reports.view', 'reports.export',
    'upsell.view'
  ],
  sales_rep: [
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.submit', 'quotations.negotiate',
    'products.view',
    'price_lists.view', 'pricing.view',
    'customers.view', 'customers.create',
    'dashboard.view', 'dashboard.deal_health',
    'upsell.view'
  ],
  finance: [
    'approval.view', 'approval.approve', 'approval.reject', 'approval.return',
    'discounts.view', 'discounts.approve',
    'quotations.view',
    'billing.view', 'billing.create', 'billing.update', 'billing.reconcile',
    'credit_notes.view', 'credit_notes.create', 'credit_notes.approve',
    'subscriptions.view',
    'reports.view', 'reports.export',
    'dashboard.view'
  ],
  operations: [
    'warehouses.view', 'warehouses.create', 'warehouses.update',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.manage',
    'fulfillment.view', 'fulfillment.split', 'fulfillment.override', 'fulfillment.backorder', 'fulfillment.consolidate',
    'products.view',
    'quotations.view',
    'dashboard.view',
    'audit_logs.view'
  ],
  customer: [
    'quotations.view', 'quotations.negotiate', 'quotations.confirm',
    'subscriptions.view',
    'billing.view',
    'dashboard.view'
  ]
};

const ROLE_DEFINITIONS = [
  { id: 'super_admin', label: 'Super Admin', desc: 'Platform-wide administrator with full system access', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'seller', label: 'Seller / Organization', desc: 'Independent organization root with employee, product & warehouse control', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'sales_manager', label: 'Sales Manager', desc: 'Manages sales team, reviews pipeline & approves deal discounts', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'sales_rep', label: 'Sales Rep', desc: 'Creates quotations, negotiates deals & interacts with customers', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'finance', label: 'Finance', desc: 'Manages billing, invoices, reconciliation & credit note approvals', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'operations', label: 'Operations & Warehouse', desc: 'Manages warehouses, inventory, orders & fulfillment split overrides', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'customer', label: 'Customer / Buyer', desc: 'External buyer account to review quotes, negotiate & confirm orders', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' }
];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  
  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('sales_rep');
  const [createSellerId, setCreateSellerId] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>(DEFAULT_ROLE_PERMS.sales_rep || []);
  const [createPermSearch, setCreatePermSearch] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Permissions Modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editPermSearch, setEditPermSearch] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, permsRes, sellersRes] = await Promise.all([
        listUsers({ role: roleFilter || undefined }),
        getSystemPermissions(),
        listUsers({ role: 'seller' })
      ]);
      if (usersRes.success) setUsers(usersRes.data);
      if (permsRes.success) setAvailablePermissions(permsRes.data);
      if (sellersRes.success) setSellers(sellersRes.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  useEffect(() => {
    if (successToast) {
      const t = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successToast]);

  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('sales_rep');
    setCreateSellerId('');
    setCreateCompany('');
    setCreatePermissions(DEFAULT_ROLE_PERMS.sales_rep || []);
    setCreatePermSearch('');
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleRoleChange = (newRole: string) => {
    setCreateRole(newRole);
    // Auto-prefill recommended default permissions for this role
    const defaults = DEFAULT_ROLE_PERMS[newRole] || [];
    setCreatePermissions(defaults);
  };

  const handleSellerSelect = (sellerId: string) => {
    setCreateSellerId(sellerId);
    if (sellerId) {
      const found = sellers.find(s => s.id === sellerId);
      if (found) {
        setCreateCompany(found.company_name || found.name);
      }
    } else {
      setCreateCompany('');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createName.trim()) {
      setCreateError('Full Name is required');
      return;
    }
    if (!createEmail.trim()) {
      setCreateError('Email is required');
      return;
    }
    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters long');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload: any = {
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        permissions: createPermissions,
        seller_id: createSellerId || undefined,
        company_name: createCompany.trim() || undefined
      };

      const res = await createUser(payload);
      if (res.success) {
        setShowCreateModal(false);
        setSuccessToast(`User "${createName}" successfully created with role ${createRole.toUpperCase()}`);
        loadData();
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || err.message || 'Failed to create user');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: any) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      if (newStatus === 'INACTIVE') {
        await deleteUser(targetUser.id);
      } else {
        await updateUser(targetUser.id, { status: 'ACTIVE' });
      }
      loadData();
      setSuccessToast(`User ${targetUser.name} status changed to ${newStatus}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setEditSubmitting(true);
    try {
      const res = await updateUser(editingUser.id, { permissions: editPermissions });
      if (res.success) {
        setEditingUser(null);
        setSuccessToast(`Permissions updated for ${editingUser.name}`);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Helper toggle permission item
  const togglePermissionInList = (perm: string, list: string[], setList: (vals: string[]) => void) => {
    if (list.includes(perm)) {
      setList(list.filter(p => p !== perm));
    } else {
      setList([...list, perm]);
    }
  };

  // Helper toggle entire module group
  const toggleModuleInList = (modulePerms: string[], list: string[], setList: (vals: string[]) => void) => {
    const allSelected = modulePerms.every(p => list.includes(p));
    if (allSelected) {
      setList(list.filter(p => !modulePerms.includes(p)));
    } else {
      setList(Array.from(new Set([...list, ...modulePerms])));
    }
  };

  // Filtered users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.company_name?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const allAvailableList = useMemo(() => {
    return Array.from(new Set(Object.values(availablePermissions).flat()));
  }, [availablePermissions]);

  const getRoleBadgeStyle = (role: string) => {
    const found = ROLE_DEFINITIONS.find(r => r.id === role);
    return found ? found.badgeColor : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Platform-Wide User & Role Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Super Admin directory for provisioning users with any role and tailored granular permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-border-light rounded-lg text-xs text-text-main placeholder-text-muted w-44 sm:w-52 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-border-light rounded-lg px-2.5 py-1.5 text-xs text-text-main">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs text-text-main focus:outline-none cursor-pointer"
            >
              <option value="">All Roles ({users.length})</option>
              <option value="super_admin">Super Admin</option>
              <option value="seller">Seller</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="sales_rep">Sales Rep</option>
              <option value="finance">Finance</option>
              <option value="operations">Operations</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* + Create User Button */}
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-xs hover:opacity-90 shadow-sm transition-all active:scale-95"
            title="Create user with custom role and access rights"
          >
            <Plus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Main Users Table */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-border-light text-text-muted uppercase text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">System Role</th>
                <th className="px-6 py-4">Organization / Tenant</th>
                <th className="px-6 py-4">Active Permissions</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-main">{u.name}</div>
                    <div className="text-xs text-text-muted">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase border ${getRoleBadgeStyle(u.role)}`}>
                      {u.role ? u.role.replace('_', ' ') : 'USER'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {u.company_name ? (
                      <span className="font-medium text-slate-800 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {u.company_name}
                      </span>
                    ) : u.seller_id ? (
                      <span className="font-mono text-slate-500">Org #{u.seller_id.slice(-6)}</span>
                    ) : (
                      <span className="italic text-slate-400">Platform Global</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1 max-w-xs">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-semibold border border-rose-200">
                          <Sparkles className="w-3 h-3" /> Full Platform Access (*)
                        </span>
                      ) : (
                        <>
                          {(u.permissions || []).slice(0, 3).map((p: string) => (
                            <span key={p} className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                              {p}
                            </span>
                          ))}
                          {(u.permissions || []).length > 3 && (
                            <span className="text-[11px] text-text-muted font-mono font-semibold bg-slate-50 px-1.5 py-0.5 rounded">
                              +{(u.permissions || []).length - 3} more
                            </span>
                          )}
                          {(!u.permissions || u.permissions.length === 0) && (
                            <span className="text-xs text-slate-400 italic">Role defaults only</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setEditPermissions(u.permissions || []);
                        setEditPermSearch('');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      title="Fine tune specific permissions"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Permissions
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-red-600 transition-colors"
                    >
                      {u.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                    <p className="text-sm font-medium">No users matched the criteria.</p>
                    <button
                      onClick={handleOpenCreateModal}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-slate-950 font-semibold rounded-lg text-xs hover:opacity-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create New User
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-border-light overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-light flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-slate-950 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-main">
                    Create User & Configure Access
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Assign any platform role and specifically provide customized permissions.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Section 1: Basic Information */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  User Details & Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">Full Name *</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Morgan"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-border-light rounded-lg text-sm text-text-main focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">Work Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. alex@company.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-border-light rounded-lg text-sm text-text-main focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">Password * (min 6 characters)</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-border-light rounded-lg text-sm text-text-main focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">Select System Role *</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={createRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-border-light rounded-lg text-sm text-text-main font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      >
                        {ROLE_DEFINITIONS.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Role Description Card */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-border-light flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-text-main flex items-center gap-2">
                      <span>Assigned Role:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadgeStyle(createRole)}`}>
                        {ROLE_DEFINITIONS.find(r => r.id === createRole)?.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {ROLE_DEFINITIONS.find(r => r.id === createRole)?.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Organization / Tenant Association */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" />
                  Organization / Tenant Mapping
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['sales_manager', 'sales_rep', 'finance', 'operations'].includes(createRole) ? (
                    <div>
                      <label className="block text-xs font-semibold text-text-main mb-1">
                        Link to Existing Seller Organization
                      </label>
                      <select
                        value={createSellerId}
                        onChange={(e) => handleSellerSelect(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-border-light rounded-lg text-xs text-text-main"
                      >
                        <option value="">-- None (Independent / Global) --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.company_name || s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1">
                      Organization / Company Name
                    </label>
                    <input
                      type="text"
                      placeholder={createRole === 'seller' ? 'e.g. Acme Corp (required for sellers)' : 'e.g. Enterprise Client LLC'}
                      value={createCompany}
                      onChange={(e) => setCreateCompany(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-border-light rounded-lg text-xs text-text-main"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Granular Access Rights & Custom Permissions */}
              <div className="pt-2 border-t border-border-light">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      Granular Access Rights & Permissions
                    </h3>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Check specific capabilities you want to grant this user ({createPermissions.length} of {allAvailableList.length} granted).
                    </p>
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCreatePermissions(DEFAULT_ROLE_PERMS[createRole] || [])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 flex items-center gap-1"
                      title="Reset permissions to standard defaults for chosen role"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Role Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatePermissions(allAvailableList)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1"
                      title="Grant all platform permissions"
                    >
                      <CheckSquare className="w-3 h-3" />
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatePermissions([])}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 border border-rose-200 flex items-center gap-1"
                      title="Remove all permissions"
                    >
                      <Square className="w-3 h-3" />
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Permissions Search Filter */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter specific access (e.g. quotation, discount, warehouse, approval)..."
                    value={createPermSearch}
                    onChange={(e) => setCreatePermSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-border-light rounded-lg text-xs text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Permissions Group Container */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-border-light max-h-72 overflow-y-auto">
                  {Object.entries(availablePermissions).map(([module, perms]) => {
                    const filteredPerms = createPermSearch
                      ? perms.filter(p => p.toLowerCase().includes(createPermSearch.toLowerCase()))
                      : perms;

                    if (filteredPerms.length === 0) return null;

                    const allInModuleSelected = perms.every(p => createPermissions.includes(p));
                    const selectedCount = perms.filter(p => createPermissions.includes(p)).length;

                    return (
                      <div key={module} className="bg-white p-3 rounded-lg border border-border-light shadow-2xs">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border-light">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-main uppercase tracking-wide">
                              {module.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600">
                              {selectedCount}/{perms.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleModuleInList(perms, createPermissions, setCreatePermissions)}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            {allInModuleSelected ? 'Deselect Module' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredPerms.map(p => {
                            const isChecked = createPermissions.includes(p);
                            return (
                              <label
                                key={p}
                                className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors border ${
                                  isChecked
                                    ? 'bg-amber-50/30 border-primary/40 text-slate-900 font-medium'
                                    : 'bg-white border-transparent text-text-main hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermissionInList(p, createPermissions, setCreatePermissions)}
                                  className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span className="font-mono text-[11px]">{p}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-light">
                <div className="text-xs text-text-muted">
                  Creating as <span className="font-semibold text-text-main">{ROLE_DEFINITIONS.find(r => r.id === createRole)?.label}</span> with <span className="font-semibold text-text-main">{createPermissions.length}</span> custom rights.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-5 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-xs hover:opacity-90 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create User</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border-light overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border-light flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 text-slate-950 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-main flex items-center gap-2">
                    Modify Permissions for {editingUser.name}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Role: <span className="font-semibold uppercase text-slate-800">{editingUser.role}</span> | Email: {editingUser.email}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text-main">
                  Active Access Rights ({editPermissions.length} of {allAvailableList.length} enabled)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditPermissions(DEFAULT_ROLE_PERMS[editingUser.role] || [])}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 border border-slate-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(allAvailableList)}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3" />
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions([])}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded hover:bg-rose-100 border border-rose-200 flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter permissions..."
                  value={editPermSearch}
                  onChange={(e) => setEditPermSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-border-light rounded-lg text-xs text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Permissions list */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-border-light max-h-80 overflow-y-auto">
                {Object.entries(availablePermissions).map(([module, perms]) => {
                  const filteredPerms = editPermSearch
                    ? perms.filter(p => p.toLowerCase().includes(editPermSearch.toLowerCase()))
                    : perms;

                  if (filteredPerms.length === 0) return null;

                  const allInModuleSelected = perms.every(p => editPermissions.includes(p));
                  const selectedCount = perms.filter(p => editPermissions.includes(p)).length;

                  return (
                    <div key={module} className="bg-white p-3 rounded-lg border border-border-light shadow-2xs">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border-light">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-main uppercase tracking-wide">
                            {module.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600">
                            {selectedCount}/{perms.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleModuleInList(perms, editPermissions, setEditPermissions)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          {allInModuleSelected ? 'Deselect' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredPerms.map(p => {
                          const isChecked = editPermissions.includes(p);
                          return (
                            <label
                              key={p}
                              className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors border ${
                                isChecked
                                  ? 'bg-amber-50/30 border-primary/40 text-slate-900 font-medium'
                                  : 'bg-white border-transparent text-text-main hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermissionInList(p, editPermissions, setEditPermissions)}
                                className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="font-mono text-[11px]">{p}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-border-light rounded-lg text-xs font-semibold text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-xs hover:opacity-90 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
