import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';

import { storage } from '@/lib/storage';

import { useReducedMotion, useReducedTransparency } from './accessibility';
import { categoryAccent, colorShades, palettes, type Accent, type ColorScheme, type ModuleKey, type ThemeColors } from './colors';
import { elevation, type ElevationLevel } from './layout';
import { typography } from './typography';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  /** Accent set (solid / soft / text / border) for a module in the current scheme. */
  accent: (key: ModuleKey) => Accent;
  /** Shadow style for an elevation level in the current scheme. */
  elevation: (level: ElevationLevel) => ViewStyle;
  reduceMotion: boolean;
  /** True when blur should be replaced with solid surfaces. */
  reduceTransparency: boolean;
  shades: typeof colorShades;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function build(
  mode: ThemeMode,
  scheme: ColorScheme,
  reduceMotion: boolean,
  reduceTransparency: boolean,
  setMode: (m: ThemeMode) => void,
): ThemeContextValue {
  return {
    mode,
    scheme,
    colors: palettes[scheme],
    accent: (key) => categoryAccent(key, scheme),
    elevation: (level) => elevation(level, scheme),
    reduceMotion,
    reduceTransparency,
    shades: colorShades,
    typography,
    setMode,
    toggleTheme: () => setMode(scheme === 'dark' ? 'light' : 'dark'),
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReducedTransparency();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getTheme().then((saved) => {
      if (saved === 'system' || saved === 'light' || saved === 'dark') setModeState(saved);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void storage.setTheme(next);
  }, []);

  const scheme: ColorScheme = mode === 'system' ? systemScheme : mode;
  const value = useMemo(
    () => build(mode, scheme, reduceMotion, reduceTransparency, setMode),
    [mode, scheme, reduceMotion, reduceTransparency, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const noop = () => {};

/** Theme for the current scheme. Outside a provider (e.g. an error boundary) it follows the system scheme. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return useMemo(() => context ?? build('system', systemScheme, false, false, noop), [context, systemScheme]);
}
