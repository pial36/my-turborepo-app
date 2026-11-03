"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/api/auth/login', { email, password });
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.message || 'Login failed' };
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/api/auth/register', { email, password, name });
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.message || 'Registration failed' };
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout');
        } catch (_) {}
        set({ user: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      updateProfile: async (data) => {
        try {
          const res = await api.put('/api/auth/profile', data);
          set({ user: res.data.data });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Update failed' };
        }
      },

      uploadAvatar: async (file) => {
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          const res = await api.put('/api/auth/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          set({ user: res.data.data });
          return { success: true };
        } catch (err) {
          return { success: false, error: err.response?.data?.message || 'Avatar upload failed' };
        }
      },

      fetchMe: async () => {
        try {
          const res = await api.get('/api/auth/me');
          set({ user: res.data.data, isAuthenticated: true });
          return { success: true };
        } catch (_) {
          set({ user: null, isAuthenticated: false });
          return { success: false };
        }
      },
    }),
    {
      name: 'auth-storage',
      skipHydration: true,
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;
