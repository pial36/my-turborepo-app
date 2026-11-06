'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useAuthStore from '@/stores/authStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useNotificationStore from '@/stores/notificationStore';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/lib/socket';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/Topbar';
import CommandPalette from '@/components/layout/CommandPalette';


export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { fetchNotifications } = useNotificationStore();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [booted, setBooted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useSocket(currentWorkspace?.id);

  // phones get a closed-by-default drawer instead of a fixed sidebar
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => {
      setIsMobile(mq.matches);
      setSidebarOpen(!mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // close the drawer after navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  // ⌘K / Ctrl+K toggles the command palette from anywhere in the dashboard
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Listen for real-time notifications and online members updates
  useEffect(() => {
    const socket = getSocket();
    
    const handleNotification = (notification) => {
      if (notification.type === 'MENTION') {
        toast.success(notification.message, {
          duration: 5000,
          icon: '🔔',
        });
      }
    };

    socket.on('notification:new', handleNotification);
    
    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchMe();
        await fetchWorkspaces();
        await fetchNotifications();
      } catch (err) {
        console.error('Dashboard init error:', err);
      } finally {
        setBooted(true);
      }
    };
    init();
  }, [fetchMe, fetchWorkspaces, fetchNotifications]);

  useEffect(() => {
    if (booted && !isAuthenticated) {
      router.push('/login');
    }
  }, [booted, isAuthenticated]);

  if (!booted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--c-bg)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--c-border)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      style={{ '--ws-accent': currentWorkspace?.accentColor || '#4f46e5' }}
    >
      <Sidebar open={sidebarOpen} mobile={isMobile} onClose={() => setSidebarOpen(false)} />
      {isMobile && sidebarOpen && (
        <div className="drawer-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className={`app-main ${sidebarOpen ? 'app-main--sidebar' : ''}`}>
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="app-content">
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <style jsx>{`
        .app-shell {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--c-bg);
        }
        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: margin-left 0.2s;
        }
        .app-content {
          flex: 1;
          overflow-y: auto;
          padding: 28px 32px;
        }
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 250;
          background: rgba(16,24,40,0.4);
        }
        @media (max-width: 768px) {
          .app-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}