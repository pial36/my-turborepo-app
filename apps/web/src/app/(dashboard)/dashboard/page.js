'use client';

import { useEffect, useState } from 'react';
import { Target, CheckSquare, AlertTriangle, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useWorkspaceStore from '@/stores/workspaceStore';
import useGoalStore from '@/stores/goalStore';
import useActionStore from '@/stores/actionStore';
import api from '@/lib/api';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'; 

const STATUS_COLORS = {
  NOT_STARTED: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#12b76a',
};

export default function DashboardPage() {
  const { currentWorkspace, fetchWorkspaceById } = useWorkspaceStore();
  const { goals, fetchGoals } = useGoalStore();
  const { actionItems, fetchActionItems } = useActionStore();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    // Refresh workspace data to get latest permissions
    fetchWorkspaceById(currentWorkspace.id);
    fetchGoals(currentWorkspace.id);
    fetchActionItems(currentWorkspace.id);
    api.get(`/api/analytics/${currentWorkspace.id}`)
      .then(r => setStats(r.data.data))
      .catch(() => {});
  }, [currentWorkspace?.id]);

  const chartData = stats?.goalsByStatus?.map(s => ({
    name: s.status.replace('_', ' '),
    count: s._count.status,
    status: s.status,
  })) || [];

  const recentGoals = goals.slice(0, 5);
  const todayItems = actionItems.filter(a => a.status !== 'DONE').slice(0, 5);

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">
            {currentWorkspace?.name || 'Your Workspace'}
          </h2>
          <p className="dash-sub">Here's what's happening across your team today.</p>
        </div>
        <div className="dash-actions">
          <Link href="/dashboard/goals" className="dash-btn dash-btn--secondary">
            View goals
          </Link>
          <Link href="/dashboard/action-items" className="dash-btn dash-btn--primary">
            <Plus size={14} /> New item
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">
            <Target size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-num">{stats?.totalGoals ?? '—'}</span>
            <span className="stat-label">Total Goals</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">
            <CheckSquare size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-num">{stats?.completedThisWeek ?? '—'}</span>
            <span className="stat-label">Completed This Week</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--red">
            <AlertTriangle size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-num">{stats?.overdueCount ?? '—'}</span>
            <span className="stat-label">Overdue Goals</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--purple">
            <TrendingUp size={18} />
          </div>
          <div className="stat-body">
            <span className="stat-num">
              {stats?.totalActionItems
                ? `${Math.round((stats.completedActionItems / stats.totalActionItems) * 100)}%`
                : '—'}
            </span>
            <span className="stat-label">Action Item Completion</span>
          </div>
        </div>
      </div>

      {/* Chart + recent goals */}
      <div className="dash-grid">
        {/* Chart */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Goal Status Overview</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--c-text-4)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--c-text-4)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13 }}
                  cursor={{ fill: 'var(--c-bg)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-empty">No goal data yet</div>
          )}
        </div>

        {/* Recent goals */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Recent Goals</h3>
            <Link href="/dashboard/goals" className="dash-card-link">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="dash-list">
            {recentGoals.length === 0 && (
              <div className="dash-empty">No goals yet</div>
            )}
            {recentGoals.map(goal => (
              <Link key={goal.id} href={`/dashboard/goals/${goal.id}`} className="dash-list-item">
                <div className="dash-list-main">
                  <span className="dash-list-name">{goal.title}</span>
                  <span className="dash-list-meta">{goal.owner?.name}</span>
                </div>
                <div className="dash-list-right">
                  <span className={`badge ${getStatusColor(goal.status)}`}>
                    {goal.status.replace('_', ' ')}
                  </span>
                  {goal.dueDate && (
                    <span className="dash-list-date">{formatDate(goal.dueDate)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pending action items */}
      <div className="dash-card">
        <div className="dash-card-header">
          <h3 className="dash-card-title">Pending Action Items</h3>
          <Link href="/dashboard/action-items" className="dash-card-link">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="action-table">
          {todayItems.length === 0 && (
            <div className="dash-empty">No pending items</div>
          )}
          {todayItems.map(item => (
            <div key={item.id} className="action-row">
              <div className="action-row-main">
                <span className="action-row-title">{item.title}</span>
                <span className="action-row-goal">{item.goal?.title}</span>
              </div>
              <div className="action-row-right">
                <span className={`badge ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                <span className={`badge ${getStatusColor(item.status)}`}>{item.status}</span>
                {item.assignee && (
                  <span className="action-row-assignee">{item.assignee.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .dash { display: flex; flex-direction: column; gap: 24px; }
        .dash-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .dash-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.4px; margin: 0 0 4px; }
        .dash-sub { font-size: 14px; color: var(--c-text-3); margin: 0; }
        .dash-actions { display: flex; gap: 10px; }
        :global(.dash-btn) {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 9px; font-size: 13.5px;
          font-weight: 600; text-decoration: none; cursor: pointer;
          border: none; font-family: var(--font-sans); transition: all 0.15s;
        }
        :global(.dash-btn--primary) { background: #4f46e5; color: #fff; }
        :global(.dash-btn--primary:hover) { background: #4338ca; }
        :global(.dash-btn--secondary) { background: var(--c-surface); color: var(--c-text-2); border: 1px solid var(--c-border); }
        :global(.dash-btn--secondary:hover) { background: var(--c-bg); }

        /* Stats */
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-card {
          background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px;
          padding: 20px; display: flex; align-items: center; gap: 14px;
        }
        .stat-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .stat-icon--blue { background: var(--c-info-soft); color: #3b82f6; }
        .stat-icon--green { background: var(--c-success-soft); color: #12b76a; }
        .stat-icon--red { background: var(--c-danger-soft); color: #f04438; }
        .stat-icon--purple { background: var(--c-accent-soft); color: #4f46e5; }
        .stat-body { display: flex; flex-direction: column; gap: 2px; }
        .stat-num { font-size: 26px; font-weight: 700; color: var(--c-text); letter-spacing: -0.5px; }
        .stat-label { font-size: 12px; color: var(--c-text-4); font-weight: 500; }

        /* Grid */
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .dash-card {
          background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 20px;
        }
        .dash-card-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        .dash-card-title { font-size: 14px; font-weight: 700; color: var(--c-text); margin: 0; }
        :global(.dash-card-link) {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; color: #4f46e5; font-weight: 500; text-decoration: none;
        }
        :global(.dash-card-link:hover) { text-decoration: underline; }
        .dash-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--c-text-4); }

        /* Goal list */
        .dash-list { display: flex; flex-direction: column; gap: 2px; }
        :global(.dash-list-item) {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 8px; border-radius: 8px; text-decoration: none;
          transition: background 0.12s; gap: 12px;
        }
        :global(.dash-list-item:hover) { background: var(--c-bg); }
        .dash-list-main { min-width: 0; }
        .dash-list-name { display: block; font-size: 13.5px; color: var(--c-text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dash-list-meta { display: block; font-size: 12px; color: var(--c-text-4); margin-top: 1px; }
        .dash-list-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dash-list-date { font-size: 11px; color: var(--c-text-4); }

        /* Badge */
        :global(.badge) {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 20px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }

        /* Action table */
        .action-table { display: flex; flex-direction: column; gap: 2px; }
        .action-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 8px; border-radius: 8px; gap: 12px;
          border-bottom: 1px solid var(--c-border-soft);
        }
        .action-row:last-child { border-bottom: none; }
        .action-row-main { min-width: 0; }
        .action-row-title { display: block; font-size: 13.5px; color: var(--c-text); font-weight: 500; }
        .action-row-goal { display: block; font-size: 12px; color: var(--c-text-4); margin-top: 1px; }
        .action-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .action-row-assignee { font-size: 12px; color: var(--c-text-3); }

        @media (max-width: 1024px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}