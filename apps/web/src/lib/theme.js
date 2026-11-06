// Theme preference: 'system' (default) | 'light' | 'dark', kept in localStorage.
// The resolved theme is written to <html data-theme> and drives the CSS tokens
// in globals.css.

export const THEME_KEY = 'teamhub-theme';

export const getPreference = () => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const systemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const applyPreference = (preference) => {
  const theme = preference === 'system' ? systemTheme() : preference;
  document.documentElement.dataset.theme = theme;
  return theme;
};

export const setPreference = (preference) => {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {}
  return applyPreference(preference);
};

// Inlined into <head> so the right theme is set before first paint (no flash).
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`;
