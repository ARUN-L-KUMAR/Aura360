import { withAlpha } from '@/components/ui/logic';
import type { Accent, ColorScheme } from '@/theme';

/**
 * The web's module tint behind an icon or chip: the accent's light shade in light mode, and a faint wash of the accent
 * over the surface in dark mode (instead of the saturated 900 shade), so tinted tiles stay quiet on near-black cards.
 */
export function accentTint(a: Accent, scheme: ColorScheme, strength = 0.16): string {
  return scheme === 'dark' ? withAlpha(a.solid, strength) : a.soft;
}
