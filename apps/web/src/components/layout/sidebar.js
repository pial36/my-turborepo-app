'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers, LayoutDashboard, Target, CheckSquare,
  Megaphone, BarChart2, Shield, Settings, LogOut,
  Plus, ChevronDown, Circle
} from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useNotificationStore from '@/stores/notificationStore';
import { getInitials } from '@/lib/utils';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/goals', icon: Target, label: 'Goals' },
  { href: '/dashboard/action-items', icon: CheckSquare, label: 'Action Items' },
  { href: '/dashboard/announcements', icon: Megaphone, label: 'Announcements' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/dashboard/audit-log', icon: Shield, label: 'Audit Log', adminOnly: true },
];

export default function Sidebar({ open }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useWorkspaceStore();
  const { onlineMembers } = useNotificationStore();
  const [wsDropdown, setWsDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const currentMember = currentWorkspace?.members?.find(m => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await createWorkspace({ name: newWsName.trim(), accentColor: '#6366f1' });
    setNewWsName('');
    setCreating(false);
    setWsDropdown(false);
  };

  if (!open) return null;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Layers size={18} strokeWidth={1.5} />
        </div>
        <span className="sidebar-brand-name">Team Hub</span>
      </div>

      {/* Workspace switcher */}
      <div className="ws-switcher">
        <button className="ws-btn" onClick={() => setWsDropdown(!wsDropdown)}>
          <div
            className="ws-avatar"
            style={{ background: currentWorkspace?.accentColor || '#6366f1' }}
          >
            {getInitials(currentWorkspace?.name || 'W')}
          </div>
          <div className="ws-info">
            <span className="ws-name">{currentWorkspace?.name || 'Select workspace'}</span>
            <span className="ws-role">{isAdmin ? 'Admin' : 'Member'}</span>
          </div>
          <ChevronDown size={14} className={`ws-chevron ${wsDropdown ? 'ws-chevron--open' : ''}`} />
        </button>

        {wsDropdown && (
          <div className="ws-dropdown">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={`ws-item ${currentWorkspace?.id === ws.id ? 'ws-item--active' : ''}`}
                onClick={() => { switchWorkspace(ws.id); setWsDropdown(false); }}
              >
                <div className="ws-item-dot" style={{ background: ws.accentColor || '#6366f1' }} />
                {ws.name}
              </button>
            ))}
            {creating ? (
              <form onSubmit={handleCreateWorkspace} className="ws-create-form">
                <input
                  autoFocus
                  placeholder="Workspace name"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  className="ws-create-input"
                />
                <button type="submit" className="ws-create-btn">Create</button>
              </form>
            ) : (
              <button className="ws-item ws-item--new" onClick={() => setCreating(true)}>
                <Plus size={13} /> New workspace
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-nav-label">Navigation</span>
        {NAV.filter(item => !item.adminOnly || isAdmin).map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'nav-item--active' : ''}`}>
              <Icon size={16} strokeWidth={active ? 2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Online members */}
      {currentWorkspace?.members && (
        <div className="sidebar-online">
          <span className="sidebar-nav-label">Online now</span>
          <div className="online-list">
            {currentWorkspace.members.slice(0, 5).map((m) => {
              const isOnline = onlineMembers.includes(m.userId);
              return (
                <div key={m.userId} className="online-member">
                  <div className="online-avatar">
                    {m.user?.avatar
                      ? <img src={m.user.avatar} alt={m.user.name} className="online-avatar-img" />
                      : <span>{getInitials(m.user?.name || '')}</span>
                    }
                    <span className={`online-dot ${isOnline ? 'online-dot--on' : ''}`} />
                  </div>
                  <span className="online-name">{m.user?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link href="/dashboard/settings" className="sidebar-bottom-btn">
          <Settings size={15} /> Settings
        </Link>
        <button className="sidebar-bottom-btn sidebar-bottom-btn--logout" onClick={logout}>
          <LogOut size={15} /> Sign out
        </button>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="sidebar-user-img" />
              : <span>{getInitials(user?.name || '')}</span>
            }
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #fff;
          border-right: 1px solid #e4e7ec;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 20px 18px 16px;
          border-bottom: 1px solid #f1f3f7;
        }
        .sidebar-logo {
          width: 32px;
          height: 32px;
          background: #4f46e5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .sidebar-brand-name {
          font-size: 15px;
          font-weight: 700;
          color: #101828;
          letter-spacing: -0.3px;
        }

        /* Workspace switcher */
        .ws-switcher {
          padding: 12px 12px 8px;
          position: relative;
        }
        .ws-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          background: #f8f9fb;
          border: 1px solid #e4e7ec;
          border-radius: 9px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .ws-btn:hover { background: #f1f3f7; }
        .ws-avatar {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .ws-info {
          flex: 1;
          min-width: 0;
        }
        .ws-name {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #101828;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ws-role {
          display: block;
          font-size: 11px;
          color: #98a2b3;
        }
        .ws-chevron {
          color: #98a2b3;
          transition: transform 0.15s;
          flex-shrink: 0;
        }
        .ws-chevron--open { transform: rotate(180deg); }
        .ws-dropdown {
          position: absolute;
          top: calc(100% - 4px);
          left: 12px;
          right: 12px;
          background: #fff;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(16,24,40,0.12);
          z-index: 50;
          overflow: hidden;
          padding: 6px;
        }
        .ws-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          font-size: 13px;
          color: #374151;
          background: none;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }
        .ws-item:hover { background: #f8f9fb; }
        .ws-item--active { background: #eef2ff; color: #4f46e5; font-weight: 500; }
        .ws-item--new { color: #6b7280; font-size: 12px; }
        .ws-item-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ws-create-form {
          display: flex;
          gap: 6px;
          padding: 6px 10px;
        }
        .ws-create-input {
          flex: 1;
          height: 30px;
          padding: 0 8px;
          font-size: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          outline: none;
        }
        .ws-create-input:focus { border-color: #6366f1; }
        .ws-create-btn {
          height: 30px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 600;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Nav */
        .sidebar-nav {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .sidebar-nav-label {
          font-size: 10px;
          font-weight: 600;
          color: #98a2b3;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          padding: 8px 8px 4px;
          display: block;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #475467;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
        }
        .nav-item:hover { background: #f8f9fb; color: #101828; }
        .nav-item--active {
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 600;
        }

        /* Online members */
        .sidebar-online {
          padding: 8px 12px;
          border-top: 1px solid #f1f3f7;
        }
        .online-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 4px;
        }
        .online-member {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .online-avatar {
          position: relative;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #e4e7ec;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: #475467;
          flex-shrink: 0;
        }
        .online-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d1d5db;
          border: 1.5px solid #fff;
        }
        .online-dot--on { background: #12b76a; }
        .online-name {
          font-size: 12.5px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Bottom */
        .sidebar-bottom {
          padding: 12px;
          border-top: 1px solid #f1f3f7;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar-bottom-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          font-size: 13px;
          color: #475467;
          background: none;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.12s;
          font-family: var(--font-sans);
        }
        .sidebar-bottom-btn:hover { background: #f8f9fb; }
        .sidebar-bottom-btn--logout:hover { background: #fef2f2; color: #f04438; }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 10px 4px;
          margin-top: 4px;
          border-top: 1px solid #f1f3f7;
        }
        .sidebar-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          overflow: hidden;
        }
        .sidebar-user-img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .sidebar-user-info { min-width: 0; }
        .sidebar-user-name {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #101828;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-email {
          display: block;
          font-size: 11px;
          color: #98a2b3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </aside>
  );
}