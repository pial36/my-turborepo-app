'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useAuthStore from '@/stores/authStore';
import useWorkspaceStore from '@/stores/workspaceStore';
import useNotificationStore from '@/stores/notificationStore';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/lib/socket';
import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/Topbar';


export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { fetchNotifications } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [booted, setBooted] = useState(false);

  useSocket(currentWorkspace?.id);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e4e7ec', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`app-main ${sidebarOpen ? 'app-main--sidebar' : ''}`}>
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-shell {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #f8f9fb;
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
        @media (max-width: 768px) {
          .app-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}