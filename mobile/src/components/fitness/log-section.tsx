import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { EntryRow, openEntry } from '@/components/fitness/entry-row';
import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { SectionLabel } from '@/components/fitness/section-label';
import { WorkoutCard } from '@/components/fitness/workout-card';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useFitnessEntries } from '@/features/fitness/hooks';
import { isWorkout } from '@/features/fitness/stats';
import { formatDay, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { moduleColors, spacing, useTheme } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

export function LogSection({ header, onLogWorkout }: { header: ReactNode; onLogWorkout: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [month, setMonth] = useState(monthKey());
  const entries = useFitnessEntries(`${month}-01`, lastDayOf(month));
  const isCurrent = month === monthKey();

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  // Weigh-ins, measurements and goals: everything that is not a workout.
  const others = useMemo(() => list.filter((entry) => !isWorkout(entry)), [list]);

  return (
    <Screen onRefresh={() => entries.refetch()} refreshing={entries.isRefetching}>
      {header}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="heading">{monthLabel(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrent}
          hitSlop={12}
          style={{ opacity: isCurrent ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {entries.isPending ? (
        <GlassCard>
          <Text muted>Loading…</Text>
        </GlassCard>
      ) : null}
      {entries.isError ? (
        <GlassCard>
          <Text muted>{entries.error instanceof Error ? entries.error.message : "Couldn't load entries."}</Text>
        </GlassCard>
      ) : null}

      {!entries.isPending && !entries.isError && list.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title={`Nothing logged in ${monthLabel(month)}`}
          description="Track your strength, cardio and exercises to see your progress."
          actionTitle="Log a workout"
          onAction={onLogWorkout}
          color={moduleColors.fitness}
        />
      ) : null}

      {workouts.length > 0 ? (
        <>
          <FitnessSummary entries={workouts} />
          <View style={{ gap: spacing.sm }}>
            <SectionLabel>{`Workouts (${workouts.length})`}</SectionLabel>
            {workouts.map((entry) => (
              <WorkoutCard key={entry.id} entry={entry} />
            ))}
          </View>
        </>
      ) : null}

      {others.length > 0 ? (
        <GlassCard style={{ gap: spacing.xs }}>
          <SectionLabel>Measurements & goals</SectionLabel>
          {others.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </GlassCard>
      ) : null}

      {!entries.isPending ? (
        <Pressable accessibilityRole="button" onPress={() => openEntry(router)} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text variant="label" muted>
            Log a measurement or goal
          </Text>
        </Pressable>
      ) : null}
      {list.length > 0 ? (
        <Text variant="caption" muted style={{ textAlign: 'center' }}>
          Latest entry {formatDay(list[0].date)}
        </Text>
      ) : null}
    </Screen>
  );
}
