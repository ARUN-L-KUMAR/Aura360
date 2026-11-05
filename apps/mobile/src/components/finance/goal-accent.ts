import { GOAL_COLORS } from '@/features/finance/types';
import type { ModuleKey } from '@/theme';

/** Module accent closest to each swatch in GOAL_COLORS (same order), for the ring drawn with a goal. */
const SWATCH_ACCENTS: readonly ModuleKey[] = ['ai', 'finance', 'notes', 'food', 'fitness', 'fashion', 'skincare'];

/** ProgressRing takes an accent, not a hex: pick the one that matches the goal's saved colour (green when unknown). */
export function goalAccent(color: string): ModuleKey {
  const index = GOAL_COLORS.indexOf(color);
  return (index >= 0 ? SWATCH_ACCENTS[index] : undefined) ?? 'finance';
}
