import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { RingCardSkeleton } from '@/components/finance/finance-skeletons';
import { SectionHead } from '@/components/finance/finance-ui';
import { goalAccent } from '@/components/finance/goal-accent';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { ProgressRing } from '@/components/viz/progress-ring';
import { useGoals } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';
import { categoryLabel } from './labels';

export function openGoal(router: ReturnType<typeof useRouter>, goal?: Goal) {
  router.push({ pathname: '/finance/goal', params: goal ? { goal: JSON.stringify(goal) } : {} });
}

const CARD_RING = spacing.xxxl + spacing.xxl;
const CARD_RING_THICKNESS = spacing.sm;
const SUMMARY_RING = spacing.xxxl * 2 + spacing.sm;
const SUMMARY_RING_THICKNESS = spacing.md - 2;
const CHECK = spacing.xxl + spacing.xs;

const GoalCard = memo(function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const router = useRouter();
  const { accent: accentFor } = useTheme();
  const motion = useListMotion(index);
  const { t } = useTranslation('finance');
  const accent = goalAccent(goal.color);

  // The check pops only when the goal becomes complete while this card is on screen (for example after a deposit).
  // A goal that was already complete just shows a still check.
  const wasComplete = useRef(goal.isCompleted);
  const [justReached, setJustReached] = useState(false);
  useEffect(() => {
    if (goal.isCompleted && !wasComplete.current) setJustReached(true);
    wasComplete.current = goal.isCompleted;
  }, [goal.isCompleted]);

  const deadline = goal.isCompleted
    ? t('goals.reached')
    : goal.daysRemaining === null
      ? null
      : goal.daysRemaining < 0
        ? t('goals.overdue', { count: Math.abs(goal.daysRemaining) })
        : goal.daysRemaining === 0
          ? t('goals.dueToday')
          : t('goals.daysLeft', { count: goal.daysRemaining });
  const overdue = !goal.isCompleted && goal.daysRemaining !== null && goal.daysRemaining < 0;
  const progress = t('goals.progress', { current: formatMoney(goal.currentAmount), target: formatMoney(goal.targetAmount) });
  const category = categoryLabel(goal.category);
  const label = deadline
    ? t('goals.cardLabelDeadline', { title: goal.title, category, percent: goal.percentage, progress, deadline })
    : t('goals.cardLabel', { title: goal.title, category, percent: goal.percentage, progress });

  return (
    <Animated.View {...motion}>
      <Card style={{ gap: spacing.md }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={t('goals.cardHint')}
          onPress={() => openGoal(router, goal)}
          ringRadius={radius.md}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <ProgressRing
            value={goal.percentage}
            size={CARD_RING}
            thickness={CARD_RING_THICKNESS}
            accent={accent}
            label={goal.title}
            valueText={t('goals.ringValue', { percent: goal.percentage, progress })}>
            {goal.isCompleted ? (
              justReached ? (
                <SuccessCheck size={CHECK} accent={accent} accessibilityLabel={null} />
              ) : (
                <Ionicons name="checkmark-circle" size={CHECK} color={accentFor(accent).text} />
              )
            ) : (
              <Text variant="label" weight="bold" numeric>
                {goal.percentage}%
              </Text>
            )}
          </ProgressRing>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="body" weight="bold" numberOfLines={2}>
              {goal.title}
            </Text>
            <Text variant="caption" color={overdue ? 'errorText' : 'textSecondary'} numberOfLines={2}>
              {deadline ? t('goals.categoryDeadline', { category, deadline }) : category}
            </Text>
            <Text variant="label" weight="bold" numeric>
              {progress}
            </Text>
            {!goal.isCompleted ? (
              <Text variant="caption" numeric color="textSecondary">
                {t('goals.toGo', { amount: formatMoney(Math.max(0, goal.remaining)) })}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        {goal.isCompleted ? (
          <Badge severity="success" label={t('goals.reached')} size="sm" />
        ) : (
          <Button
            title={t('goals.addMoney')}
            variant="secondary"
            size="md"
            leftIcon="add"
            accessibilityLabel={t('goals.addMoneyTo', { title: goal.title })}
            onPress={() => router.push({ pathname: '/finance/contribute', params: { goal: JSON.stringify(goal) } })}
          />
        )}
      </Card>
    </Animated.View>
  );
});

export function GoalsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const blockMotion = useBlockMotion();
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useGoals();
  const summary = data?.summary;
  const goals = data?.data ?? [];
  const offline = isPending && fetchStatus === 'paused';

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {isPending && !offline ? (
        <View style={{ gap: spacing.md }}>
          <RingCardSkeleton summary />
          <RingCardSkeleton />
          <RingCardSkeleton />
        </View>
      ) : offline ? (
        <OfflineState description={t('offline.goals')} onRetry={() => void refetch()} />
      ) : isError && !data ? (
        <LoadError error={error} title={t('goals.error')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : (
        <>
          {isError ? <RefreshError error={error} onRetry={() => void refetch()} retrying={isRefetching} /> : null}

          {summary && summary.totalGoals > 0 ? (
            <Animated.View {...blockMotion}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <ProgressRing
                  value={summary.overallProgress}
                  size={SUMMARY_RING}
                  thickness={SUMMARY_RING_THICKNESS}
                  accent="finance"
                  label={t('goals.overallProgress')}
                  valueText={t('goals.summaryValue', { percent: Math.round(summary.overallProgress), saved: formatMoney(summary.totalSaved), target: formatMoney(summary.totalTarget) })}>
                  <Text variant="title" weight="bold" numeric>
                    {Math.round(summary.overallProgress)}%
                  </Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="overline" color="textMuted" accessibilityRole="header">
                    {t('goals.savingsTitle')}
                  </Text>
                  <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatMoney(summary.totalSaved)}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary">
                    {t('goals.savedToward', { target: formatMoney(summary.totalTarget) })}
                  </Text>
                  <Tag label={t('goals.reachedCount', { done: summary.completedCount, total: summary.totalGoals })} icon="flag" accent="finance" />
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {goals.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              <SectionHead overline={t('goals.listOverline')} title={t('goals.listTitle')} />
              {goals.map((goal, i) => (
                <GoalCard key={goal.id} goal={goal} index={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              accent="finance"
              icon="flag-outline"
              title={t('goals.emptyTitle')}
              description={t('goals.emptyBody')}
              actionTitle={t('goals.create')}
              onAction={() => openGoal(router)}
            />
          )}

          {goals.length > 0 ? <Button title={t('goals.new')} variant="secondary" leftIcon="add" onPress={() => openGoal(router)} /> : null}
        </>
      )}
    </Screen>
  );
}
