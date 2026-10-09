import { useColorScheme } from 'react-native';

/**
 * Aura360 palette, matching the web app's deep slate look (app/globals.css).
 * Components read colours through useTheme(), so light / dark follows the phone setting.
 */
export const palettes = {
  light: {
    background: '#f6f8fa',
    card: '#ffffff',
    cardMuted: '#eef2f6',
    border: '#e2e8f0',
    text: '#0f1c2b',
    textMuted: '#64748b',
    primary: '#243b53',
    primaryText: '#ffffff',
    accent: '#e6edf3',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#d97706',
    overlay: 'rgba(15, 28, 43, 0.45)',
  },
  dark: {
    background: '#0b1118',
    card: '#121a24',
    cardMuted: '#182331',
    border: '#223041',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    primary: '#f1f5f9',
    primaryText: '#0b1118',
    accent: '#1c2a3a',
    success: '#4ade80',
    danger: '#f87171',
    warning: '#fbbf24',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palettes.light]: string };

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

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palettes[scheme] as ThemeColors };
}
