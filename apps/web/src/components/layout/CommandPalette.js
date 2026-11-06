'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Target, CheckSquare, Megaphone, BarChart2, Shield, Settings, User,
  Layers, Sun, Moon, Monitor, LogOut, Search, CornerDownLeft,
} from 'lucide-react';
import api from '@/lib/api';
import useWorkspaceStore from '@/stores/workspaceStore';
import useAuthStore from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';

const PAGES = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/goals', label: 'Goals', icon: Target },
  { href: '/dashboard/action-items', label: 'Action Items', icon: CheckSquare },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/audit-log', label: 'Audit Log', icon: Shield, adminOnly: true },
  { href: '/dashboard/settings', label: 'Workspace Settings', icon: Settings },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

// ⌘K / Ctrl+K: jump to pages, workspaces and goals, switch theme, sign out.
// `open` is controlled by the dashboard layout, which owns the shortcut.
export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaceStore();
  const { user, logout } = useAuthStore();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [goals, setGoals] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isAdmin = currentWorkspace?.members?.find((m) => m.userId === user?.id)?.role === 'ADMIN';

  // reset and load goals for the current workspace each time it opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (!currentWorkspace?.id) return;
    let cancelled = false;
    api.get(`/api/goals/workspace/${currentWorkspace.id}`)
      .then((r) => { if (!cancelled) setGoals(r.data.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, currentWorkspace?.id]);

  const commands = useMemo(() => {
    const go = (href) => () => router.push(href);
    return [
      ...PAGES.filter((p) => !p.adminOnly || isAdmin).map((p) => ({
        id: `page:${p.href}`, group: 'Go to', label: p.label, icon: p.icon, run: go(p.href),
      })),
      ...goals.map((g) => ({
        id: `goal:${g.id}`, group: 'Goals', label: g.title, hint: g.status.replace(/_/g, ' ').toLowerCase(),
        icon: Target, run: go(`/dashboard/goals/${g.id}`),
      })),
      ...workspaces.filter((w) => w.id !== currentWorkspace?.id).map((w) => ({
        id: `ws:${w.id}`, group: 'Switch workspace', label: w.name, icon: Layers,
        accent: w.accentColor, run: () => switchWorkspace(w.id),
      })),
      { id: 'theme:light', group: 'Theme', label: 'Light theme', icon: Sun, run: () => setTheme('light') },
      { id: 'theme:dark', group: 'Theme', label: 'Dark theme', icon: Moon, run: () => setTheme('dark') },
      { id: 'theme:system', group: 'Theme', label: 'Use system theme', icon: Monitor, run: () => setTheme('system') },
      { id: 'logout', group: 'Account', label: 'Sign out', icon: LogOut, run: logout },
    ];
  }, [goals, workspaces, currentWorkspace?.id, isAdmin, router, switchWorkspace, setTheme, logout]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setActive(0); }, [query]);

  // keep the highlighted row visible while arrowing
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const runCommand = (cmd) => {
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runCommand(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = null;

  return (
    <div className="cp-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="cp-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            aria-activedescendant={results[active] ? `cp-${results[active].id}` : undefined}
          />
          <kbd className="cp-kbd">Esc</kbd>
        </div>

        <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
          {results.length === 0 && <div className="cp-empty">No results for “{query}”</div>}
          {results.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            const Icon = cmd.icon;
            return (
              <div key={cmd.id}>
                {showGroup && <div className="cp-group">{cmd.group}</div>}
                <div
                  id={`cp-${cmd.id}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className={`cp-item ${i === active ? 'cp-item--active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => runCommand(cmd)}
                >
                  {cmd.accent
                    ? <span className="cp-dot" style={{ background: cmd.accent }} />
                    : <Icon size={15} />}
                  <span className="cp-label">{cmd.label}</span>
                  {cmd.hint && <span className="cp-hint">{cmd.hint}</span>}
                  {i === active && <CornerDownLeft size={13} className="cp-enter" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="cp-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>

      <style jsx>{`
        .cp-overlay {
          position: fixed; inset: 0; z-index: 400;
          background: rgba(16, 24, 40, 0.45); backdrop-filter: blur(2px);
          display: flex; justify-content: center; align-items: flex-start;
          padding: 12vh 16px 16px;
        }
        .cp {
          width: 100%; max-width: 560px;
          background: var(--c-surface); border: 1px solid var(--c-border);
          border-radius: 14px; box-shadow: 0 24px 64px rgba(16, 24, 40, 0.28);
          overflow: hidden; display: flex; flex-direction: column; max-height: 70vh;
        }
        .cp-search {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-bottom: 1px solid var(--c-border); color: var(--c-text-4);
        }
        .cp-input {
          flex: 1; border: none; outline: none; background: none;
          font-size: 15px; color: var(--c-text); font-family: var(--font-sans);
        }
        .cp-kbd, .cp-footer kbd {
          font-family: var(--font-sans); font-size: 11px; color: var(--c-text-3);
          background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 5px; padding: 1px 6px;
        }
        .cp-list { overflow-y: auto; padding: 6px; }
        .cp-group {
          padding: 10px 10px 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: var(--c-text-4);
        }
        .cp-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px; cursor: pointer;
          color: var(--c-text-2); font-size: 14px;
        }
        .cp-item--active { background: var(--c-accent-soft); color: var(--ws-accent, #4f46e5); }
        .cp-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cp-hint { font-size: 12px; color: var(--c-text-4); text-transform: capitalize; }
        .cp-dot { width: 10px; height: 10px; border-radius: 3px; margin: 0 2.5px; flex-shrink: 0; }
        .cp-empty { padding: 28px; text-align: center; color: var(--c-text-4); font-size: 14px; }
        .cp-footer {
          display: flex; gap: 16px; padding: 8px 14px; border-top: 1px solid var(--c-border);
          font-size: 11px; color: var(--c-text-4);
        }
        .cp-footer kbd { margin-right: 3px; }
      `}</style>
    </div>
  );
}
