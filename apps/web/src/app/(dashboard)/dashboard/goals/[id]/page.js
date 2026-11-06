'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle, Circle, Send } from 'lucide-react';
import useGoalStore from '@/stores/goalStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import { formatDate, formatRelativeTime, getStatusColor, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export default function GoalDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentGoal, goalError, fetchGoal, updateGoal, updateGoalStatus, deleteGoal,
          createMilestone, updateMilestone, setMilestoneProgressLocal, deleteMilestone, postUpdate } = useGoalStore();
  const progressTimers = useRef({});
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [updateText, setUpdateText] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (id) fetchGoal(parseInt(id));
  }, [id]);

  // flush pending slider saves when leaving the page
  useEffect(() => () => Object.values(progressTimers.current).forEach(clearTimeout), []);

  if (!currentGoal || currentGoal.id !== parseInt(id)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#98a2b3' }}>
      {goalError || 'Loading...'}
    </div>
  );

  const members = currentWorkspace?.members || [];
  const isAdmin = members.find(m => m.userId === user?.id)?.role === 'ADMIN';
  // matches the API: only the owner or an admin can edit/delete a goal
  const canEditGoal = isAdmin || currentGoal.ownerId === user?.id;

  const avgProgress = currentGoal.milestones?.length
    ? Math.round(currentGoal.milestones.reduce((a, m) => a + m.progress, 0) / currentGoal.milestones.length)
    : 0;

  const handleStatusChange = async (status) => {
    const r = await updateGoalStatus(currentGoal.id, status);
    if (!r.success) toast.error(r.error);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this goal?')) return;
    const r = await deleteGoal(currentGoal.id);
    if (!r.success) return toast.error(r.error);
    toast.success('Goal deleted');
    router.push('/dashboard/goals');
  };

  const handlePostUpdate = async () => {
    if (!updateText.trim()) return;
    setPosting(true);
    const r = await postUpdate(currentGoal.id, updateText.trim());
    if (r.success) setUpdateText('');
    else toast.error(r.error);
    setPosting(false);
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    const r = await createMilestone(currentGoal.id, { title: newMilestone.trim(), progress: 0 });
    if (r.success) setNewMilestone('');
    else toast.error(r.error);
  };

  // move the slider instantly; save once the user stops dragging
  const handleMilestoneProgress = (milestoneId, progress) => {
    const value = parseInt(progress);
    setMilestoneProgressLocal(milestoneId, value);
    clearTimeout(progressTimers.current[milestoneId]);
    progressTimers.current[milestoneId] = setTimeout(async () => {
      const r = await updateMilestone(milestoneId, { progress: value });
      if (!r.success) toast.error(r.error);
    }, 400);
  };

  return (
    <div className="detail">
      {/* Back */}
      <button className="back-btn" onClick={() => router.push('/dashboard/goals')}>
        <ArrowLeft size={15} /> Goals
      </button>

      <div className="detail-layout">
        {/* Main */}
        <div className="detail-main">
          {/* Header */}
          <div className="detail-card">
            <div className="detail-header">
              <div className="detail-header-left">
                {editingTitle ? (
                  <div className="edit-title-row">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const r = await updateGoal(currentGoal.id, { title: editTitle.trim() });
                          if (r.success) { setEditingTitle(false); toast.success('Goal renamed!'); }
                          else toast.error(r.error);
                        }
                        if (e.key === 'Escape') setEditingTitle(false);
                      }}
                      className="edit-title-input"
                    />
                    <button className="btn-sm-primary" onClick={async () => {
                      const r = await updateGoal(currentGoal.id, { title: editTitle.trim() });
                      if (r.success) { setEditingTitle(false); toast.success('Goal renamed!'); }
                      else toast.error(r.error);
                    }}>Save</button>
                    <button className="btn-ghost-sm" onClick={() => setEditingTitle(false)}>Cancel</button>
                  </div>
                ) : (
                  <h2 className="detail-title">
                    {currentGoal.title}
                    {canEditGoal && (
                      <button
                        className="edit-title-btn"
                        onClick={() => { setEditTitle(currentGoal.title); setEditingTitle(true); }}
                        title="Edit goal name"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </h2>
                )}
                <div className="detail-meta">
                  {canEditGoal ? (
                    <label className="owner-select-label">
                      Owner:{' '}
                      <select
                        className="owner-select"
                        value={currentGoal.ownerId}
                        onChange={async (e) => {
                          const r = await updateGoal(currentGoal.id, { ownerId: Number(e.target.value) });
                          if (r.success) toast.success('Owner updated');
                          else toast.error(r.error);
                        }}
                      >
                        {members.map(m => (
                          <option key={m.userId} value={m.userId}>{m.user?.name}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span>Owner: <strong>{currentGoal.owner?.name}</strong></span>
                  )}
                  {currentGoal.dueDate && <span>Due: <strong>{formatDate(currentGoal.dueDate)}</strong></span>}
                </div>
              </div>
              <div className="detail-header-right">
                <select
                  className="status-select"
                  value={currentGoal.status}
                  onChange={e => handleStatusChange(e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                {canEditGoal && (
                  <button className="icon-btn icon-btn--danger" onClick={handleDelete} title="Delete goal">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Overall progress */}
            {currentGoal.milestones?.length > 0 && (
              <div className="overall-progress">
                <div className="overall-progress-header">
                  <span className="overall-progress-label">Overall Progress</span>
                  <span className="overall-progress-pct">{avgProgress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${avgProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="detail-card">
            <h3 className="section-title">Milestones</h3>
            <div className="milestone-list">
              {currentGoal.milestones?.map(m => (
                <div key={m.id} className="milestone-item">
                  <div className="milestone-header">
                    <span className="milestone-title">{m.title}</span>
                    <div className="milestone-controls">
                      <span className="milestone-pct">{m.progress}%</span>
                      <button
                        className="icon-btn icon-btn--sm icon-btn--danger"
                        onClick={() => deleteMilestone(m.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={m.progress}
                    onChange={e => handleMilestoneProgress(m.id, e.target.value)}
                    className="milestone-range"
                  />
                </div>
              ))}
            </div>
            <form onSubmit={handleAddMilestone} className="add-milestone-form">
              <input
                placeholder="Add milestone..."
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                className="form-input"
              />
              <button type="submit" className="btn-sm-primary">
                <Plus size={13} /> Add
              </button>
            </form>
          </div>

          {/* Action items linked */}
          {currentGoal.actionItems?.length > 0 && (
            <div className="detail-card">
              <h3 className="section-title">Linked Action Items</h3>
              <div className="linked-list">
                {currentGoal.actionItems.map(item => (
                  <div key={item.id} className="linked-item">
                    {item.status === 'DONE'
                      ? <CheckCircle size={15} style={{ color: '#12b76a' }} />
                      : <Circle size={15} style={{ color: '#d1d5db' }} />
                    }
                    <span className="linked-title" style={{ textDecoration: item.status === 'DONE' ? 'line-through' : 'none', color: item.status === 'DONE' ? '#98a2b3' : '#101828' }}>
                      {item.title}
                    </span>
                    {item.assignee && <span className="linked-assignee">{item.assignee.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="detail-sidebar">
          <div className="detail-card">
            <h3 className="section-title">Activity Feed</h3>

            {/* Post update */}
            <div className="update-form">
              <textarea
                placeholder="Post a progress update..."
                value={updateText}
                onChange={e => setUpdateText(e.target.value)}
                className="update-textarea"
                rows={3}
              />
              <button
                className="btn-sm-primary"
                onClick={handlePostUpdate}
                disabled={posting || !updateText.trim()}
              >
                <Send size={13} /> Post
              </button>
            </div>

            <div className="activity-list">
              {currentGoal.updates?.length === 0 && (
                <div style={{ color: '#98a2b3', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                  No updates yet
                </div>
              )}
              {currentGoal.updates?.map(u => (
                <div key={u.id} className="activity-item">
                  <div className="activity-avatar">
                    {u.author?.avatar
                      ? <img src={u.author.avatar} alt={u.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(u.author?.name || '')
                    }
                  </div>
                  <div className="activity-body">
                    <div className="activity-meta">
                      <strong>{u.author?.name}</strong>
                      <span>{formatRelativeTime(u.createdAt)}</span>
                    </div>
                    <p className="activity-content">{u.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .detail { display: flex; flex-direction: column; gap: 20px; }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: #6b7280; background: none; border: none;
          cursor: pointer; font-family: var(--font-sans); padding: 0;
          transition: color 0.12s;
        }
        .back-btn:hover { color: #4f46e5; }
        .detail-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
        .detail-main { display: flex; flex-direction: column; gap: 16px; }
        .detail-sidebar { position: sticky; top: 80px; }
        .detail-card { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; padding: 20px; }
        .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .detail-header-left { min-width: 0; }
        .detail-title { font-size: 20px; font-weight: 700; color: #101828; margin: 0 0 8px; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; }
        .edit-title-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border: 1px solid #e4e7ec; border-radius: 6px;
          background: none; cursor: pointer; color: #98a2b3; opacity: 0;
          transition: opacity 0.15s, color 0.15s; flex-shrink: 0;
        }
        .detail-title:hover .edit-title-btn { opacity: 1; }
        .edit-title-btn:hover { color: #4f46e5; border-color: #c7d2fe; background: #eef2ff; }
        .edit-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .edit-title-input {
          flex: 1; height: 36px; padding: 0 12px; font-size: 16px; font-weight: 600;
          border: 1px solid #6366f1; border-radius: 8px; outline: none;
          font-family: var(--font-sans); color: #101828;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .btn-ghost-sm {
          height: 36px; padding: 0 12px; background: none; border: 1px solid #e4e7ec;
          border-radius: 8px; font-size: 13px; color: #374151; cursor: pointer;
          font-family: var(--font-sans); white-space: nowrap;
        }
        .btn-ghost-sm:hover { background: #f8f9fb; }
        .detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; font-size: 13px; color: #6b7280; }
        .owner-select { font-size: 13px; font-weight: 600; color: #101828; border: 1px solid #e4e7ec; border-radius: 6px; padding: 2px 6px; background: #fff; font-family: var(--font-sans); }
        .detail-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .status-select {
          height: 34px; padding: 0 10px; font-size: 12.5px;
          border: 1px solid #e4e7ec; border-radius: 8px; background: #f8f9fb;
          cursor: pointer; color: #374151; font-family: var(--font-sans);
          outline: none;
        }
        .status-select:focus { border-color: #6366f1; }
        .icon-btn {
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          border: 1px solid #e4e7ec; border-radius: 7px; background: #fff;
          cursor: pointer; color: #6b7280; transition: all 0.12s;
        }
        .icon-btn:hover { background: #f8f9fb; }
        .icon-btn--danger:hover { background: #fef2f2; color: #f04438; border-color: #fecaca; }
        .icon-btn--sm { width: 24px; height: 24px; border: none; background: none; }
        .overall-progress { margin-top: 4px; }
        .overall-progress-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .overall-progress-label { font-size: 13px; color: #6b7280; font-weight: 500; }
        .overall-progress-pct { font-size: 13px; font-weight: 700; color: #4f46e5; }
        .progress-bar { height: 8px; background: #f1f3f7; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 4px; transition: width 0.4s; }
        .section-title { font-size: 14px; font-weight: 700; color: #101828; margin: 0 0 14px; }
        .milestone-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
        .milestone-item { display: flex; flex-direction: column; gap: 6px; }
        .milestone-header { display: flex; align-items: center; justify-content: space-between; }
        .milestone-title { font-size: 13.5px; color: #374151; font-weight: 500; }
        .milestone-controls { display: flex; align-items: center; gap: 6px; }
        .milestone-pct { font-size: 12px; color: #4f46e5; font-weight: 600; }
        .milestone-range { width: 100%; accent-color: #4f46e5; }
        .add-milestone-form { display: flex; gap: 8px; margin-top: 4px; }
        .form-input {
          flex: 1; height: 36px; padding: 0 12px; font-size: 13px;
          border: 1px solid #e4e7ec; border-radius: 8px; outline: none;
          font-family: var(--font-sans); color: #101828;
        }
        .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .btn-sm-primary {
          display: flex; align-items: center; gap: 5px;
          height: 36px; padding: 0 14px; background: #4f46e5; color: #fff;
          border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: var(--font-sans); white-space: nowrap;
          transition: background 0.15s;
        }
        .btn-sm-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-sm-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .linked-list { display: flex; flex-direction: column; gap: 8px; }
        .linked-item { display: flex; align-items: center; gap: 10px; }
        .linked-title { flex: 1; font-size: 13.5px; }
        .linked-assignee { font-size: 12px; color: #98a2b3; }
        .update-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .update-textarea {
          width: 100%; padding: 10px 12px; font-size: 13px;
          border: 1px solid #e4e7ec; border-radius: 8px; resize: none;
          font-family: var(--font-sans); color: #101828; outline: none;
          box-sizing: border-box;
        }
        .update-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .activity-list { display: flex; flex-direction: column; gap: 14px; }
        .activity-item { display: flex; gap: 10px; }
        .activity-avatar {
          width: 30px; height: 30px; border-radius: 50%; background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
          overflow: hidden;
        }
        .activity-body { flex: 1; min-width: 0; }
        .activity-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #6b7280; }
        .activity-meta strong { color: #101828; }
        .activity-content { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
        @media (max-width: 900px) {
          .detail-layout { grid-template-columns: 1fr; }
          .detail-sidebar { position: static; }
        }
      `}</style>
    </div>
  );
}