import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useGoals } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing } from '@/theme';

export function openGoal(router: ReturnType<typeof useRouter>, goal?: Goal) {
  router.push({ pathname: '/finance/goal', params: goal ? { goal: JSON.stringify(goal) } : {} });
}

function deadlineText(goal: Goal) {
  if (goal.isCompleted) return 'Goal reached';
  if (goal.daysRemaining === null) return null;
  if (goal.daysRemaining < 0) return `${Math.abs(goal.daysRemaining)} days overdue`;
  if (goal.daysRemaining === 0) return 'Due today';
  return `${goal.daysRemaining} days left`;
}

export function GoalsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useGoals();
  const summary = data?.summary;

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      {header}

      {isError ? (
        <Card>
          <Text muted>{error instanceof Error ? error.message : "Couldn't load goals."}</Text>
        </Card>
      ) : null}

      {summary && summary.totalGoals > 0 ? (
        <GlassCard glowColor={moduleColors.finance} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="flag-outline" size={18} color={moduleColors.finance} />
              <Text variant="heading" style={{ fontSize: 16 }}>
                Financial Goals
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: `${moduleColors.finance}25`,
              }}>
              <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
                {summary.completedCount}/{summary.totalGoals} reached
              </Text>
            </View>
          </View>

          <Text variant="display" style={{ fontSize: 32, lineHeight: 36 }}>
            {formatMoney(summary.totalSaved)}
          </Text>

          <ProgressBar percent={summary.overallProgress} color={moduleColors.finance} />

          <Text variant="caption" muted style={{ marginTop: spacing.xs }}>
            {summary.overallProgress}% overall of {formatMoney(summary.totalTarget)} target
          </Text>
        </GlassCard>
      ) : null}

      {isPending ? (
        <Card>
          <Text muted>Loading…</Text>
        </Card>
      ) : null}

      {(data?.data ?? []).map((goal) => {
        const deadline = deadlineText(goal);
        return (
          <Pressable key={goal.id} accessibilityRole="button" onPress={() => openGoal(router, goal)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <GlassCard glowColor={goal.color} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  <Text variant="caption" muted>
                    {goal.category}
                    {deadline ? ` · ${deadline}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                    backgroundColor: `${goal.color}20`,
                  }}>
                  <Text variant="label" style={{ color: goal.color, fontWeight: '700', fontSize: 13 }}>
                    {goal.percentage}%
                  </Text>
                </View>
              </View>

              <ProgressBar percent={goal.percentage} color={goal.color} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption" muted>
                  {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}
                </Text>
                {!goal.isCompleted ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/finance/contribute', params: { goal: JSON.stringify(goal) } })}
                    hitSlop={8}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 4,
                      borderRadius: radius.sm,
                      backgroundColor: `${moduleColors.finance}20`,
                    }}>
                    <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
                      + Add Money
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </GlassCard>
          </Pressable>
        );
      })}

      {!isPending && (data?.data.length ?? 0) === 0 && !isError ? (
        <EmptyState
          icon="flag-outline"
          title="No Financial Goals"
          description="Create savings goals for an emergency fund, travel, electronics, or investments."
        />
      ) : null}

      <Button title="+ Create Savings Goal" variant="secondary" onPress={() => openGoal(router)} />
    </Screen>
  );
}

