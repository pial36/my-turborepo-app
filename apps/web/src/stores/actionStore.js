
import { create } from 'zustand';

import api from '@/lib/api';


// Kanban columns — exactly matching backend enum
export const KANBAN_COLUMNS = [
  { id: 'TODO',  label: 'To Do' },
  { id: 'DOING', label: 'In Progress' },
  { id: 'DONE',  label: 'Done' },
];

const useActionStore = create((set, get) => ({
  actionItems: [],
  isLoading: false,
  error: null,
  view: 'kanban', // 'kanban' | 'list'

  setView: (view) => set({ view }),

  fetchActionItems: async (workspaceId) => {
    // clear first so the previous workspace's items never flash
    set({ isLoading: true, error: null, actionItems: [] });
    try {
      const res = await api.get(`/api/action-items/workspace/${workspaceId}`);
      set({ actionItems: res.data.data || [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load action items' });
    }
  },

  createActionItem: async (workspaceId, data) => {
    try {
      const res = await api.post(`/api/action-items/workspace/${workspaceId}`, data);
      const item = res.data.data;
      get().socketAddItem(item);
      return { success: true, actionItem: item };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create action item' };
    }
  },

  updateActionItem: async (itemId, data) => {
    // Optimistic update
    const prev = get().actionItems;
    set((state) => ({
      actionItems: state.actionItems.map((a) =>
        a.id === itemId ? { ...a, ...data } : a
      ),
    }));
    try {
      const res = await api.put(`/api/action-items/${itemId}`, data);
      const item = res.data.data;
      set((state) => ({
        actionItems: state.actionItems.map((a) => (a.id === itemId ? { ...a, ...item } : a)),
      }));
      return { success: true };
    } catch (err) {
      // Rollback on error
      set({ actionItems: prev });
      return { success: false, error: err.response?.data?.message || 'Failed to update' };
    }
  },

  deleteActionItem: async (itemId) => {
    try {
      await api.delete(`/api/action-items/${itemId}`);
      set((state) => ({ actionItems: state.actionItems.filter((a) => a.id !== itemId) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete' };
    }
  },

  // Optimistic kanban drag-and-drop
  moveItemOptimistic: (itemId, newStatus) => {
    set((state) => ({
      actionItems: state.actionItems.map((a) =>
        a.id === itemId ? { ...a, status: newStatus } : a
      ),
    }));
  },

  // Grouped by status for Kanban view
  getByStatus: (status) => {
    return get().actionItems.filter((a) => a.status === status);
  },

  // Socket handlers — merge, since some events carry only { id, status }
  socketUpdateItem: (item) => {
    set((state) => ({
      actionItems: state.actionItems.map((a) => (a.id === item.id ? { ...a, ...item } : a)),
    }));
  },

  socketRemoveItem: (itemId) => {
    set((state) => ({ actionItems: state.actionItems.filter((a) => a.id !== itemId) }));
  },

  socketAddItem: (item) => {
    set((state) => ({
      actionItems: state.actionItems.some((a) => a.id === item.id)
        ? state.actionItems
        : [item, ...state.actionItems],
    }));
  },
}));

export default useActionStore;
