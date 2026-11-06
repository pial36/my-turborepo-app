'use client';

// PATH: apps/web/src/components/actions/ActionItemModal.js

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useActionStore from '@/stores/actionStore';
import useGoalStore from '@/stores/goalStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import toast from 'react-hot-toast';

export default function ActionItemModal({ item, workspaceId, onClose }) {
  const { createActionItem, updateActionItem } = useActionStore();
  const { goals, fetchGoals } = useGoalStore();
  const { currentWorkspace } = useWorkspaceStore();
  const isEdit = !!item;

  const [form, setForm] = useState({
    title: item?.title || '',
    priority: item?.priority || 'MEDIUM',
    status: item?.status || 'TODO',
    dueDate: item?.dueDate ? item.dueDate.split('T')[0] : '',
    goalId: item?.goalId || '',
    assigneeId: item?.assigneeId || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) fetchGoals(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const members = currentWorkspace?.members || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);

    const data = {
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      goalId: form.goalId ? parseInt(form.goalId) : undefined,
      assigneeId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
    };

    const r = isEdit
      ? await updateActionItem(item.id, data)
      : await createActionItem(workspaceId, data);

    setLoading(false);
    if (r.success) {
      toast.success(isEdit ? 'Updated!' : 'Created!');
      onClose();
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit Action Item' : 'New Action Item'}</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label className="label">Title *</label>
            <input
              autoFocus
              placeholder="e.g. Write unit tests"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                <option value="TODO">To Do</option>
                <option value="DOING">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
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
            <label className="label">Linked goal</label>
            <select value={form.goalId} onChange={e => setForm({ ...form, goalId: e.target.value })} className="input">
              <option value="">— None —</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="label">Assignee</label>
            <select value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} className="input">
              <option value="">— Unassigned —</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>{m.user?.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create item'}
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
          background: var(--c-surface); border-radius: 14px; width: 100%; max-width: 460px;
          box-shadow: 0 20px 48px rgba(16,24,40,0.16); margin: 16px;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 0;
        }
        .modal-title { font-size: 16px; font-weight: 700; color: var(--c-text); margin: 0; }
        .modal-close {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; color: var(--c-text-4); border-radius: 6px;
        }
        .modal-close:hover { background: var(--c-surface-2); }
        .modal-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .label { font-size: 13px; font-weight: 500; color: var(--c-text-2); }
        .input {
          height: 40px; padding: 0 12px; font-size: 13.5px;
          border: 1px solid var(--c-border-2); border-radius: 8px; outline: none;
          font-family: var(--font-sans); color: var(--c-text); background: var(--c-surface);
          transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box;
        }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
        .btn-ghost {
          height: 38px; padding: 0 16px; background: none; border: 1px solid var(--c-border);
          border-radius: 8px; font-size: 13px; color: var(--c-text-2); cursor: pointer;
          font-family: var(--font-sans);
        }
        .btn-ghost:hover { background: var(--c-bg); }
        .btn-primary {
          height: 38px; padding: 0 18px; background: #4f46e5; color: #fff;
          border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: var(--font-sans);
        }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}