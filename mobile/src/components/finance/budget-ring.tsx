import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';

import { ProgressRing } from '@/components/viz/progress-ring';
import type { Budget } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { useTheme, type ModuleKey } from '@/theme';
import { categoryIcon } from './category-icons';
import { budgetLevel } from './insights';
import { categoryLabel } from './labels';

/**
 * ProgressRing only takes a module accent, so the "warning near the limit, error over it" look borrows the two accents
 * closest to the status hues (yellow-green for near, orange for over). The icon in the middle and the status badge next
 * to the ring carry the meaning, so the colour is a bonus. A `tone` prop on ProgressRing would replace this.
 */
export function budgetRingAccent(level: 'ok' | 'near' | 'over'): ModuleKey {
  return level === 'over' ? 'fitness' : level === 'near' ? 'food' : 'finance';
}

type Props = {
  budget: Pick<Budget, 'category' | 'spent' | 'amount' | 'percentage' | 'isOverBudget' | 'isNearLimit'>;
  size?: number;
  thickness?: number;
};

/** A budget's usage as a ring with the category icon inside; an alert icon replaces it near and over the limit. */
export const BudgetRing = memo(function BudgetRing({ budget, size, thickness }: Props) {
  const { t } = useTranslation('finance');
  const { colors, accent } = useTheme();
  const level = budgetLevel(budget);
  const tone = accent(budgetRingAccent(level));

  return (
    <ProgressRing
      value={budget.percentage}
      max={100}
      size={size}
      thickness={thickness}
      accent={budgetRingAccent(level)}
      label={t('budgets.ringLabel', { category: categoryLabel(budget.category) })}
      valueText={t('budgets.ringValue', { spent: formatMoney(budget.spent), limit: formatMoney(budget.amount), percent: budget.percentage })}>
      {level === 'over' ? (
        <Ionicons name="alert-circle" size={24} color={colors.errorText} />
      ) : level === 'near' ? (
        <Ionicons name="warning" size={22} color={colors.warningText} />
      ) : (
        <Ionicons name={categoryIcon(budget.category)} size={22} color={tone.text} />
      )}
    </ProgressRing>
  );
});
