'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Accent,
  ACCENT_STORAGE_KEY,
  applyTheme,
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  isAccent,
  isThemeMode,
  MODE_STORAGE_KEY,
  ThemeMode,
} from './theme';

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Exposes the current theme and lets the user change it.
 *
 * State initialises from the DOM, not from localStorage. The pre-paint script
 * has already written the correct values onto <html>, so reading them back
 * means server and client markup agree and React never has to "correct" the
 * theme after hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT);

  useEffect(() => {
    const root = document.documentElement;
    const domMode: ThemeMode = root.classList.contains('dark') ? 'dark' : 'light';
    const domAccent = root.dataset.accent;

    setModeState(domMode);
    if (isAccent(domAccent)) {
      setAccentState(domAccent);
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyTheme(next, (document.documentElement.dataset.accent as Accent) ?? DEFAULT_ACCENT);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage. The theme still applies for this
      // session; it simply will not survive a reload.
    }
  }, []);

  const setAccent = useCallback((next: Accent) => {
    setAccentState(next);
    const currentMode: ThemeMode = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    applyTheme(currentMode, next);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, next);
    } catch {
      // See above.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  }, [setMode]);

  /**
   * Keeps two open tabs in step.
   *
   * The `storage` event fires only in *other* tabs, so changing the theme in
   * one window updates the rest without a reload.
   */
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === MODE_STORAGE_KEY && isThemeMode(event.newValue)) {
        setModeState(event.newValue);
        applyTheme(
          event.newValue,
          (document.documentElement.dataset.accent as Accent) ?? DEFAULT_ACCENT,
        );
      }
      if (event.key === ACCENT_STORAGE_KEY && isAccent(event.newValue)) {
        setAccentState(event.newValue);
        applyTheme(
          document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          event.newValue,
        );
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({ mode, accent, setMode, setAccent, toggleMode }),
    [mode, accent, setMode, setAccent, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
