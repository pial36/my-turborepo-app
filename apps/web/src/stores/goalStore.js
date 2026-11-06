import { create } from 'zustand';
import api from '@/lib/api';

// socket events echo back to the sender, so adds must be idempotent
const prependUnique = (list = [], item) =>
  list.some((x) => x.id === item.id) ? list : [item, ...list];

const useGoalStore = create((set) => ({
  goals: [],
  currentGoal: null,
  goalError: null,
  isLoading: false,
  error: null,

  fetchGoals: async (workspaceId) => {
    set({ isLoading: true, error: null, goals: [] });
    try {
      const res = await api.get(`/api/goals/workspace/${workspaceId}`);
      set({ goals: res.data.data || [], isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.response?.data?.message || 'Failed to load goals' });
    }
  },

  fetchGoal: async (goalId) => {
    // drop the previous goal so goal A never renders while B loads
    set((state) => ({
      goalError: null,
      currentGoal: state.currentGoal?.id === Number(goalId) ? state.currentGoal : null,
    }));
    try {
      const res = await api.get(`/api/goals/${goalId}`);
      set({ currentGoal: res.data.data });
      return res.data.data;
    } catch (err) {
      set({ goalError: err.response?.data?.message || 'Failed to load goal' });
      return null;
    }
  },

  createGoal: async (workspaceId, data) => {
    try {
      const res = await api.post(`/api/goals/workspace/${workspaceId}`, data);
      const goal = res.data.data;
      set((state) => ({ goals: prependUnique(state.goals, goal) }));
      return { success: true, goal };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create goal' };
    }
  },

  updateGoal: async (goalId, data) => {
    try {
      const res = await api.put(`/api/goals/${goalId}`, data);
      const goal = res.data.data;
      set((state) => ({
        goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...goal } : g)),
        currentGoal: state.currentGoal?.id === goalId ? goal : state.currentGoal,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to update goal' };
    }
  },

  updateGoalStatus: async (goalId, status) => {
    try {
      const res = await api.put(`/api/goals/status/${goalId}`, { status });
      const goal = res.data.data;
      set((state) => ({
        goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...goal } : g)),
        currentGoal: state.currentGoal?.id === goalId ? goal : state.currentGoal,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to update status' };
    }
  },

  deleteGoal: async (goalId) => {
    try {
      await api.delete(`/api/goals/${goalId}`);
      set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete goal' };
    }
  },

  createMilestone: async (goalId, data) => {
    try {
      const res = await api.post(`/api/goals/${goalId}/milestones`, data);
      const milestone = res.data.data;
      set((state) => ({
        currentGoal: state.currentGoal?.id === goalId
          ? { ...state.currentGoal, milestones: [...(state.currentGoal.milestones || []), milestone] }
          : state.currentGoal,
      }));
      return { success: true, milestone };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create milestone' };
    }
  },

  updateMilestone: async (milestoneId, data) => {
    try {
      const res = await api.put(`/api/goals/milestones/${milestoneId}`, data);
      const milestone = res.data.data;
      set((state) => ({
        currentGoal: state.currentGoal
          ? {
              ...state.currentGoal,
              milestones: state.currentGoal.milestones?.map((m) =>
                m.id === milestoneId ? milestone : m
              ),
            }
          : null,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to update milestone' };
    }
  },

  // instant slider feedback; the page saves with updateMilestone after a pause
  setMilestoneProgressLocal: (milestoneId, progress) => {
    set((state) => ({
      currentGoal: state.currentGoal
        ? {
            ...state.currentGoal,
            milestones: state.currentGoal.milestones?.map((m) =>
              m.id === milestoneId ? { ...m, progress } : m
            ),
          }
        : null,
    }));
  },

  deleteMilestone: async (milestoneId) => {
    try {
      await api.delete(`/api/goals/milestones/${milestoneId}`);
      set((state) => ({
        currentGoal: state.currentGoal
          ? {
              ...state.currentGoal,
              milestones: state.currentGoal.milestones?.filter((m) => m.id !== milestoneId),
            }
          : null,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete milestone' };
    }
  },

  postUpdate: async (goalId, content) => {
    try {
      const res = await api.post(`/api/goals/${goalId}/updates`, { content });
      const update = res.data.data;
      set((state) => ({
        currentGoal: state.currentGoal?.id === goalId
          ? { ...state.currentGoal, updates: prependUnique(state.currentGoal.updates, update) }
          : state.currentGoal,
      }));
      return { success: true, update };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to post update' };
    }
  },

  // Socket handlers
  socketUpdateGoal: (goal) => {
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goal.id ? { ...g, ...goal } : g)),
      currentGoal: state.currentGoal?.id === goal.id ? { ...state.currentGoal, ...goal } : state.currentGoal,
    }));
  },

  socketAddGoal: (goal) => {
    set((state) => ({ goals: prependUnique(state.goals, goal) }));
  },

  socketAddUpdate: (goalId, update) => {
    set((state) => ({
      currentGoal: state.currentGoal?.id === goalId
        ? { ...state.currentGoal, updates: prependUnique(state.currentGoal.updates, update) }
        : state.currentGoal,
    }));
  },

  clearCurrentGoal: () => set({ currentGoal: null }),
}));

export default useGoalStore;
