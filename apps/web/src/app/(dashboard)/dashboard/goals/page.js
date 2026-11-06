'use client';

import { useEffect, useState } from 'react';
import { Plus, Target, ChevronRight, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import useGoalStore from '@/stores/goalStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import { formatDate, getStatusColor } from '@/lib/utils';
import GoalModal from '@/components/goals/GoalModal';

const STATUS_FILTERS = ['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export default function GoalsPage() {
  const { goals, fetchGoals, isLoading } = useGoalStore();
  const { currentWorkspace, fetchWorkspaceById } = useWorkspaceStore();
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    // Refresh workspace data to get latest permissions
    fetchWorkspaceById(currentWorkspace.id);
    fetchGoals(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const filtered = filter === 'ALL' ? goals : goals.filter(g => g.status === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Goals</h2>
          <p className="page-sub">{goals.length} goal{goals.length !== 1 ? 's' : ''} in this workspace</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            className={`filter-btn ${filter === s ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="loading">Loading goals...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Target size={40} strokeWidth={1} />
          <p>No goals yet. Create your first goal to get started.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Create Goal
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {filtered.map(goal => (
            <Link key={goal.id} href={`/dashboard/goals/${goal.id}`} className="goal-card">
              <div className="goal-card-header">
                <span className={`badge ${getStatusColor(goal.status)}`}>
                  {goal.status.replace('_', ' ')}
                </span>
                <ChevronRight size={16} className="goal-card-arrow" />
              </div>
              <h3 className="goal-card-title">{goal.title}</h3>

              {/* Milestones progress */}
              {goal.milestones?.length > 0 && (
                <div className="goal-progress">
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{
                        width: `${Math.round(
                          goal.milestones.reduce((a, m) => a + m.progress, 0) / goal.milestones.length
                        )}%`
                      }}
                    />
                  </div>
                  <span className="goal-progress-pct">
                    {Math.round(goal.milestones.reduce((a, m) => a + m.progress, 0) / goal.milestones.length)}%
                  </span>
                </div>
              )}

              <div className="goal-card-meta">
                {goal.owner && (
                  <span className="goal-meta-item">
                    <User size={12} /> {goal.owner.name}
                  </span>
                )}
                {goal.dueDate && (
                  <span className="goal-meta-item">
                    <Calendar size={12} /> {formatDate(goal.dueDate)}
                  </span>
                )}
                {goal.milestones?.length > 0 && (
                  <span className="goal-meta-item">
                    {goal.milestones.length} milestone{goal.milestones.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <GoalModal onClose={() => setShowModal(false)} workspaceId={currentWorkspace?.id} />
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .page-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: var(--c-text-3); margin: 0; }
        .btn-primary {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; background: #4f46e5; color: #fff;
          border: none; border-radius: 9px; font-size: 13.5px;
          font-weight: 600; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.15s; text-decoration: none;
        }
        .btn-primary:hover { background: #4338ca; }
        .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
        .filter-btn {
          padding: 6px 14px; background: var(--c-surface); border: 1px solid var(--c-border);
          border-radius: 20px; font-size: 12.5px; color: var(--c-text-3);
          cursor: pointer; font-family: var(--font-sans); transition: all 0.12s;
          font-weight: 500;
        }
        .filter-btn:hover { border-color: var(--c-accent-border); color: #4f46e5; }
        .filter-btn--active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .loading { text-align: center; padding: 40px; color: var(--c-text-4); font-size: 14px; }
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 60px 20px; color: var(--c-text-4); text-align: center;
        }
        .empty-state p { font-size: 14px; margin: 0; }
        .goals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        :global(.goal-card) {
          background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px;
          padding: 20px; text-decoration: none; display: flex; flex-direction: column;
          gap: 12px; transition: box-shadow 0.15s, transform 0.15s;
        }
        :global(.goal-card:hover) { box-shadow: 0 4px 16px rgba(16,24,40,0.08); transform: translateY(-1px); }
        .goal-card-header { display: flex; align-items: center; justify-content: space-between; }
        .goal-card-arrow { color: var(--c-text-4); }
        .goal-card-title { font-size: 15px; font-weight: 600; color: var(--c-text); margin: 0; line-height: 1.4; }
        .goal-progress { display: flex; align-items: center; gap: 10px; }
        .goal-progress-bar { flex: 1; height: 6px; background: var(--c-surface-2); border-radius: 3px; overflow: hidden; }
        .goal-progress-fill { height: 100%; background: #4f46e5; border-radius: 3px; transition: width 0.3s; }
        .goal-progress-pct { font-size: 12px; font-weight: 600; color: #4f46e5; white-space: nowrap; }
        .goal-card-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: auto; }
        .goal-meta-item {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; color: var(--c-text-4);
        }
        :global(.badge) {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }
      `}</style>
    </div>
  );
}