import React, { useEffect, useState } from 'react';
import { listUsers, updateUser, deleteUser, getSystemPermissions } from '../services/adminRbacApi';
import { Users, Filter, Check, UserX, Loader2, Shield, Key, X } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, permsRes] = await Promise.all([
        listUsers({ role: roleFilter || undefined }),
        getSystemPermissions()
      ]);
      if (usersRes.success) setUsers(usersRes.data);
      if (permsRes.success) setAvailablePermissions(permsRes.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const handleToggleStatus = async (targetUser: any) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      if (newStatus === 'INACTIVE') {
        await deleteUser(targetUser.id);
      } else {
        await updateUser(targetUser.id, { status: 'ACTIVE' });
      }
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await updateUser(editingUser.id, { permissions: selectedPermissions });
      if (res.success) {
        setEditingUser(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Platform-Wide User & Role Directory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Super Admin system administration for managing all roles, tenant associations, and granular permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-border-light rounded-lg px-3 py-1.5 text-xs text-text-main"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="seller">Seller</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="sales_rep">Sales Rep</option>
            <option value="finance">Finance</option>
            <option value="operations">Operations</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-border-light text-text-muted uppercase text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">System Role</th>
                <th className="px-6 py-4">Organization / Tenant</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-main">{u.name}</div>
                    <div className="text-xs text-text-muted">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {u.company_name ? (
                      <span className="font-medium text-slate-800">{u.company_name}</span>
                    ) : u.seller_id ? (
                      <span className="font-mono">{u.seller_id.slice(-6)}</span>
                    ) : (
                      <span className="italic text-slate-400">None (Global/Customer)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setSelectedPermissions(u.permissions || []);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border-light">
            <div className="p-6 border-b border-border-light flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Grant Custom Permissions for {editingUser.name}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">Role: {editingUser.role}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-border-light max-h-96 overflow-y-auto">
                {Object.entries(availablePermissions).map(([module, perms]) => (
                  <div key={module} className="border-b border-border-light pb-2">
                    <p className="text-xs font-bold text-text-main uppercase mb-1">{module}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {perms.map(p => (
                        <label key={p} className="flex items-center gap-2 text-xs text-text-main cursor-pointer hover:text-primary">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(p)}
                            onChange={() => togglePermission(p)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span>{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-border-light rounded-lg text-sm text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
