import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { BadgeSeverity } from '@/components/ui/badge';
import type { FashionCondition } from '@/features/fashion/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ConditionMeta = { label: string; severity: BadgeSeverity; icon: IconName };

/** How each condition is worded and flagged. Status is always an icon plus a label, never colour alone. */
export const CONDITION_META: Record<FashionCondition, ConditionMeta> = {
  new: { label: 'Brand new', severity: 'success', icon: 'sparkles' },
  good: { label: 'Good', severity: 'info', icon: 'checkmark-circle' },
  fair: { label: 'Well worn', severity: 'neutral', icon: 'time-outline' },
  needs_repair: { label: 'Needs repair', severity: 'error', icon: 'construct-outline' },
  needs_wash: { label: 'Needs wash', severity: 'warning', icon: 'water-outline' },
};

export function conditionMeta(condition?: string | null): ConditionMeta | null {
  if (!condition) return null;
  return CONDITION_META[condition as FashionCondition] ?? null;
}

/** Conditions worth flagging on a card; "good" and "well worn" are the quiet default. */
export function isNotableCondition(condition?: string | null) {
  return condition === 'new' || condition === 'needs_repair' || condition === 'needs_wash';
}
