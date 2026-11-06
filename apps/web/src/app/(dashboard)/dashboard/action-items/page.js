'use client';

import { useEffect, useState } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import useActionStore, { KANBAN_COLUMNS } from '@/stores/actionStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import { getPriorityColor, getStatusColor, formatDate, getInitials } from '@/lib/utils';
import ActionItemModal from '@/components/actions/Actionitemmodal';
import toast from 'react-hot-toast';

export default function ActionItemsPage() {
  const { actionItems, fetchActionItems, updateActionItem, deleteActionItem, view, setView, isLoading, error } = useActionStore();
  const { currentWorkspace, fetchWorkspaceById } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    // Refresh workspace data to get latest permissions
    fetchWorkspaceById(currentWorkspace.id);
    fetchActionItems(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const handleDragStart = (e, item) => {
    setDragging(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!dragging || dragging.status === status) return;
    // updateActionItem moves the card optimistically and rolls back on error
    const r = await updateActionItem(dragging.id, { status });
    if (!r.success) toast.error(r.error);
    setDragging(null);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    const r = await deleteActionItem(id);
    if (r.success) {
      toast.success('Deleted');
    } else {
      toast.error(r.error);
    }
  };

  // Check if user can edit/delete an action item
  const canEditDelete = (item) => {
    if (!user) return false;
    const isAdmin = currentWorkspace?.members?.find(m => m.userId === user.id)?.role === 'ADMIN';
    const isCreator = item.creator?.id === user.id;
    return isAdmin || isCreator;
  };

  // the assignee may also move their own card (matches the API rule)
  const canMove = (item) => canEditDelete(item) || (!!user && item.assigneeId === user.id);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Action Items</h2>
          <p className="page-sub">{actionItems.length} item{actionItems.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button
              className={`view-btn ${view === 'kanban' ? 'view-btn--active' : ''}`}
              onClick={() => setView('kanban')}
            >
              <LayoutGrid size={15} /> Board
            </button>
            <button
              className={`view-btn ${view === 'list' ? 'view-btn--active' : ''}`}
              onClick={() => setView('list')}
            >
              <List size={15} /> List
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <Plus size={15} /> New Item
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="loading">{error}</div>
      ) : view === 'kanban' ? (
        /* ── Kanban ── */
        <div className="kanban">
          {KANBAN_COLUMNS.map(col => {
            const items = actionItems.filter(a => a.status === col.id);
            return (
              <div
                key={col.id}
                className="kanban-col"
                onDrop={e => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
              >
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-col-count">{items.length}</span>
                </div>
                <div className="kanban-cards">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`kanban-card ${canMove(item) ? '' : 'kanban-card--locked'}`}
                      draggable={canMove(item)}
                      onDragStart={e => handleDragStart(e, item)}
                      title={canMove(item) ? 'Drag to change status' : 'Only the creator, assignee or an admin can move this'}
                    >
                      <p className="kanban-card-title">{item.title}</p>
                      <div className="kanban-card-meta">
                        <span className={`badge ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                        {item.dueDate && <span className="kanban-card-date">{formatDate(item.dueDate)}</span>}
                      </div>
                      {item.assignee && (
                        <div className="kanban-card-assignee">
                          <div className="mini-avatar">
                            {item.assignee.avatar
                              ? <img src={item.assignee.avatar} alt={item.assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : getInitials(item.assignee.name)
                            }
                          </div>
                          <span>{item.assignee.name}</span>
                        </div>
                      )}
                      {item.creator && (
                        <div className="kanban-card-creator">
                          <span className="creator-label">By: {item.creator.name}</span>
                        </div>
                      )}
                      {canEditDelete(item) && (
                        <div className="kanban-card-actions">
                          <button className="card-action-btn" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                          <button className="card-action-btn card-action-btn--danger" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List ── */
        <div className="list-view">
          <div className="list-header-row">
            <span>Title</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due</span><span>Creator</span><span></span>
          </div>
          {actionItems.length === 0 && <div className="loading">No items yet</div>}
          {actionItems.map(item => (
            <div key={item.id} className="list-row">
              <span className="list-row-title">{item.title}</span>
              <span className={`badge ${getStatusColor(item.status)}`}>{item.status}</span>
              <span className={`badge ${getPriorityColor(item.priority)}`}>{item.priority}</span>
              <span className="list-row-meta">{item.assignee?.name || '—'}</span>
              <span className="list-row-meta">{item.dueDate ? formatDate(item.dueDate) : '—'}</span>
              <span className="list-row-meta" title={`Created by: ${item.creator?.name}`}>{item.creator?.name || '—'}</span>
              {canEditDelete(item) && (
                <div className="list-row-actions">
                  <button className="card-action-btn" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                  <button className="card-action-btn card-action-btn--danger" onClick={() => handleDelete(item.id)}>Del</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ActionItemModal
          item={editItem}
          workspaceId={currentWorkspace?.id}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .page-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: var(--c-text-3); margin: 0; }
        .page-actions { display: flex; gap: 10px; align-items: center; }
        .view-toggle { display: flex; background: var(--c-surface-2); border-radius: 9px; padding: 3px; }
        .view-btn {
          display: flex; align-items: center; gap: 5px; padding: 5px 12px;
          font-size: 12.5px; font-weight: 500; border: none; background: none;
          border-radius: 7px; cursor: pointer; color: var(--c-text-3); transition: all 0.12s;
          font-family: var(--font-sans);
        }
        .view-btn--active { background: var(--c-surface); color: var(--c-text); box-shadow: 0 1px 3px rgba(16,24,40,0.1); }
        .btn-primary {
          display: flex; align-items: center; gap: 6px; padding: 9px 18px;
          background: #4f46e5; color: #fff; border: none; border-radius: 9px;
          font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.15s;
        }
        .btn-primary:hover { background: #4338ca; }
        .loading { text-align: center; padding: 40px; color: var(--c-text-4); font-size: 14px; }

        /* Kanban */
        .kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
        .kanban-col { background: var(--c-bg); border-radius: 12px; padding: 14px; min-height: 200px; }
        .kanban-col-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .kanban-col-title { font-size: 13px; font-weight: 700; color: var(--c-text-2); }
        .kanban-col-count {
          width: 22px; height: 22px; background: var(--c-surface-3); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: var(--c-text-3);
        }
        .kanban-cards { display: flex; flex-direction: column; gap: 8px; }
        .kanban-card {
          background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px;
          padding: 12px; cursor: grab; transition: box-shadow 0.15s;
          display: flex; flex-direction: column; gap: 8px;
        }
        .kanban-card:hover { box-shadow: 0 4px 12px rgba(16,24,40,0.08); }
        .kanban-card:active { cursor: grabbing; }
        .kanban-card--locked { cursor: default; opacity: 0.85; }
        .kanban-card-title { font-size: 13.5px; color: var(--c-text); font-weight: 500; margin: 0; line-height: 1.4; }
        .kanban-card-meta { display: flex; align-items: center; gap: 8px; }
        .kanban-card-date { font-size: 11px; color: var(--c-text-4); }
        .kanban-card-assignee { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--c-text-3); }
        .kanban-card-creator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--c-text-4); margin-top: 4px; }
        .creator-label { font-size: 11px; color: var(--c-text-4); }
        .mini-avatar {
          width: 20px; height: 20px; border-radius: 50%; background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0;
        }
        .kanban-card-actions { display: flex; gap: 6px; }
        .card-action-btn {
          font-size: 11px; color: var(--c-text-3); background: var(--c-bg); border: none;
          border-radius: 5px; padding: 3px 8px; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.12s;
        }
        .card-action-btn:hover { background: var(--c-surface-3); }
        .card-action-btn--danger:hover { background: var(--c-danger-soft); color: #f04438; }

        /* List */120px 100px;
          padding: 10px 16px; background: var(--c-bg); border-bottom: 1px solid var(--c-border);
          font-size: 11px; font-weight: 700; color: var(--c-text-4); text-transform: uppercase; letter-spacing: 0.5px;
          gap: 8px;
        }
        .list-row {
          display: grid; grid-template-columns: 1fr 120px 100px 140px 110px 120px 10
        }
        .list-row {
          display: grid; grid-template-columns: 1fr 120px 100px 140px 110px 80px;
          padding: 12px 16px; border-bottom: 1px solid var(--c-border-soft); gap: 8px;
          align-items: center; transition: background 0.12s;
        }
        .list-row:last-child { border-bottom: none; }
        .list-row:hover { background: var(--c-bg); }
        .list-row-title { font-size: 13.5px; color: var(--c-text); font-weight: 500; }
        .list-row-meta { font-size: 13px; color: var(--c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .list-row-actions { display: flex; gap: 6px; }
        :global(.badge) {
          display: inline-flex; align-items: center; padding: 2px 8px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        @media (max-width: 900px) {
          .kanban { grid-template-columns: 1fr; }
          .list-header-row, .list-row { grid-template-columns: 1fr auto; }
        }
      `}</style>
    </div>
  );
}