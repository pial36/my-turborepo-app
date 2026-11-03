'use client';

// PATH: apps/web/src/app/(dashboard)/dashboard/audit-log/page.js

import { useEffect, useState } from 'react';
import { Download, Filter, Shield } from 'lucide-react';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import api from '@/lib/api';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const ACTION_TYPES = ['ALL', 'WORKSPACE_CREATED', 'WORKSPACE_UPDATED', 'MEMBER_INVITED',
  'GOAL_CREATED', 'GOAL_UPDATED', 'GOAL_DELETED', 'ANNOUNCEMENT_CREATED',
  'ANNOUNCEMENT_DELETED', 'ACTION_ITEM_CREATED', 'ACTION_ITEM_UPDATED'];

const ACTION_COLORS = {
  WORKSPACE_CREATED: 'text-purple-600 bg-purple-50',
  WORKSPACE_UPDATED: 'text-purple-600 bg-purple-50',
  MEMBER_INVITED: 'text-blue-600 bg-blue-50',
  GOAL_CREATED: 'text-green-600 bg-green-50',
  GOAL_UPDATED: 'text-yellow-600 bg-yellow-50',
  GOAL_DELETED: 'text-red-600 bg-red-50',
  ANNOUNCEMENT_CREATED: 'text-indigo-600 bg-indigo-50',
  ANNOUNCEMENT_DELETED: 'text-red-600 bg-red-50',
  ACTION_ITEM_CREATED: 'text-green-600 bg-green-50',
  ACTION_ITEM_UPDATED: 'text-yellow-600 bg-yellow-50',
};

export default function AuditLogPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  const isAdmin = currentWorkspace?.members?.find(m => m.userId === user?.id)?.role === 'ADMIN';

  const fetchLogs = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const r = await api.get(`/api/audit-logs/${currentWorkspace.id}?${params}`);
      setLogs(r.data.data || []);
    } catch { toast.error('Failed to load audit logs'); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [currentWorkspace?.id]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/api/audit-logs/${currentWorkspace.id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'audit-log.csv';
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
  };

  if (!isAdmin) return (
    <div className="no-access">
      <Shield size={40} strokeWidth={1} />
      <p>Admin access required to view audit logs.</p>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Audit Log</h2>
          <p className="page-sub">Immutable record of all workspace changes</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={14} />
          <select
            className="filter-select"
            value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
          >
            {ACTION_TYPES.map(a => <option key={a} value={a === 'ALL' ? '' : a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <input
          type="date"
          className="filter-input"
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          placeholder="From"
        />
        <input
          type="date"
          className="filter-input"
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          placeholder="To"
        />
        <button className="btn-apply" onClick={fetchLogs}>Apply</button>
        <button className="btn-ghost" onClick={() => { setFilters({ action: '', from: '', to: '' }); setTimeout(fetchLogs, 0); }}>
          Reset
        </button>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="empty">No audit logs found.</div>
      ) : (
        <div className="log-table">
          <div className="log-header">
            <span>Action</span>
            <span>User</span>
            <span>Details</span>
            <span>When</span>
          </div>
          {logs.map(log => (
            <div key={log.id} className="log-row">
              <span>
                <span className={`action-badge ${ACTION_COLORS[log.action] || 'text-gray-600 bg-gray-50'}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
              </span>
              <div className="log-user">
                <div className="log-avatar">
                  {log.user?.avatar
                    ? <img src={log.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(log.user?.name || '')
                  }
                </div>
                <span>{log.user?.name}</span>
              </div>
              <span className="log-meta">
                {log.metadata ? JSON.parse(log.metadata || '{}').title || JSON.parse(log.metadata || '{}').email || '—' : '—'}
              </span>
              <span className="log-time">{formatRelativeTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .page-title { font-size: 22px; font-weight: 700; color: #101828; letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: #6b7280; margin: 0; }
        .no-access { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #98a2b3; text-align: center; }
        .no-access p { font-size: 14px; margin: 0; }
        .btn-export {
          display: flex; align-items: center; gap: 6px; padding: 9px 18px;
          background: #fff; color: #374151; border: 1px solid #e4e7ec;
          border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer;
          font-family: var(--font-sans); transition: all 0.15s;
        }
        .btn-export:hover { background: #f8f9fb; }
        .filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; border: 1px solid #e4e7ec; border-radius: 10px; padding: 12px 16px; }
        .filter-group { display: flex; align-items: center; gap: 6px; color: #6b7280; }
        .filter-select {
          height: 34px; padding: 0 10px; font-size: 13px; border: 1px solid #e4e7ec;
          border-radius: 7px; background: #f8f9fb; cursor: pointer; color: #374151;
          font-family: var(--font-sans); outline: none;
        }
        .filter-input {
          height: 34px; padding: 0 10px; font-size: 13px; border: 1px solid #e4e7ec;
          border-radius: 7px; background: #f8f9fb; color: #374151;
          font-family: var(--font-sans); outline: none;
        }
        .filter-input:focus, .filter-select:focus { border-color: #6366f1; }
        .btn-apply {
          height: 34px; padding: 0 16px; background: #4f46e5; color: #fff;
          border: none; border-radius: 7px; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: var(--font-sans);
        }
        .btn-apply:hover { background: #4338ca; }
        .btn-ghost {
          height: 34px; padding: 0 14px; background: none; border: 1px solid #e4e7ec;
          border-radius: 7px; font-size: 13px; color: #374151; cursor: pointer;
          font-family: var(--font-sans);
        }
        .btn-ghost:hover { background: #f8f9fb; }
        .loading, .empty { text-align: center; padding: 40px; color: #98a2b3; font-size: 14px; }
        .log-table { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; overflow: hidden; }
        .log-header {
          display: grid; grid-template-columns: 220px 160px 1fr 140px;
          padding: 10px 16px; background: #f8f9fb; border-bottom: 1px solid #e4e7ec;
          font-size: 11px; font-weight: 700; color: #98a2b3; text-transform: uppercase; letter-spacing: 0.5px;
          gap: 12px;
        }
        .log-row {
          display: grid; grid-template-columns: 220px 160px 1fr 140px;
          padding: 12px 16px; border-bottom: 1px solid #f8f9fb;
          align-items: center; gap: 12px; transition: background 0.12s;
        }
        .log-row:last-child { border-bottom: none; }
        .log-row:hover { background: #f8f9fb; }
        .action-badge {
          display: inline-flex; align-items: center; padding: 3px 9px;
          border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .text-purple-600 { color: #7c3aed; } .bg-purple-50 { background: #f5f3ff; }
        .text-blue-600 { color: #2563eb; } .bg-blue-50 { background: #eff6ff; }
        .text-green-600 { color: #16a34a; } .bg-green-50 { background: #f0fdf4; }
        .text-yellow-600 { color: #ca8a04; } .bg-yellow-50 { background: #fefce8; }
        .text-red-600 { color: #dc2626; } .bg-red-50 { background: #fef2f2; }
        .text-indigo-600 { color: #4f46e5; } .bg-indigo-50 { background: #eef2ff; }
        .text-gray-600 { color: #4b5563; } .bg-gray-50 { background: #f9fafb; }
        .log-user { display: flex; align-items: center; gap: 8px; }
        .log-avatar {
          width: 26px; height: 26px; border-radius: 50%; background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
        }
        .log-user span { font-size: 13px; color: #374151; font-weight: 500; }
        .log-meta { font-size: 13px; color: #6b7280; }
        .log-time { font-size: 12px; color: #98a2b3; }
        @media (max-width: 900px) {
          .log-header, .log-row { grid-template-columns: 1fr auto; }
        }
      `}</style>
    </div>
  );
}