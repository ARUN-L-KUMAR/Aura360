import { AlertTriangle } from 'lucide-react-native';
import { View } from 'react-native';

import { SectionHead } from '@/components/finance/finance-ui';
import { Card } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import type { Budget, BudgetSummary } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';
import { budgetLevel } from './insights';
import { categoryLabel } from './labels';

type Props = {
  summary: BudgetSummary | undefined;
  /** The categories closest to their limit, fullest first (at most three are drawn). */
  categories: Budget[];
  /** The overall monthly budget, if one is set: its alert threshold becomes the marker on the bar. */
  overall?: Budget;
  onSeeBudgets?: () => void;
};

const BAR = spacing.sm + 2;
const MARKER_WIDTH = 2;
const MARKER_OVERHANG = spacing.xs;
const ALERT_ICON = spacing.md;

/**
 * "Budgets this month": the share of the monthly limit used as one large number and a bar with a marker where the alert
 * starts, then the categories that are closest to their own limit as small tiles (a warning icon AND colour near or over
 * the limit). Everything comes from the budgets the screen already loaded.
 */
export function BudgetOverviewCard({ summary, categories, overall, onSeeBudgets }: Props) {
  const { t } = useTranslation('finance');
  const { colors } = useTheme();

  const limit = summary ? (summary.overallCap > 0 ? summary.overallCap : summary.totalBudgeted) : 0;
  const spent = summary?.totalSpent ?? 0;
  const percent = summary ? (summary.overallCap > 0 ? summary.percentage : limit > 0 ? Math.round((spent / limit) * 100) : 0) : 0;
  const remaining = limit - spent;
  const alert = overall && overall.alertThreshold > 0 && overall.alertThreshold < 100 ? overall.alertThreshold : null;
  const showTotal = limit > 0;
  const over = showTotal && spent > limit;

  const caption = over ? t('overview.budgetOver', { over: formatMoney(-remaining), limit: formatMoney(limit) }) : t('overview.budgetLeft', { remaining: formatMoney(remaining), limit: formatMoney(limit) });
  const tiles = categories.slice(0, 3);

  return (
    <Card rounded="xl" padding="none" style={{ padding: spacing.lg, gap: spacing.md }}>
      <SectionHead
        overline={t('overview.budgetsOverline')}
        title={t('overview.budgetsTitle')}
        actionLabel={onSeeBudgets ? t('overview.seeAll') : undefined}
        actionAccessibilityLabel={t('overview.seeAllBudgets')}
        onActionPress={onSeeBudgets}
      />

      {showTotal ? (
        <View style={{ gap: spacing.sm }}>
          <View accessible accessibilityLabel={`${t('overview.budgetsTitle')}: ${t('overview.budgetUsedA11y', { percent })}. ${caption}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.sm }}>
            <Text variant="headline" weight="bold" numeric color={over ? 'errorText' : 'text'}>
              {percent}%
            </Text>
            <Text variant="caption" color="textSecondary" numeric style={{ flexShrink: 1 }}>
              {t('overview.budgetUsed')} · {caption}
            </Text>
          </View>

          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginVertical: MARKER_OVERHANG }}>
            <ProgressBar percent={percent} accent="finance" autoThresholdColor height={BAR} />
            {alert !== null ? (
              <View
                style={{
                  position: 'absolute',
                  start: `${alert}%`,
                  top: -MARKER_OVERHANG,
                  width: MARKER_WIDTH,
                  height: BAR + MARKER_OVERHANG * 2,
                  borderRadius: radius.pill,
                  backgroundColor: colors.warning,
                }}
              />
            ) : null}
          </View>

          {alert !== null ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Text variant="overline" color="warningText" numberOfLines={1}>
                {t('overview.alertAt', { percent: alert })}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {tiles.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {tiles.map((b) => {
            const level = budgetLevel(b);
            const category = categoryLabel(b.category);
            const values = { category, spent: formatMoney(b.spent), limit: formatMoney(b.amount), percent: b.percentage };
            const spoken = level === 'over' ? t('budgets.cardLabelOver', values) : level === 'near' ? t('budgets.cardLabelNear', values) : t('budgets.cardLabel', values);
            const flagged = level !== 'ok';
            const tone = level === 'over' ? colors.error : colors.warning;
            return (
              <PressableScale
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={spoken}
                accessibilityHint={t('overview.budgetRowHint')}
                disabled={!onSeeBudgets}
                haptic="select"
                ringRadius={radius.lg}
                onPress={onSeeBudgets}
                style={{
                  flexGrow: 1,
                  flexBasis: spacing.xxxl * 2,
                  minHeight: layout.minTouchTarget + spacing.sm,
                  justifyContent: 'center',
                  gap: 2,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: flagged ? withAlpha(tone, 0.45) : colors.border,
                  backgroundColor: flagged ? withAlpha(tone, 0.1) : colors.cardMuted,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  {flagged ? <AlertTriangle size={ALERT_ICON} color={level === 'over' ? colors.errorText : colors.warningText} strokeWidth={3} /> : null}
                  <Text variant="caption" weight="semiBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {category}
                  </Text>
                </View>
                <Text variant="title" weight="bold" numeric color={level === 'over' ? 'errorText' : level === 'near' ? 'warningText' : 'text'}>
                  {b.percentage}%
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
