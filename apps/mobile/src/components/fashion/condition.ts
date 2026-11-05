import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { BadgeSeverity } from '@/components/ui/badge';
import type { FashionCondition } from '@/features/fashion/types';
import { i18n } from '@/i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ConditionMeta = { label: string; severity: BadgeSeverity; icon: IconName };

/** How each condition is flagged. Status is always an icon plus a label, never colour alone. */
const CONDITION_STYLE: Record<FashionCondition, { severity: BadgeSeverity; icon: IconName }> = {
  new: { severity: 'success', icon: 'sparkles' },
  good: { severity: 'info', icon: 'checkmark-circle' },
  fair: { severity: 'neutral', icon: 'time-outline' },
  needs_repair: { severity: 'error', icon: 'construct-outline' },
  needs_wash: { severity: 'warning', icon: 'water-outline' },
};

/** The name of a condition in the current language. Call while rendering, never at module scope. */
export function conditionLabel(condition: FashionCondition): string {
  switch (condition) {
    case 'new':
      return i18n.t('fashion:conditions.new');
    case 'good':
      return i18n.t('fashion:conditions.good');
    case 'fair':
      return i18n.t('fashion:conditions.fair');
    case 'needs_repair':
      return i18n.t('fashion:conditions.needs_repair');
    case 'needs_wash':
      return i18n.t('fashion:conditions.needs_wash');
  }
}

export function conditionMeta(condition?: string | null): ConditionMeta | null {
  if (!condition) return null;
  const style = CONDITION_STYLE[condition as FashionCondition];
  if (!style) return null;
  return { ...style, label: conditionLabel(condition as FashionCondition) };
}

/** Conditions worth flagging on a card; "good" and "well worn" are the quiet default. */
export function isNotableCondition(condition?: string | null) {
  return condition === 'new' || condition === 'needs_repair' || condition === 'needs_wash';
}
