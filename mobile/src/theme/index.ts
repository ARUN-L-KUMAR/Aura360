import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { storage } from '@/lib/storage';

/**
 * Full color shade scales (50-950) for executive consistency and depth across mobile components.
 */
export const colorShades = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#090d16',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
} as const;

/**
 * Professional typography system powered by Plus Jakarta Sans and Inter.
 */
export const typography = {
  fontFamily: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
    interRegular: 'Inter_400Regular',
    interMedium: 'Inter_500Medium',
    interSemiBold: 'Inter_600SemiBold',
    interBold: 'Inter_700Bold',
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  },
  fallback: {
    sans: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }) as string,
  },
} as const;

/**
 * Aura360 palette with primary and secondary accents, dedicated shades, and dark/light modes.
 */
export const palettes = {
  light: {
    background: colorShades.slate[50],
    card: '#ffffff',
    cardMuted: colorShades.slate[100],
    border: colorShades.slate[200],
    borderSubtle: colorShades.slate[100],
    text: colorShades.slate[900],
    textSecondary: colorShades.slate[600],
    textMuted: colorShades.slate[500],
    primary: colorShades.primary[600],
    primaryText: '#ffffff',
    primaryLight: colorShades.primary[50],
    primaryDark: colorShades.primary[800],
    secondary: colorShades.secondary[600],
    secondaryText: '#ffffff',
    secondaryLight: colorShades.secondary[50],
    secondaryDark: colorShades.secondary[800],
    accent: colorShades.primary[50],
    accentForeground: colorShades.primary[700],
    success: colorShades.success[500],
    danger: colorShades.danger[500],
    warning: colorShades.warning[500],
    info: colorShades.secondary[500],
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  dark: {
    background: colorShades.slate[950],
    card: '#111827',
    cardMuted: '#1a2333',
    border: '#1f293d',
    borderSubtle: '#151e2e',
    text: colorShades.slate[50],
    textSecondary: colorShades.slate[300],
    textMuted: colorShades.slate[400],
    primary: colorShades.primary[500],
    primaryText: '#ffffff',
    primaryLight: colorShades.primary[400],
    primaryDark: colorShades.primary[700],
    secondary: colorShades.secondary[400],
    secondaryText: colorShades.slate[950],
    secondaryLight: colorShades.secondary[900],
    secondaryDark: colorShades.secondary[600],
    accent: '#1e293b',
    accentForeground: colorShades.primary[300],
    success: colorShades.success[400],
    danger: colorShades.danger[400],
    warning: colorShades.warning[400],
    info: colorShades.secondary[400],
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palettes.light]: string };
export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

/** One accent per module, used for icons and charts so each area is recognisable at a glance. */
export const moduleColors = {
  finance: '#10b981',
  fitness: '#f97316',
  food: '#eab308',
  notes: '#8b5cf6',
  saved: '#0ea5e9',
  fashion: '#ec4899',
  skincare: '#14b8a6',
  time: '#6366f1',
  ai: '#a855f7',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  shades: typeof colorShades;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getTheme().then((saved) => {
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    void storage.setTheme(newMode);
  }, []);

  const scheme: ColorScheme = mode === 'system' ? systemScheme : mode;

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = scheme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [scheme, setMode]);

  const value = useMemo(
    () => ({
      mode,
      scheme,
      colors: palettes[scheme] as ThemeColors,
      shades: colorShades,
      typography,
      setMode,
      toggleTheme,
    }),
    [mode, scheme, setMode, toggleTheme]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  if (!context) {
    return {
      mode: 'system',
      scheme: systemScheme,
      colors: palettes[systemScheme] as ThemeColors,
      shades: colorShades,
      typography,
      setMode: () => {},
      toggleTheme: () => {},
    };
  }

  return context;
}

