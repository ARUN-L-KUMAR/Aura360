import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import { EntryRow, openEntry } from '@/components/fitness/entry-row';
import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { FAB_CLEARANCE, PeriodStepper, QueryError } from '@/components/fitness/section-kit';
import { WorkoutCard } from '@/components/fitness/workout-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFitnessEntries } from '@/features/fitness/hooks';
import { isWorkout } from '@/features/fitness/stats';
import type { FitnessEntry } from '@/features/fitness/types';
import { formatDay, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { layout, spacing } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

const keyOf = (entry: FitnessEntry) => entry.id;
const Separator = () => <View style={{ height: layout.itemGap }} />;

export function LogSection({ header, onLogWorkout }: { header: ReactNode; onLogWorkout: () => void }) {
  const router = useRouter();
  const [month, setMonth] = useState(monthKey());
  const entries = useFitnessEntries(`${month}-01`, lastDayOf(month));
  const isCurrent = month === monthKey();

  const padding = useScreenPadding();
  const refreshControl = useRefreshControl({ onRefresh: () => entries.refetch(), refreshing: entries.isRefetching });

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  // Weigh-ins, measurements and goals: everything that is not a workout.
  const others = useMemo(() => list.filter((entry) => !isWorkout(entry)), [list]);

  const renderItem = useCallback(({ item, index }: { item: FitnessEntry; index: number }) => <WorkoutCard entry={item} index={index} />, []);

  const hasData = !!entries.data;
  const empty = !entries.isPending && !entries.isError && list.length === 0;

  const listHeader = (
    <View style={{ gap: layout.sectionGap }}>
      {header}

      <PeriodStepper
        accent="fitness"
        label={monthLabel(month)}
        previousLabel="Previous month"
        nextLabel="Next month"
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        nextDisabled={isCurrent}
      />

      {entries.isPending ? (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={3} />
        </>
      ) : null}

      {entries.isError ? <QueryError error={entries.error} hasData={hasData} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {empty ? (
        <EmptyState
          accent="fitness"
          icon="barbell-outline"
          title={`Nothing logged in ${monthLabel(month)}`}
          description="Track your strength, cardio and exercises to see your progress."
          actionTitle="Log a workout"
          onAction={onLogWorkout}
        />
      ) : null}

      {workouts.length > 0 ? (
        <>
          <FitnessSummary entries={workouts} />
          <SectionHeader title="Workouts" count={workouts.length} />
        </>
      ) : null}
    </View>
  );

  const listFooter = !entries.isPending ? (
    <View style={{ gap: layout.sectionGap }}>
      {others.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Measurements and goals" count={others.length} />
          <Card padding="none" style={{ overflow: 'hidden' }}>
            {others.map((entry, index) => (
              <EntryRow key={entry.id} entry={entry} divider={index < others.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}

      <Button title="Log a measurement or goal" variant="tertiary" leftIcon="scale-outline" onPress={() => openEntry(router)} />

      {list.length > 0 ? (
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          Latest entry {formatDay(list[0].date)}
        </Text>
      ) : null}
    </View>
  ) : null;

  return (
    <FlatList
      data={workouts}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      refreshControl={refreshControl}
      contentContainerStyle={[padding, { paddingBottom: FAB_CLEARANCE }]}
      keyboardShouldPersistTaps="handled"
    />
  );
}
