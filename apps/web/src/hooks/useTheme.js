'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { applyPreference, getPreference, setPreference } from '@/lib/theme';

const ORDER = ['system', 'light', 'dark'];

// shared so the topbar toggle and the command palette stay in sync
const useThemeStore = create((set, get) => ({
  preference: 'system',
  theme: 'light',
  init: () => {
    const preference = getPreference();
    set({ preference, theme: applyPreference(preference) });
  },
  setTheme: (preference) => set({ preference, theme: setPreference(preference) }),
  cycleTheme: () => {
    const { preference, setTheme } = get();
    setTheme(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]);
  },
  syncSystem: () => set({ theme: applyPreference('system') }),
}));

// { preference, theme, setTheme, cycleTheme } — follows the OS while preference is 'system'
export function useTheme() {
  const state = useThemeStore();
  const { init, preference, syncSystem } = state;

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', syncSystem);
    return () => mq.removeEventListener('change', syncSystem);
  }, [preference, syncSystem]);

  return state;
}
