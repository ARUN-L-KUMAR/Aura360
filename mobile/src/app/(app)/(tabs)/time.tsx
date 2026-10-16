import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE, useEntering } from '@/components/finance/list-helpers';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Button } from '@/components/ui/button';
import { Card, withAlpha } from '@/components/ui/card';
import { CategoryFab, CategoryFrame, CategoryHeader } from '@/components/ui/category-template';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import { useRunningTimer, useSaveTimeLog, useTimeLogs } from '@/features/time/hooks';
import { TIME_CATEGORIES, byCategory, categoryColor, formatMinutes, totalMinutes, type TimeLog } from '@/features/time/types';
import { ApiError } from '@/lib/api';
import { formatDay, monthKey, monthLabel, weekdayShort } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function openTimeLog(router: ReturnType<typeof useRouter>, log?: TimeLog) {
  router.push({ pathname: '/time/log', params: log ? { log: JSON.stringify(log) } : {} });
}

type Day = { day: string; items: TimeLog[] };

export default function TimeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const padding = useScreenPadding();
  const [month, setMonth] = useState(monthKey());

  const monthLogs = useTimeLogs(`${month}-01`, lastDayOf(month));
  const today = toIsoDay(new Date());
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toIsoDay(d);
  }, []);
  const weekLogs = useTimeLogs(weekStart, today);

  const refreshControl = useRefreshControl({
    onRefresh: () => Promise.all([monthLogs.refetch(), weekLogs.refetch()]),
    refreshing: monthLogs.isRefetching || weekLogs.isRefetching,
  });

  const logs = useMemo(() => monthLogs.data ?? [], [monthLogs.data]);
  const todayMinutes = totalMinutes((weekLogs.data ?? []).filter((log) => log.date.slice(0, 10) === today));
  const weekMinutes = totalMinutes(weekLogs.data ?? []);

  const breakdown = useMemo(() => byCategory(logs), [logs]);
  const monthTotal = totalMinutes(logs);

  const days = useMemo<Day[]>(() => {
    const byDay = new Map<string, TimeLog[]>();
    for (const log of logs) {
      const key = log.date.slice(0, 10);
      const list = byDay.get(key);
      if (list) list.push(log);
      else byDay.set(key, [log]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, items]) => ({ day, items }));
  }, [logs]);

  const listHeader = (
    <View style={{ gap: layout.sectionGap, paddingBottom: spacing.md }}>
      <CategoryHeader module="time" />

      {weekLogs.isPending ? (
        <SkeletonCard lines={1} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <StatCard label="Tracked today" value={formatMinutes(todayMinutes)} icon="today-outline" accent="time" />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <StatCard label="Last 7 days" value={formatMinutes(weekMinutes)} icon="calendar-outline" accent="time" />
          </View>
        </View>
      )}

      <TimerCard />

      <MonthSwitcher month={month} onChange={setMonth} accent="time" />

      {breakdown.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title="Time distribution" subtitle={`${formatMinutes(monthTotal)} logged in ${monthLabel(month)}`} />
          {breakdown.map((item) => {
            const percent = monthTotal > 0 ? (item.minutes / monthTotal) * 100 : 0;
            return (
              <View key={item.category} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                    {item.category}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary">
                    {formatMinutes(item.minutes)} ({Math.round(percent)}%)
                  </Text>
                </View>
                <ProgressBar percent={percent} color={categoryColor(item.category)} />
              </View>
            );
          })}
        </Card>
      ) : null}
    </View>
  );

  return (
    <CategoryFrame>
      <FlatList<Day>
        data={days}
        keyExtractor={(d) => d.day}
        renderItem={({ item, index }) => <DayCard day={item.day} items={item.items} index={index} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          monthLogs.isPending ? (
            <SkeletonList count={4} trailing />
          ) : monthLogs.isError ? (
            <ErrorState error={monthLogs.error} title="Couldn't load time logs" onRetry={() => monthLogs.refetch()} retrying={monthLogs.isRefetching} />
          ) : (
            <EmptyState
              accent="time"
              icon="time-outline"
              title={`No time logged in ${monthLabel(month)}`}
              description="Start the stopwatch above, or add the hours you spent on an activity."
              actionTitle="Add time log"
              onAction={() => openTimeLog(router)}
            />
          )
        }
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[padding, { gap: spacing.md, paddingBottom: FAB_CLEARANCE }]}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
      <CategoryFab module="time" label="Add time log" onPress={() => openTimeLog(router)} />
    </CategoryFrame>
  );
}

const DayCard = memo(function DayCard({ day, items, index }: { day: string; items: TimeLog[]; index: number }) {
  const entering = useEntering(index);
  return (
    <Animated.View entering={entering}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Text variant="label" weight="semiBold" accessibilityRole="header" style={{ flex: 1 }}>
            {weekdayShort(day)}, {formatDay(day)}
          </Text>
          <Tag label={formatMinutes(totalMinutes(items))} icon="time-outline" accent="time" />
        </View>
        {items.map((log, i) => (
          <LogRow key={log.id} log={log} divider={i < items.length - 1} />
        ))}
      </Card>
    </Animated.View>
  );
});

function LogRow({ log, divider }: { log: TimeLog; divider: boolean }) {
  const router = useRouter();
  const color = categoryColor(log.category);
  const duration = formatMinutes(log.duration);
  return (
    <ListItem
      leading={
        <View
          style={{
            width: layout.minTouchTarget - spacing.xs,
            height: layout.minTouchTarget - spacing.xs,
            borderRadius: radius.md,
            backgroundColor: withAlpha(color, 0.16),
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="time-outline" size={22} color={color} />
        </View>
      }
      title={log.activity}
      subtitle={[log.category, log.description].filter(Boolean).join(' · ') || undefined}
      meta={
        <Text variant="label" weight="bold" numeric numberOfLines={1}>
          {duration}
        </Text>
      }
      divider={divider}
      chevron={false}
      onPress={() => openTimeLog(router, log)}
      accessibilityLabel={`${log.activity}, ${duration}${log.category ? `, ${log.category}` : ''}`}
      accessibilityHint="Opens this time log"
    />
  );
}

function TimerCard() {
  const notify = useNotify();
  const { timer, loaded, start, clear } = useRunningTimer();
  const save = useSaveTimeLog();
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const now = useNow(!!timer);

  if (!loaded) return <SkeletonCard lines={2} />;

  const activityError = submitted && !activity.trim() ? 'What are you working on?' : null;

  function begin() {
    setSubmitted(true);
    if (!activity.trim()) {
      haptics.warning();
      return;
    }
    start(activity.trim(), category);
    haptics.success();
    setActivity('');
    setSubmitted(false);
  }

  async function stop() {
    if (!timer) return;
    const endedAt = Date.now();
    const minutes = Math.max(1, Math.round((endedAt - timer.startedAt) / 60000));
    try {
      await save.mutateAsync({
        input: {
          date: toIsoDay(new Date(timer.startedAt)),
          activity: timer.activity,
          category: timer.category ?? undefined,
          duration: minutes,
          startTime: new Date(timer.startedAt).toISOString(),
          endTime: new Date(endedAt).toISOString(),
        },
      });
      clear();
      notify.success(`Saved ${formatMinutes(minutes)} for ${timer.activity}`);
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not save. The timer is still running, try again.');
    }
  }

  async function discard() {
    const ok = await notify.confirm({
      title: 'Discard this timer?',
      message: 'The time will not be saved.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (!ok) return;
    clear();
    notify.info('Timer discarded');
  }

  if (timer) {
    const seconds = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
    const activeColor = categoryColor(timer.category);
    const clock = formatClock(seconds);
    return (
      <Card variant="tinted" accent="time" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="radio-button-on" size={16} color={activeColor} accessibilityElementsHidden importantForAccessibility="no" />
          <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {timer.activity}
          </Text>
          {timer.category ? <Tag label={timer.category} color={activeColor} /> : null}
        </View>

        <Text variant="display" numeric accessibilityRole="timer" accessibilityLabel={`Elapsed time ${clock}`} style={{ textAlign: 'center' }}>
          {clock}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button title="Stop and save" leftIcon="stop" onPress={stop} loading={save.isPending} style={{ flex: 1, minWidth: 150 }} />
          <Button title="Discard" variant="tertiary" leftIcon="trash-outline" onPress={discard} disabled={save.isPending} style={{ flex: 1, minWidth: 120 }} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title="Live stopwatch" subtitle="Track an activity as you do it." />
      <Input
        label="What are you working on?"
        value={activity}
        onChangeText={setActivity}
        placeholder="e.g. Deep work, workout, coding"
        autoCapitalize="sentences"
        returnKeyType="go"
        error={activityError}
        onSubmitEditing={begin}
      />
      <ChipGroup>
        {TIME_CATEGORIES.map((name) => (
          <Chip key={name} label={name} selected={category === name} color={categoryColor(name)} onPress={() => setCategory(category === name ? null : name)} />
        ))}
      </ChipGroup>
      <Button title="Start timer" leftIcon="play" onPress={begin} />
    </Card>
  );
}
