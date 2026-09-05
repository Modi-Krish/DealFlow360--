import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/adminRbacApi';
import { ClipboardList, Filter, RefreshCw, Loader2, Clock, User } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        limit: 100
      });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [moduleFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border-light shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Compliance & System Audit Logs
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Immutable log of all security events, approval decisions, discount violations, warehouse overrides, and access modifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-border-light rounded-lg text-sm text-text-main hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-border-light shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="bg-slate-50 border border-border-light rounded-lg px-3 py-1.5 text-xs text-text-main"
        >
          <option value="">All Modules</option>
          <option value="users">Users & Roles</option>
          <option value="approval">Approvals</option>
          <option value="quotations">Quotations</option>
          <option value="fulfillment">Fulfillment & Warehouses</option>
          <option value="billing">Billing & Invoices</option>
        </select>

        <input
          type="text"
          placeholder="Filter by action name..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-50 border border-border-light rounded-lg px-3 py-1.5 text-xs text-text-main w-56"
        />
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-border-light">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-light overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-border-light text-text-muted uppercase">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Action & Module</th>
                <th className="px-6 py-3.5">Resource</th>
                <th className="px-6 py-3.5">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 whitespace-nowrap text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-text-main flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.user_name || log.user_id}
                    </div>
                    {log.seller_id && (
                      <span className="text-[10px] text-text-muted">Org: {log.seller_id.slice(-6)}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                      log.action.includes('OVERRIDE')
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : log.action.includes('APPROV')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : log.action.includes('REJECT')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {log.action}
                    </span>
                    <span className="block text-[10px] text-text-muted uppercase mt-0.5">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-[11px] text-text-main">
                    <div>{log.resource_type}</div>
                    <div className="text-[10px] text-text-muted truncate max-w-[120px]">{log.resource_id}</div>
                  </td>
                  <td className="px-6 py-3.5 text-text-muted">
                    <div className="text-text-main">{log.reason || 'Standard transaction logged'}</div>
                    {(log.old_value || log.new_value) && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {log.old_value && <span className="line-through mr-1.5">{JSON.stringify(log.old_value)}</span>}
                        {log.new_value && <span className="text-emerald-600 font-semibold">{JSON.stringify(log.new_value)}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No audit logs recorded for this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
