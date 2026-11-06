'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import useGoalStore from '@/stores/goalStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function GoalModal({ onClose, workspaceId }) {
  const { createGoal } = useGoalStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const members = currentWorkspace?.members || [];
  const [form, setForm] = useState({ title: '', dueDate: '', status: 'NOT_STARTED', ownerId: user?.id || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);
    const r = await createGoal(workspaceId, {
      title: form.title.trim(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      status: form.status,
      ownerId: form.ownerId ? Number(form.ownerId) : undefined,
    });
    setLoading(false);
    if (r.success) { toast.success('Goal created!'); onClose(); }
    else toast.error(r.error);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">New Goal</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label className="label">Goal title *</label>
            <input
              autoFocus
              placeholder="e.g. Launch v2.0"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label">Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="input"
            />
          </div>
          <div className="field">
            <label className="label">Owner</label>
            <select value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })} className="input">
              {members.map(m => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name}{m.userId === user?.id ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(16,24,40,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; backdrop-filter: blur(2px);
        }
        .modal {
          background: #fff; border-radius: 14px; width: 100%; max-width: 440px;
          box-shadow: 0 20px 48px rgba(16,24,40,0.16); margin: 16px;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 0;
        }
        .modal-title { font-size: 16px; font-weight: 700; color: #101828; margin: 0; }
        .modal-close {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; color: #98a2b3; border-radius: 6px;
          transition: background 0.12s;
        }
        .modal-close:hover { background: #f1f3f7; color: #374151; }
        .modal-form { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 13px; font-weight: 500; color: #374151; }
        .input {
          height: 40px; padding: 0 12px; font-size: 13.5px;
          border: 1px solid #d1d5db; border-radius: 8px; outline: none;
          font-family: var(--font-sans); color: #101828; background: #fff;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
        .btn-ghost {
          height: 38px; padding: 0 16px; background: none; border: 1px solid #e4e7ec;
          border-radius: 8px; font-size: 13px; color: #374151; cursor: pointer;
          font-family: var(--font-sans); transition: background 0.12s;
        }
        .btn-ghost:hover { background: #f8f9fb; }
        .btn-primary {
          height: 38px; padding: 0 18px; background: #4f46e5; color: #fff;
          border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: var(--font-sans); transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}