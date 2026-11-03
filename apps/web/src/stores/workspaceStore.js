import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      members: [],
      isLoading: false,

      fetchWorkspaces: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/api/workspaces');
          const workspaces = res.data.data || [];
          set({ workspaces, isLoading: false });
          // auto-select first if none selected
          if (!get().currentWorkspace && workspaces.length > 0) {
            set({ currentWorkspace: workspaces[0] });
          }
        } catch (_) {
          set({ isLoading: false });
        }
      },

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      switchWorkspace: (workspaceId) => {
        const ws = get().workspaces.find((w) => w.id === workspaceId);
        if (ws) set({ currentWorkspace: ws, members: [] });
      },

      createWorkspace: async (data) => {
        try {
          const res = await api.post('/api/workspaces', data);
          const workspace = res.data.data;
          set((state) => ({
            workspaces: [workspace, ...state.workspaces],
            currentWorkspace: workspace,
          }));
          
          // Fetch the workspace immediately to ensure members data is populated
          const fullWorkspace = await get().fetchWorkspaceById(workspace.id);
          
          return { success: true, workspace: fullWorkspace || workspace };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to create workspace' };
        }
      },

      updateWorkspace: async (id, data) => {
        try {
          const res = await api.put(`/api/workspaces/${id}`, data);
          const workspace = res.data.data;
          set((state) => ({
            workspaces: state.workspaces.map((w) => (w.id === id ? workspace : w)),
            currentWorkspace: state.currentWorkspace?.id === id
              ? { ...workspace, members: state.currentWorkspace.members }
              : state.currentWorkspace,
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to update' };
        }
      },

      fetchWorkspaceById: async (id) => {
        try {
          const res = await api.get(`/api/workspaces/${id}`);
          const workspace = res.data.data;
          set((state) => ({
            workspaces: state.workspaces.map((w) => (w.id === id ? workspace : w)),
            currentWorkspace: state.currentWorkspace?.id === id ? workspace : state.currentWorkspace,
            members: workspace.members || [],
          }));
          return workspace;
        } catch (_) {
          return null;
        }
      },

      inviteMember: async (workspaceId, email) => {
        try {
          const res = await api.post(`/api/workspaces/${workspaceId}/invite`, { email });
          const member = res.data.data;
          if (member) {
            set((state) => ({
              members: [...state.members, member],
              currentWorkspace: state.currentWorkspace?.id === workspaceId
                ? { ...state.currentWorkspace, members: [...(state.currentWorkspace.members || []), member] }
                : state.currentWorkspace,
            }));
          }
          // Refresh workspace to ensure latest member list is persisted
          await get().fetchWorkspaceById(workspaceId);
          return { success: true, message: 'Invitation sent successfully' };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to invite member' };
        }
      },

      updateMemberRole: async (workspaceId, userId, role) => {
        try {
          const res = await api.put(`/api/workspaces/${workspaceId}/members/${userId}/role`, { role });
          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? { ...m, role } : m
            ),
            currentWorkspace: state.currentWorkspace?.id === workspaceId
              ? { ...state.currentWorkspace, members: state.currentWorkspace.members?.map((m) =>
                  m.userId === userId ? { ...m, role } : m
                )}
              : state.currentWorkspace,
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to update role' };
        }
      },

      updateMemberPermissions: async (workspaceId, userId, permissions) => {
        try {
          const res = await api.put(`/api/workspaces/${workspaceId}/members/${userId}/permissions`, permissions);
          set((state) => ({
            members: state.members.map((m) =>
              m.userId === userId ? { ...m, ...permissions } : m
            ),
            currentWorkspace: state.currentWorkspace?.id === workspaceId
              ? { ...state.currentWorkspace, members: state.currentWorkspace.members?.map((m) =>
                  m.userId === userId ? { ...m, ...permissions } : m
                )}
              : state.currentWorkspace,
          }));
          // Refresh the workspace to ensure latest permissions are persisted
          await get().fetchWorkspaceById(workspaceId);
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to update permissions' };
        }
      },

      removeMember: async (workspaceId, userId) => {
        try {
          await api.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
          set((state) => ({
            members: state.members.filter((m) => m.userId !== userId),
            currentWorkspace: state.currentWorkspace?.id === workspaceId
              ? { ...state.currentWorkspace, members: state.currentWorkspace.members?.filter((m) => m.userId !== userId) }
              : state.currentWorkspace,
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to remove member' };
        }
      },

      deleteWorkspace: async (workspaceId) => {
        try {
          await api.delete(`/api/workspaces/${workspaceId}`);
          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
            currentWorkspace: state.currentWorkspace?.id === workspaceId
              ? state.workspaces.find((w) => w.id !== workspaceId) || null
              : state.currentWorkspace,
          }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to delete workspace' };
        }
      },

      // called by socket: member:invited
      socketAddMember: (member) => {
        set((state) => ({ members: [...state.members, member] }));
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ currentWorkspace: state.currentWorkspace }),
    }
  )
);

export default useWorkspaceStore;
