'use client';

// PATH: apps/web/src/app/(dashboard)/dashboard/analytics/page.js

import { useEffect, useState } from 'react';
import { Download, Target, CheckSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import useWorkspaceStore from '@/stores/workspaceStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#12b76a',
};

const PRIORITY_COLORS = {
  LOW: '#94a3b8',
  MEDIUM: '#f79009',
  HIGH: '#f04438',
  URGENT: '#7c3aed',
};

export default function AnalyticsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    api.get(`/api/analytics/${currentWorkspace.id}`)
      .then(r => { setStats(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentWorkspace?.id]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/api/analytics/${currentWorkspace.id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'workspace-export.csv';
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const goalStatusData = stats?.goalsByStatus?.map(s => ({
    name: s.status.replace(/_/g, ' '),
    value: s._count.status,
    status: s.status,
  })) || [];

  const completionPct = stats?.totalActionItems
    ? Math.round((stats.completedActionItems / stats.totalActionItems) * 100)
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Analytics</h2>
          <p className="page-sub">Performance overview for {currentWorkspace?.name}</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon--blue"><Target size={20} /></div>
              <div>
                <div className="stat-num">{stats?.totalGoals ?? 0}</div>
                <div className="stat-label">Total Goals</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--green"><CheckSquare size={20} /></div>
              <div>
                <div className="stat-num">{stats?.completedThisWeek ?? 0}</div>
                <div className="stat-label">Completed This Week</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--red"><AlertTriangle size={20} /></div>
              <div>
                <div className="stat-num">{stats?.overdueCount ?? 0}</div>
                <div className="stat-label">Overdue Goals</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--purple"><TrendingUp size={20} /></div>
              <div>
                <div className="stat-num">{completionPct}%</div>
                <div className="stat-label">Action Item Completion</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {/* Bar chart */}
            <div className="chart-card">
              <h3 className="chart-title">Goals by Status</h3>
              {goalStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={goalStatusData} barSize={44}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#98a2b3' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#98a2b3' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 13 }} cursor={{ fill: '#f8f9fb' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Goals">
                      {goalStatusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No goal data yet</div>
              )}
            </div>

            {/* Pie chart */}
            <div className="chart-card">
              <h3 className="chart-title">Goal Distribution</h3>
              {goalStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={goalStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {goalStatusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No data</div>
              )}
            </div>
          </div>

          {/* Action items completion */}
          <div className="chart-card">
            <h3 className="chart-title">Action Items Overview</h3>
            <div className="completion-row">
              <div className="completion-info">
                <span className="completion-num">{stats?.completedActionItems ?? 0}</span>
                <span className="completion-label">of {stats?.totalActionItems ?? 0} completed</span>
              </div>
              <div className="completion-bar-wrap">
                <div className="completion-bar">
                  <div className="completion-fill" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="completion-pct">{completionPct}%</span>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .page-title { font-size: 22px; font-weight: 700; color: #101828; letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: #6b7280; margin: 0; }
        .btn-export {
          display: flex; align-items: center; gap: 6px; padding: 9px 18px;
          background: #fff; color: #374151; border: 1px solid #e4e7ec;
          border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer;
          font-family: var(--font-sans); transition: all 0.15s;
        }
        .btn-export:hover { background: #f8f9fb; border-color: #c7d2fe; color: #4f46e5; }
        .loading { text-align: center; padding: 60px; color: #98a2b3; font-size: 14px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-card {
          background: #fff; border: 1px solid #e4e7ec; border-radius: 12px;
          padding: 20px; display: flex; align-items: center; gap: 14px;
        }
        .stat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .stat-icon--blue { background: #eff6ff; color: #3b82f6; }
        .stat-icon--green { background: #f0fdf4; color: #12b76a; }
        .stat-icon--red { background: #fef2f2; color: #f04438; }
        .stat-icon--purple { background: #eef2ff; color: #4f46e5; }
        .stat-num { font-size: 28px; font-weight: 700; color: #101828; letter-spacing: -0.5px; }
        .stat-label { font-size: 12px; color: #98a2b3; font-weight: 500; margin-top: 2px; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .chart-card { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 20px; }
        .chart-title { font-size: 14px; font-weight: 700; color: #101828; margin: 0 0 16px; }
        .chart-empty { height: 220px; display: flex; align-items: center; justify-content: center; color: #98a2b3; font-size: 13px; }
        .completion-row { display: flex; align-items: center; gap: 24px; }
        .completion-info { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 80px; }
        .completion-num { font-size: 32px; font-weight: 700; color: #101828; letter-spacing: -1px; }
        .completion-label { font-size: 12px; color: #98a2b3; white-space: nowrap; }
        .completion-bar-wrap { flex: 1; display: flex; align-items: center; gap: 12px; }
        .completion-bar { flex: 1; height: 12px; background: #f1f3f7; border-radius: 6px; overflow: hidden; }
        .completion-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 6px; transition: width 0.5s; }
        .completion-pct { font-size: 14px; font-weight: 700; color: #4f46e5; white-space: nowrap; }
        @media (max-width: 1024px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}