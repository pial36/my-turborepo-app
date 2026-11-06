import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      members: [],
      invites: [],
      isLoading: false,

      fetchWorkspaces: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/api/workspaces');
          const workspaces = res.data.data || [];
          // the persisted selection may belong to another user or a deleted
          // workspace: keep it only if it is still in this user's list
          const savedId = get().currentWorkspace?.id;
          const current = workspaces.find((w) => w.id === savedId) || workspaces[0] || null;
          set({ workspaces, currentWorkspace: current, isLoading: false });
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
          const { data, pending, message } = res.data;
          if (pending) {
            // no account yet — the invite is accepted when they register
            set((state) => ({ invites: [data, ...state.invites] }));
            return { success: true, pending: true, message };
          }
          const member = data;
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
          return { success: true, message: message || 'Member added' };
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

      // pending invites for emails without an account (admin only)
      fetchInvites: async (workspaceId) => {
        try {
          const res = await api.get(`/api/workspaces/${workspaceId}/invites`);
          set({ invites: res.data.data || [] });
        } catch (_) {
          set({ invites: [] });
        }
      },

      cancelInvite: async (workspaceId, inviteId) => {
        try {
          await api.delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`);
          set((state) => ({ invites: state.invites.filter((i) => i.id !== inviteId) }));
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Failed to cancel invite' };
        }
      },

      // called by socket: member:invited { workspaceId, member }
      socketAddMember: ({ workspaceId, member } = {}) => {
        if (!member) return;
        const addUnique = (list = []) =>
          list.some((m) => m.userId === member.userId) ? list : [...list, member];
        set((state) => ({
          members: addUnique(state.members),
          currentWorkspace: state.currentWorkspace?.id === workspaceId
            ? { ...state.currentWorkspace, members: addUnique(state.currentWorkspace.members) }
            : state.currentWorkspace,
        }));
      },

      // called by socket: workspace:updated (name/description/accent)
      socketUpdateWorkspace: (workspace) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === workspace.id ? { ...w, ...workspace } : w)),
          currentWorkspace: state.currentWorkspace?.id === workspace.id
            ? { ...state.currentWorkspace, ...workspace }
            : state.currentWorkspace,
        }));
      },

      // logout: forget the selection so the next user starts clean
      reset: () => set({ workspaces: [], currentWorkspace: null, members: [], invites: [] }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({ currentWorkspace: state.currentWorkspace }),
    }
  )
);

export default useWorkspaceStore;
