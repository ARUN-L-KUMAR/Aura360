import type { TFunction } from 'i18next';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

import { addDays, isoOf } from '@/components/fitness/activity';
import { EntryRow, openEntry } from '@/components/fitness/entry-row';
import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { FAB_CLEARANCE, PeriodStepper, QueryError } from '@/components/fitness/section-kit';
import { WorkoutCard, WorkoutCardSkeleton } from '@/components/fitness/workout-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useFitnessEntries } from '@/features/fitness/hooks';
import { isWorkout, volumeOf } from '@/features/fitness/stats';
import type { FitnessEntry } from '@/features/fitness/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay, monthKey, monthLabel, shiftMonth, weekdayShort } from '@/lib/format';
import { layout, spacing } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

type Row =
  | { kind: 'day'; key: string; iso: string; count: number; minutes: number; volume: number }
  | { kind: 'workout'; key: string; entry: FitnessEntry; index: number };

const keyOf = (row: Row) => row.key;
const Separator = () => <View style={{ height: layout.itemGap }} />;

/** Workouts (newest first) with a heading row in front of each new day. */
function groupByDay(workouts: FitnessEntry[]): Row[] {
  const rows: Row[] = [];
  let current: Extract<Row, { kind: 'day' }> | null = null;
  workouts.forEach((entry, index) => {
    const iso = entry.date.slice(0, 10);
    if (!current || current.iso !== iso) {
      current = { kind: 'day', key: `day-${iso}`, iso, count: 0, minutes: 0, volume: 0 };
      rows.push(current);
    }
    current.count += 1;
    current.minutes += entry.duration ?? 0;
    current.volume += volumeOf(entry.exercises);
    rows.push({ kind: 'workout', key: entry.id, entry, index });
  });
  return rows;
}

/** "Today", "Yesterday" or "Mon, 5 Oct". */
function dayLabel(iso: string, t: TFunction<'fitness'>) {
  const today = isoOf(new Date());
  if (iso === today) return t('log.today');
  if (iso === addDays(today, -1)) return t('log.yesterday');
  return t('log.dayHeading', { weekday: weekdayShort(iso), date: formatDay(iso) });
}

function DayHeading({ row }: { row: Extract<Row, { kind: 'day' }> }) {
  const { t } = useTranslation('fitness');
  const details = [row.minutes > 0 ? t('units.min', { value: row.minutes }) : null, row.volume > 0 ? t('units.kg', { value: Math.round(row.volume).toLocaleString(getDeviceLocale()) }) : null].filter(Boolean).join(' · ');
  const label = dayLabel(row.iso, t);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={[label, t('log.dayCount', { count: row.count }), details].filter(Boolean).join(', ')}
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: spacing.md, paddingTop: spacing.xs }}>
      <Text variant="label" weight="semiBold" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {details ? (
        <Text variant="caption" color="textSecondary" numeric>
          {details}
        </Text>
      ) : null}
    </View>
  );
}

export function LogSection({ header, onLogWorkout }: { header: ReactNode; onLogWorkout: () => void }) {
  const router = useRouter();
  const { t } = useTranslation('fitness');
  const [month, setMonth] = useState(monthKey());
  const entries = useFitnessEntries(`${month}-01`, lastDayOf(month));
  const isCurrent = month === monthKey();

  const padding = useScreenPadding();
  const refreshControl = useRefreshControl({ onRefresh: () => entries.refetch(), refreshing: entries.isRefetching });

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  // Weigh-ins, measurements and goals: everything that is not a workout.
  const others = useMemo(() => list.filter((entry) => !isWorkout(entry)), [list]);

  const rows = useMemo(() => groupByDay(workouts), [workouts]);
  const renderItem = useCallback(({ item }: { item: Row }) => (item.kind === 'day' ? <DayHeading row={item} /> : <WorkoutCard entry={item.entry} index={item.index} showDate={false} />), []);

  const hasData = !!entries.data;
  const empty = !entries.isPending && !entries.isError && list.length === 0;

  const listHeader = (
    <View style={{ gap: layout.sectionGap, paddingBottom: rows.length > 0 ? layout.itemGap : 0 }}>
      {header}

      <PeriodStepper
        accent="fitness"
        label={monthLabel(month)}
        previousLabel={t('log.previousMonth')}
        nextLabel={t('log.nextMonth')}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        nextDisabled={isCurrent}
      />

      {entries.isPending ? (
        <>
          <WorkoutCardSkeleton />
          <WorkoutCardSkeleton />
        </>
      ) : null}

      {entries.isError ? <QueryError error={entries.error} hasData={hasData} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {empty ? (
        <EmptyState
          accent="fitness"
          icon="barbell-outline"
          title={t('log.emptyTitle', { month: monthLabel(month) })}
          description={t('log.emptyDescription')}
          actionTitle={t('actions.logWorkout')}
          onAction={onLogWorkout}
        />
      ) : null}

      {workouts.length > 0 ? (
        <>
          <FitnessSummary entries={workouts} />
          <SectionHeader title={t('log.workouts')} count={workouts.length} />
        </>
      ) : null}
    </View>
  );

  const listFooter = !entries.isPending ? (
    <View style={{ gap: layout.sectionGap, paddingTop: rows.length > 0 ? layout.sectionGap : 0 }}>
      {others.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('log.measurementsAndGoals')} count={others.length} />
          <Card padding="none" style={{ overflow: 'hidden' }}>
            {others.map((entry, index) => (
              <EntryRow key={entry.id} entry={entry} divider={index < others.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}

      <Button title={t('log.logMeasurement')} variant="tertiary" leftIcon="scale-outline" onPress={() => openEntry(router)} />

      {list.length > 0 ? (
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('log.latestEntry', { date: formatDay(list[0].date) })}
        </Text>
      ) : null}
    </View>
  ) : null;

  return (
    <FlatList
      data={rows}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      refreshControl={refreshControl}
      contentContainerStyle={[padding, { paddingBottom: FAB_CLEARANCE }]}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={6}
      windowSize={7}
    />
  );
}
