'use client';

// PATH: apps/web/src/app/(dashboard)/dashboard/settings/page.js

import { useState, useEffect } from 'react';
import { Save, UserPlus, Trash2, Shield, User, AlertTriangle } from 'lucide-react';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PERMISSIONS } from '@teamhub/shared';



export default function SettingsPage() {
  const { currentWorkspace, updateWorkspace, inviteMember, removeMember, updateMemberRole, updateMemberPermissions, deleteWorkspace, fetchWorkspaceById, invites, fetchInvites, cancelInvite } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [wsForm, setWsForm] = useState({ name: '', description: '', accentColor: '#6366f1' });
  const [originalForm, setOriginalForm] = useState({ name: '', description: '', accentColor: '#6366f1' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const isAdmin = currentWorkspace?.members?.find(m => m.userId === user?.id)?.role === 'ADMIN';
  const canInvite = isAdmin || currentWorkspace?.members?.find(m => m.userId === user?.id)?.canInviteMembers;

  const hasChanges = wsForm.name !== originalForm.name
    || wsForm.description !== originalForm.description
    || wsForm.accentColor !== originalForm.accentColor;

  useEffect(() => {
    if (currentWorkspace?.id) {
      // Refresh workspace data to get latest permissions
      fetchWorkspaceById(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (currentWorkspace?.id && isAdmin) fetchInvites(currentWorkspace.id);
  }, [currentWorkspace?.id, isAdmin]);

  useEffect(() => {
    if (currentWorkspace) {
      const vals = {
        name: currentWorkspace.name || '',
        description: currentWorkspace.description || '',
        accentColor: currentWorkspace.accentColor || '#6366f1',
      };
      setWsForm(vals);
      setOriginalForm(vals);
    }
  }, [currentWorkspace?.id]);

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return toast.error('Workspace name is required');
    if (!hasChanges) return;
    setSaving(true);
    const r = await updateWorkspace(currentWorkspace.id, wsForm);
    setSaving(false);
    if (r.success) {
      setOriginalForm({ ...wsForm });
      toast.success('Workspace updated!');
    }
    else toast.error(r.error);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const r = await inviteMember(currentWorkspace.id, inviteEmail.trim());
    setInviting(false);
    if (r.success) {
      toast.success(r.message);
      setInviteEmail('');
    } else {
      toast.error(r.error);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the workspace?')) return;
    const r = await removeMember(currentWorkspace.id, userId);
    if (r.success) toast.success('Member removed');
    else toast.error(r.error);
  };

  const handleRoleChange = async (userId, role) => {
    const r = await updateMemberRole(currentWorkspace.id, userId, role);
    if (r.success) toast.success('Role updated');
    else toast.error(r.error);
  };

  const members = currentWorkspace?.members || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">Manage your workspace configuration</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'general' ? 'tab--active' : ''}`} onClick={() => setActiveTab('general')}>
          General
        </button>
        <button className={`tab ${activeTab === 'members' ? 'tab--active' : ''}`} onClick={() => setActiveTab('members')}>
          Members ({members.length})
        </button>
        {isAdmin && (
          <button className={`tab ${activeTab === 'permissions' ? 'tab--active' : ''}`} onClick={() => setActiveTab('permissions')}>
            Permissions
          </button>
        )}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="settings-card">
          <h3 className="section-title">Workspace Settings</h3>
          {!isAdmin && <p className="no-perm">Only admins can edit workspace settings.</p>}
          <form onSubmit={handleSaveWorkspace} className="settings-form">
            <div className="field">
              <label className="label">Workspace name *</label>
              <input value={wsForm.name} onChange={e => setWsForm({ ...wsForm, name: e.target.value })} className="input" disabled={!isAdmin} />
            </div>
            <div className="field">
              <label className="label">Description</label>
              <textarea
                value={wsForm.description}
                onChange={e => setWsForm({ ...wsForm, description: e.target.value })}
                className="input input--textarea"
                rows={3}
                disabled={!isAdmin}
                placeholder="What is this workspace for?"
              />
            </div>
            <div className="field">
              <label className="label">Accent colour</label>
              <div className="color-row">
                <input
                  type="color"
                  value={wsForm.accentColor}
                  onChange={e => setWsForm({ ...wsForm, accentColor: e.target.value })}
                  className="color-input"
                  disabled={!isAdmin}
                />
                <span className="color-value">{wsForm.accentColor}</span>
                <div className="color-preview" style={{ background: wsForm.accentColor }} />
              </div>
            </div>
            {isAdmin && (
              <div className="form-footer">
                <button type="submit" className="btn-primary" disabled={saving || !hasChanges}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </form>

          {/* Danger zone */}
          {isAdmin && (
            <div className="danger-zone">
              <h4 className="danger-title"><AlertTriangle size={14} /> Danger Zone</h4>
              <p className="danger-desc">Deleting a workspace is permanent and will remove all goals, action items, and announcements.</p>
              <button
                className="btn-danger"
                onClick={async () => {
                  if (!confirm(`Are you sure you want to delete "${currentWorkspace.name}"? This action cannot be undone.`)) return;
                  const r = await deleteWorkspace(currentWorkspace.id);
                  if (r.success) toast.success('Workspace deleted');
                  else toast.error(r.error);
                }}
              >
                <Trash2 size={14} /> Delete this workspace
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="settings-card">
          <h3 className="section-title">Team Members</h3>

          {/* Invite */}
          {canInvite && (
            <form onSubmit={handleInvite} className="invite-form">
              <input
                type="email"
                placeholder="Invite by email address..."
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="input"
              />
              <button type="submit" className="btn-primary" disabled={inviting}>
                <UserPlus size={14} /> {inviting ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          )}

          {/* Pending invites — emails that haven't signed up yet */}
          {isAdmin && invites.length > 0 && (
            <div className="pending-invites">
              <div className="pending-title">Pending invites</div>
              {invites.map(inv => (
                <div key={inv.id} className="pending-row">
                  <span className="pending-email">{inv.email}</span>
                  <span className="pending-hint">joins when they sign up</span>
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Cancel invite"
                    onClick={async () => {
                      const r = await cancelInvite(currentWorkspace.id, inv.id);
                      if (!r.success) toast.error(r.error);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Member list */}
          <div className="member-list">
            {members.map(m => (
              <div key={m.userId} className="member-row">
                <div className="member-info">
                  <div className="member-avatar">
                    {m.user?.avatar
                      ? <img src={m.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(m.user?.name || '')
                    }
                  </div>
                  <div>
                    <p className="member-name">{m.user?.name} {m.userId === user?.id && <span className="you-badge">You</span>}</p>
                    <p className="member-email">{m.user?.email}</p>
                  </div>
                </div>
                <div className="member-actions">
                  {isAdmin && m.userId !== user?.id ? (
                    <>
                      <select
                        className="role-select"
                        value={m.role}
                        onChange={e => handleRoleChange(m.userId, e.target.value)}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button className="icon-btn icon-btn--danger" onClick={() => handleRemoveMember(m.userId)}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <span className={`role-badge ${m.role === 'ADMIN' ? 'role-badge--admin' : ''}`}>
                      {m.role === 'ADMIN' ? <Shield size={11} /> : <User size={11} />}
                      {m.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      {activeTab === 'permissions' && isAdmin && (
        <div className="settings-card">
          <h3 className="section-title">Permission Matrix</h3>
          <p className="section-sub">Control what each member can do in this workspace. Admins always have full access.</p>
          <div className="perm-table">
            <div className="perm-header">
              <span>Member</span>
              {PERMISSIONS.map(p => <span key={p.key} className="perm-col-label">{p.label}</span>)}
            </div>
            {members.filter(m => m.role !== 'ADMIN').map(m => (
              <div key={m.userId} className="perm-row">
                <div className="perm-member">
                  <div className="member-avatar member-avatar--sm">
                    {getInitials(m.user?.name || '')}
                  </div>
                  <span>{m.user?.name}</span>
                </div>
                {PERMISSIONS.map(p => (
                  <div key={p.key} className="perm-cell">
                    <input
                      type="checkbox"
                      checked={!!m[p.key]}
                      onChange={async (e) => {
                        const r = await updateMemberPermissions(currentWorkspace.id, m.userId, { [p.key]: e.target.checked });
                        if (r.success) toast.success(`${p.label} ${e.target.checked ? 'enabled' : 'disabled'}`);
                        else toast.error(r.error);
                      }}
                      className="perm-checkbox"
                    />
                  </div>
                ))}
              </div>
            ))}
            {members.filter(m => m.role !== 'ADMIN').length === 0 && (
              <div className="perm-empty">No members to configure (admins always have full access)</div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
        .page-header { }
        .page-title { font-size: 22px; font-weight: 700; color: var(--c-text); letter-spacing: -0.4px; margin: 0 0 4px; }
        .page-sub { font-size: 14px; color: var(--c-text-3); margin: 0; }
        .tabs { display: flex; gap: 2px; background: var(--c-surface-2); border-radius: 10px; padding: 4px; width: fit-content; }
        .tab {
          padding: 7px 16px; font-size: 13px; font-weight: 500; border: none;
          background: none; border-radius: 7px; cursor: pointer; color: var(--c-text-3);
          font-family: var(--font-sans); transition: all 0.12s;
        }
        .tab--active { background: var(--c-surface); color: var(--c-text); font-weight: 600; box-shadow: 0 1px 3px rgba(16,24,40,0.1); }
        .settings-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; padding: 24px; }
        .section-title { font-size: 15px; font-weight: 700; color: var(--c-text); margin: 0 0 4px; }
        .section-sub { font-size: 13px; color: var(--c-text-3); margin: 0 0 16px; }
        .no-perm { font-size: 13px; color: var(--c-text-4); margin: 0 0 16px; }
        .settings-form { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 13px; font-weight: 500; color: var(--c-text-2); }
        .input {
          height: 42px; padding: 0 14px; font-size: 14px;
          border: 1px solid var(--c-border-2); border-radius: 9px; outline: none;
          font-family: var(--font-sans); color: var(--c-text); background: var(--c-surface);
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box; width: 100%;
        }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .input:disabled { background: var(--c-bg); color: var(--c-text-4); }
        .input--textarea { height: auto; padding: 10px 14px; resize: vertical; }
        .color-row { display: flex; align-items: center; gap: 12px; }
        .color-input { width: 40px; height: 40px; border: none; cursor: pointer; border-radius: 8px; }
        .color-value { font-size: 13px; color: var(--c-text-2); font-family: monospace; }
        .color-preview { width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); }
        .form-footer { display: flex; justify-content: flex-end; }
        .danger-zone {
          margin-top: 24px; padding: 20px; border: 1px solid var(--c-danger-border);
          border-radius: 12px; background: var(--c-danger-soft);
        }
        .danger-title { font-size: 14px; font-weight: 700; color: #dc2626; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
        .danger-desc { font-size: 13px; color: var(--c-text-3); margin: 0 0 14px; line-height: 1.5; }
        .btn-danger {
          display: flex; align-items: center; gap: 6px; padding: 0 18px;
          height: 40px; background: #dc2626; color: #fff; border: none; border-radius: 9px;
          font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.15s;
        }
        .btn-danger:hover { background: #b91c1c; }
        .invite-form { display: flex; gap: 10px; margin-bottom: 20px; margin-top: 16px; }
        .invite-form .input { flex: 1; }
        .pending-invites { border: 1px dashed var(--c-border); border-radius: 10px; padding: 10px 12px; margin-bottom: 16px; }
        .pending-title { font-size: 11px; font-weight: 700; color: var(--c-text-4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .pending-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 13px; }
        .pending-email { color: var(--c-text); font-weight: 500; }
        .pending-hint { color: var(--c-text-4); font-size: 12px; flex: 1; }
        .btn-primary {
          display: flex; align-items: center; gap: 6px; padding: 0 18px;
          height: 42px; background: #4f46e5; color: #fff; border: none; border-radius: 9px;
          font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);
          transition: background 0.15s; white-space: nowrap;
        }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .member-list { display: flex; flex-direction: column; gap: 2px; }
        .member-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid var(--c-border-soft); gap: 12px;
        }
        .member-row:last-child { border-bottom: none; }
        .member-info { display: flex; align-items: center; gap: 12px; }
        .member-avatar {
          width: 36px; height: 36px; border-radius: 50%; background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
        }
        .member-avatar--sm { width: 28px; height: 28px; font-size: 10px; }
        .member-name { font-size: 14px; font-weight: 600; color: var(--c-text); margin: 0 0 2px; }
        .member-email { font-size: 12px; color: var(--c-text-4); margin: 0; }
        .you-badge {
          display: inline; font-size: 10px; font-weight: 600; color: #4f46e5;
          background: var(--c-accent-soft); padding: 1px 6px; border-radius: 10px; margin-left: 6px;
        }
        .member-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .role-select {
          height: 32px; padding: 0 10px; font-size: 12.5px; border: 1px solid var(--c-border);
          border-radius: 7px; background: var(--c-bg); cursor: pointer; color: var(--c-text-2);
          font-family: var(--font-sans); outline: none;
        }
        .role-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
          background: var(--c-surface-2); color: var(--c-text-3);
        }
        .role-badge--admin { background: var(--c-accent-soft); color: #4f46e5; }
        .icon-btn {
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          background: none; border: 1px solid var(--c-border); border-radius: 7px; cursor: pointer; color: var(--c-text-3);
          transition: all 0.12s;
        }
        .icon-btn--danger:hover { background: var(--c-danger-soft); color: #f04438; border-color: var(--c-danger-border); }
        .perm-table { margin-top: 16px; }
        .perm-header {
          display: grid; grid-template-columns: 200px repeat(4, 1fr);
          padding: 8px 0; border-bottom: 2px solid var(--c-border);
          font-size: 11px; font-weight: 700; color: var(--c-text-4); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .perm-col-label { text-align: center; font-size: 10px; }
        .perm-row {
          display: grid; grid-template-columns: 200px repeat(4, 1fr);
          padding: 10px 0; border-bottom: 1px solid var(--c-border-soft); align-items: center;
        }
        .perm-member { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--c-text-2); font-weight: 500; }
        .perm-cell { display: flex; justify-content: center; }
        .perm-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #4f46e5; }
        .perm-empty { padding: 20px 0; text-align: center; font-size: 13px; color: var(--c-text-4); }
      `}</style>
    </div>
  );
}