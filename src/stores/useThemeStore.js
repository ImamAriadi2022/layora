import { create } from 'zustand';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('layora_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const initialTheme = getInitialTheme();
applyThemeClass(initialTheme);

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    const valid = theme === 'dark' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('layora_theme', valid);
    }
    applyThemeClass(valid);
    set({ theme: valid });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('layora_theme', next);
      }
      applyThemeClass(next);
      return { theme: next };
    }),
}));
