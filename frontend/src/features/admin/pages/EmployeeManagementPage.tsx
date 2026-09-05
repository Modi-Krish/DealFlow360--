import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../shared/store/authStore';
import { listUsers, createUser, updateUser, deleteUser, getSystemPermissions } from '../services/adminRbacApi';
import { UserPlus, Shield, Check, X, Key, Building, UserX, Loader2, AlertCircle } from 'lucide-react';

export const EmployeeManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales_rep');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, permsRes] = await Promise.all([
        listUsers(),
        getSystemPermissions()
      ]);
      if (usersRes.success) {
        setEmployees(usersRes.data);
      }
      if (permsRes.success) {
        setAvailablePermissions(permsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await createUser({
        name,
        email,
        password,
        role,
        permissions: selectedPermissions
      });
      if (res.success) {
        setShowAddModal(false);
        setName('');
        setEmail('');
        setPassword('');
        setRole('sales_rep');
        setSelectedPermissions([]);
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingEmployee) return;
    setSubmitting(true);
    try {
      const res = await updateUser(editingEmployee.id, {
        permissions: selectedPermissions
      });
      if (res.success) {
        setEditingEmployee(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: any) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      if (newStatus === 'INACTIVE') {
        await deleteUser(emp.id);
      } else {
        await updateUser(emp.id, { status: 'ACTIVE' });
      }
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to change user status');
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" />
            Organization Employees & Access Control
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage {user?.company_name || 'your organization'}'s sales managers, reps, finance, and operations personnel with granular permission overrides.
          </p>
        </div>
        <button
          onClick={() => {
            setName('');
            setEmail('');
            setPassword('');
            setRole('sales_rep');
            setSelectedPermissions([]);
            setError('');
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
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
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">System Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Effective Permissions</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-text-main">{emp.name}</div>
                    <div className="text-xs text-text-muted">{emp.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase ${
                      emp.role === 'sales_manager'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : emp.role === 'sales_rep'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : emp.role === 'finance'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : emp.role === 'operations'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {emp.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      emp.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {(emp.permissions || []).slice(0, 4).map((p: string) => (
                        <span key={p} className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {p}
                        </span>
                      ))}
                      {(emp.permissions || []).length > 4 && (
                        <span className="text-[11px] text-text-muted font-mono">
                          +{emp.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setSelectedPermissions(emp.permissions || []);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Configure Permissions
                    </button>
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-red-600 transition-colors"
                    >
                      {emp.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No employees found in this organization. Click "Add Employee" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border-light">
            <div className="p-6 border-b border-border-light flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Create New Organization Employee
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 flex-1">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Marcus Vance"
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. marcus@apex.com"
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Employee Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-border-light rounded-lg p-2.5 text-sm"
                  >
                    <option value="sales_manager">Sales Manager</option>
                    <option value="sales_rep">Sales Rep</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">
                  Assign Granular Permissions (Module.Action)
                </label>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-border-light max-h-60 overflow-y-auto">
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
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-border-light rounded-lg text-sm text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary text-slate-950 font-semibold rounded-lg text-sm hover:opacity-90 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-border-light">
            <div className="p-6 border-b border-border-light flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Customize Permissions for {editingEmployee.name}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">Role: {editingEmployee.role}</p>
              </div>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-text-muted">
                Enable or disable individual capabilities for this employee. These permissions supplement the default permissions granted by their role.
              </p>

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
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-border-light rounded-lg text-sm text-text-muted hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermissions}
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
