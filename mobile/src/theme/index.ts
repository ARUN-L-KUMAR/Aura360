/**
 * Design tokens: the single source of truth for colour, type, spacing, shape, elevation and motion.
 * Components import from '@/theme' and never hard-code visual values (enforced by `npm run lint:tokens`).
 */
export * from './colors';
export * from './typography';
export * from './layout';
export * from './motion';
export * from './accessibility';
export { ThemeProvider, useTheme } from './provider';
export type { ThemeContextValue, ThemeMode } from './provider';
