import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS, ThemeColors } from '../constants/theme';
import { getSettings, updateSettings, ThemeMode } from '../database';

interface ThemeContextValue {
  // The user's stored preference: 'light' | 'dark' | 'system'
  themeMode: ThemeMode;
  // The resolved scheme actually being rendered right now (system resolved
  // to whatever the OS reports). Use this for anything that needs to know
  // "is it currently dark" rather than themeMode, since themeMode === 'system'
  // doesn't tell you which way the OS is currently set.
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await getSettings();
        if (mounted) setThemeModeState(settings.themeMode);
      } catch (error) {
        console.error('Failed to load theme setting:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode); // optimistic update so the UI flips instantly
    try {
      await updateSettings({ themeMode: mode });
    } catch (error) {
      console.error('Failed to persist theme setting:', error);
    }
  }, []);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
