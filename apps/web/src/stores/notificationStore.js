import { create } from 'zustand';
import api from '@/lib/api';

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  onlineMembers: [], // array of userIds

  fetchNotifications: async () => {
    try {
      const res = await api.get('/api/notifications');
      const notifs = res.data.data || [];
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read).length,
      });
    } catch (_) {}
  },

  markAsRead: async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (_) {}
  },

  markAllAsRead: async () => {
    try {
      await api.put('/api/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (_) {}
  },

  deleteNotification: async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: state.notifications.find((n) => n.id === notificationId && !n.read)
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch (_) {}
  },

  // Socket handlers
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setOnlineMembers: (userIds) => set({ onlineMembers: userIds }),

  addOnlineMember: (userId) => {
    set((state) => ({
      onlineMembers: state.onlineMembers.includes(userId)
        ? state.onlineMembers
        : [...state.onlineMembers, userId],
    }));
  },

  removeOnlineMember: (userId) => {
    set((state) => ({
      onlineMembers: state.onlineMembers.filter((id) => id !== userId),
    }));
  },
}));

export default useNotificationStore;
