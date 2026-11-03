import { create } from 'zustand';
import api from '@/lib/api';

const useGoalStore = create((set) => ({
  goals: [],
  currentGoal: null,
  isLoading: false,

  fetchGoals: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/api/goals/workspace/${workspaceId}`);
      set({ goals: res.data.data || [], isLoading: false });
    } catch (_) {
      set({ isLoading: false });
    }
  },

  fetchGoal: async (goalId) => {
    try {
      const res = await api.get(`/api/goals/${goalId}`);
      set({ currentGoal: res.data.data });
      return res.data.data;
    } catch (_) {
      return null;
    }
  },

  createGoal: async (workspaceId, data) => {
    try {
      const res = await api.post(`/api/goals/workspace/${workspaceId}`, data);
      const goal = res.data.data;
      set((state) => ({ goals: [goal, ...state.goals] }));
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
        goals: state.goals.map((g) => (g.id === goalId ? goal : g)),
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
        goals: state.goals.map((g) => (g.id === goalId ? goal : g)),
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
          ? { ...state.currentGoal, updates: [update, ...(state.currentGoal.updates || [])] }
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
    set((state) => ({ goals: [goal, ...state.goals] }));
  },

  socketAddUpdate: (goalId, update) => {
    set((state) => ({
      currentGoal: state.currentGoal?.id === goalId
        ? { ...state.currentGoal, updates: [update, ...(state.currentGoal.updates || [])] }
        : state.currentGoal,
    }));
  },

  clearCurrentGoal: () => set({ currentGoal: null }),
}));

export default useGoalStore;
