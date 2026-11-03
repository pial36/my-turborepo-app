import { create } from 'zustand';
import api from '@/lib/api';

const useAnnouncementStore = create((set) => ({
  announcements: [],
  isLoading: false,

  fetchAnnouncements: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/api/announcements/workspace/${workspaceId}`);
      set({ announcements: res.data.data || [], isLoading: false });
    } catch (_) {
      set({ isLoading: false });
    }
  },

  createAnnouncement: async (workspaceId, content) => {
    try {
      const res = await api.post(`/api/announcements/workspace/${workspaceId}`, { content });
      const announcement = res.data.data;
      set((state) => ({ announcements: [announcement, ...state.announcements] }));
      return { success: true, announcement };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create announcement' };
    }
  },

  deleteAnnouncement: async (id, workspaceId) => {
    try {
      await api.delete(`/api/announcements/${id}`, { data: { workspaceId } });
      set((state) => ({ announcements: state.announcements.filter((a) => a.id !== id) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete' };
    }
  },

  togglePin: async (id, pinned) => {
    // Optimistic update
    set((state) => ({
      announcements: state.announcements
        .map((a) => (a.id === id ? { ...a, pinned } : a))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
    }));

    try {
      const res = await api.put(`/api/announcements/${id}/pin`, { pinned });
      const updated = res.data.data;
      
      // Sync with server response to ensure data consistency
      set((state) => ({
        announcements: state.announcements
          .map((a) => (a.id === id ? updated : a))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
      }));
      return { success: true };
    } catch (err) {
      // Rollback on failure
      set((state) => ({
        announcements: state.announcements
          .map((a) => (a.id === id ? { ...a, pinned: !pinned } : a))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
      }));
      return { success: false, error: err.response?.data?.message || 'Failed to pin' };
    }
  },

  toggleReaction: async (announcementId, emoji, workspaceId) => {
    try {
      const res = await api.post(`/api/announcements/${announcementId}/reactions`, {
        emoji,
        workspaceId,
      });
      // Refetch to get updated reactions
      const refresh = await api.get(`/api/announcements/workspace/${workspaceId}`);
      set({ announcements: refresh.data.data || [] });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to react' };
    }
  },

  addComment: async (announcementId, content, workspaceId) => {
    try {
      const res = await api.post(`/api/announcements/${announcementId}/comments`, {
        content,
        workspaceId,
      });
      const comment = res.data.data;
      set((state) => ({
        announcements: state.announcements.map((a) =>
          a.id === announcementId
            ? { ...a, comments: [...(a.comments || []), comment] }
            : a
        ),
      }));
      return { success: true, comment };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to comment' };
    }
  },

  // Socket handlers
  socketAddAnnouncement: (announcement) => {
    set((state) => ({
      announcements: [announcement, ...state.announcements],
    }));
  },

  socketUpdateReaction: (announcementId, action, emoji, userId) => {
    set((state) => ({
      announcements: state.announcements.map((a) => {
        if (a.id !== announcementId) return a;
        let reactions = [...(a.reactions || [])];
        if (action === 'removed') {
          reactions = reactions.filter(
            (r) => !(r.emoji === emoji && r.userId === userId)
          );
        } else {
          reactions = [...reactions, { emoji, userId }];
        }
        return { ...a, reactions };
      }),
    }));
  },

  socketAddComment: (announcementId, comment) => {
    set((state) => ({
      announcements: state.announcements.map((a) =>
        a.id === announcementId
          ? { ...a, comments: [...(a.comments || []), comment] }
          : a
      ),
    }));
  },
}));

export default useAnnouncementStore;
