import { create } from 'zustand';
import api from '@/lib/api';

// The API broadcasts every change to the whole workspace room, including the
// sender, so local writes and socket events can both arrive: keep them idempotent.
const upsertById = (list, item) =>
  list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x))
    : [item, ...list];

const appendComment = (announcements, announcementId, comment) =>
  announcements.map((a) =>
    a.id === announcementId && !(a.comments || []).some((c) => c.id === comment.id)
      ? { ...a, comments: [...(a.comments || []), comment] }
      : a
  );

const applyReaction = (announcements, announcementId, action, emoji, userId) =>
  announcements.map((a) => {
    if (a.id !== announcementId) return a;
    const reactions = (a.reactions || []).filter((r) => !(r.emoji === emoji && r.userId === userId));
    return { ...a, reactions: action === 'added' ? [...reactions, { emoji, userId }] : reactions };
  });

const useAnnouncementStore = create((set, get) => ({
  announcements: [],
  isLoading: false,
  error: null,

  fetchAnnouncements: async (workspaceId) => {
    set({ isLoading: true, error: null, announcements: [] });
    try {
      const res = await api.get(`/api/announcements/workspace/${workspaceId}`);
      set({ announcements: res.data.data || [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load announcements' });
    }
  },

  createAnnouncement: async (workspaceId, content) => {
    try {
      const res = await api.post(`/api/announcements/workspace/${workspaceId}`, { content });
      const announcement = res.data.data;
      set((state) => ({ announcements: upsertById(state.announcements, announcement) }));
      return { success: true, announcement };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create announcement' };
    }
  },

  deleteAnnouncement: async (id) => {
    const previous = get().announcements;
    set({ announcements: previous.filter((a) => a.id !== id) });
    try {
      await api.delete(`/api/announcements/${id}`);
      return { success: true };
    } catch (err) {
      set({ announcements: previous });
      return { success: false, error: err.response?.data?.message || 'Failed to delete' };
    }
  },

  togglePin: async (id, pinned) => {
    // Optimistic update, rolled back on error
    set((state) => ({
      announcements: state.announcements.map((a) => (a.id === id ? { ...a, pinned } : a)),
    }));
    try {
      await api.put(`/api/announcements/${id}/pin`, { pinned });
      return { success: true };
    } catch (err) {
      set((state) => ({
        announcements: state.announcements.map((a) => (a.id === id ? { ...a, pinned: !pinned } : a)),
      }));
      return { success: false, error: err.response?.data?.message || 'Failed to pin' };
    }
  },

  toggleReaction: async (announcementId, emoji, userId) => {
    const ann = get().announcements.find((a) => a.id === announcementId);
    const hasReacted = (ann?.reactions || []).some((r) => r.emoji === emoji && r.userId === userId);
    const action = hasReacted ? 'removed' : 'added';

    // Optimistic update, rolled back on error
    set((state) => ({ announcements: applyReaction(state.announcements, announcementId, action, emoji, userId) }));
    try {
      await api.post(`/api/announcements/${announcementId}/reactions`, { emoji });
      return { success: true };
    } catch (err) {
      const undo = action === 'added' ? 'removed' : 'added';
      set((state) => ({ announcements: applyReaction(state.announcements, announcementId, undo, emoji, userId) }));
      return { success: false, error: err.response?.data?.message || 'Failed to react' };
    }
  },

  addComment: async (announcementId, content) => {
    try {
      const res = await api.post(`/api/announcements/${announcementId}/comments`, { content });
      const comment = res.data.data;
      set((state) => ({ announcements: appendComment(state.announcements, announcementId, comment) }));
      return { success: true, comment };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to comment' };
    }
  },

  // Socket handlers
  socketAddAnnouncement: (announcement) => {
    set((state) => ({ announcements: upsertById(state.announcements, announcement) }));
  },

  socketRemoveAnnouncement: (announcementId) => {
    set((state) => ({ announcements: state.announcements.filter((a) => a.id !== announcementId) }));
  },

  socketSetPinned: (announcementId, pinned) => {
    set((state) => ({
      announcements: state.announcements.map((a) => (a.id === announcementId ? { ...a, pinned } : a)),
    }));
  },

  socketUpdateReaction: (announcementId, action, emoji, userId) => {
    set((state) => ({ announcements: applyReaction(state.announcements, announcementId, action, emoji, userId) }));
  },

  socketAddComment: (announcementId, comment) => {
    set((state) => ({ announcements: appendComment(state.announcements, announcementId, comment) }));
  },
}));

export default useAnnouncementStore;
