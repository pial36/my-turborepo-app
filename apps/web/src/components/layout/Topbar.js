'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, Settings, LogOut, Search, Sun, Moon, Monitor } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import useNotificationStore from '@/stores/notificationStore';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/dashboard/goals': 'Goals',
  '/dashboard/action-items': 'Action Items',
  '/dashboard/announcements': 'Announcements',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/audit-log': 'Audit Log',
  '/dashboard/settings': 'Settings',
  '/dashboard/profile': 'Profile',
  '/dashboard/members': 'Members',
};

export default function Topbar({ onMenuClick, onOpenPalette }) {
  const pathname = usePathname();
  const { preference, cycleTheme } = useTheme();
  const ThemeIcon = THEME_ICONS[preference];
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  // nested routes (e.g. /dashboard/goals/12) use their section's title
  const section = Object.keys(PAGE_TITLES)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  const title = PAGE_TITLES[section] || 'Dashboard';

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu" onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Command palette */}
        <button className="topbar-search" onClick={onOpenPalette} aria-label="Open command palette">
          <Search size={14} />
          <span className="topbar-search-text">Search or jump to…</span>
          <kbd className="topbar-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        {/* Theme: system → light → dark */}
        <button
          className="topbar-icon-btn"
          onClick={cycleTheme}
          aria-label={`Theme: ${preference}`}
          title={`Theme: ${preference} (click to change)`}
        >
          <ThemeIcon size={17} />
        </button>

        {/* Notifications */}
        <div className="topbar-icon-wrap" ref={notifRef}>
          <button
            className="topbar-icon-btn"
            onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="notif-read-all" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="notif-dot" />
                      <div className="notif-body">
                        <p className="notif-msg">{n.message}</p>
                        <span className="notif-time">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="topbar-icon-wrap" ref={userRef}>
          <button
            className="topbar-user-btn"
            onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
          >
            <div className="topbar-user-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="topbar-user-img" />
                : <span>{getInitials(user?.name || '')}</span>
              }
            </div>
          </button>

          {userOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <p className="user-dropdown-name">{user?.name}</p>
                <p className="user-dropdown-email">{user?.email}</p>
              </div>
              <div className="user-dropdown-items">
                <Link href="/dashboard/profile" className="user-dropdown-item" onClick={() => setUserOpen(false)}>
                  <User size={14} /> Profile
                </Link>
                <Link href="/dashboard/settings" className="user-dropdown-item" onClick={() => setUserOpen(false)}>
                  <Settings size={14} /> Settings
                </Link>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item user-dropdown-item--danger" onClick={logout}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .topbar {
          height: 58px;
          background: var(--c-surface);
          border-bottom: 1px solid var(--c-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .topbar-left { display: flex; align-items: center; gap: 14px; }
        .topbar-menu {
          background: none; border: none; cursor: pointer;
          color: var(--c-text-3); display: flex; align-items: center;
          padding: 6px; border-radius: 7px; transition: background 0.12s;
        }
        .topbar-menu:hover { background: var(--c-surface-2); color: var(--c-text); }
        .topbar-title { font-size: 16px; font-weight: 700; color: var(--c-text); letter-spacing: -0.3px; margin: 0; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .topbar-icon-wrap { position: relative; }
        .topbar-icon-btn {
          position: relative;
          width: 36px; height: 36px;
          background: none; border: none; cursor: pointer;
          color: var(--c-text-3); border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .topbar-icon-btn:hover { background: var(--c-surface-2); color: var(--c-text); }
        .topbar-search {
          display: flex; align-items: center; gap: 8px;
          height: 34px; padding: 0 8px 0 10px; margin-right: 4px;
          background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 8px;
          color: var(--c-text-4); font-size: 13px; cursor: pointer; font-family: var(--font-sans);
        }
        .topbar-search:hover { border-color: var(--c-border-2); color: var(--c-text-3); }
        .topbar-kbd {
          font-family: var(--font-sans); font-size: 11px; color: var(--c-text-3);
          background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 5px; padding: 1px 6px;
        }
        @media (max-width: 640px) {
          .topbar-search-text, .topbar-kbd { display: none; }
          .topbar-search { width: 36px; justify-content: center; padding: 0; }
        }
        .topbar-badge {
          position: absolute;
          top: 5px; right: 5px;
          min-width: 16px; height: 16px;
          background: #f04438; color: #fff;
          font-size: 10px; font-weight: 700;
          border-radius: 8px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid var(--c-surface);
        }
        .topbar-user-btn {
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .topbar-user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: #4f46e5;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff;
          overflow: hidden;
        }
        .topbar-user-img { width: 100%; height: 100%; object-fit: cover; }

        /* Notifications dropdown */
        .notif-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          width: 320px; background: var(--c-surface);
          border: 1px solid var(--c-border); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(16,24,40,0.12);
          z-index: 100; overflow: hidden;
        }
        .notif-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--c-border-soft);
        }
        .notif-title { font-size: 14px; font-weight: 700; color: var(--c-text); }
        .notif-read-all {
          font-size: 12px; color: #4f46e5; background: none;
          border: none; cursor: pointer; font-weight: 500;
        }
        .notif-list { max-height: 320px; overflow-y: auto; }
        .notif-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--c-text-4); }
        .notif-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; cursor: pointer;
          transition: background 0.12s; border-bottom: 1px solid var(--c-border-soft);
        }
        .notif-item:hover { background: var(--c-bg); }
        .notif-item--unread { background: var(--c-hover); }
        .notif-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--c-surface-3); flex-shrink: 0; margin-top: 5px;
        }
        .notif-item--unread .notif-dot { background: #4f46e5; }
        .notif-body { flex: 1; min-width: 0; }
        .notif-msg { font-size: 13px; color: var(--c-text-2); margin: 0 0 3px; line-height: 1.4; }
        .notif-time { font-size: 11px; color: var(--c-text-4); }

        /* User dropdown */
        .user-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          width: 200px; background: var(--c-surface);
          border: 1px solid var(--c-border); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(16,24,40,0.12);
          z-index: 100; overflow: hidden;
        }
        .user-dropdown-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--c-border-soft); }
        .user-dropdown-name { font-size: 13px; font-weight: 600; color: var(--c-text); margin: 0 0 2px; }
        .user-dropdown-email { font-size: 12px; color: var(--c-text-4); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-dropdown-items { padding: 6px; }
        /* next/link renders outside the styled-jsx scope, hence :global */
        .user-dropdown-items :global(.user-dropdown-item) {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; font-size: 13px; color: var(--c-text-2);
          background: none; border: none; cursor: pointer;
          text-decoration: none; border-radius: 7px; width: 100%;
          transition: background 0.12s; font-family: var(--font-sans);
        }
        .user-dropdown-items :global(.user-dropdown-item:hover) { background: var(--c-bg); }
        .user-dropdown-items :global(.user-dropdown-item--danger:hover) { background: var(--c-danger-soft); color: #f04438; }
        .user-dropdown-divider { height: 1px; background: var(--c-surface-2); margin: 4px 0; }
      `}</style>
    </header>
  );
}