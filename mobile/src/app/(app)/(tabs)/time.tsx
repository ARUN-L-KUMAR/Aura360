import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { failureMessage } from '@/components/finance/failure-message';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Button } from '@/components/ui/button';
import { Card, withAlpha } from '@/components/ui/card';
import { CategoryFab, CategoryFrame, CategoryHeader } from '@/components/ui/category-template';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import { useRunningTimer, useSaveTimeLog, useTimeLogs } from '@/features/time/hooks';
import { TIME_CATEGORIES, byCategory, categoryColor, formatMinutes, timeCategoryLabel, totalMinutes, type TimeLog } from '@/features/time/types';
import { useTranslation } from '@/i18n';
import { formatDay, monthKey, monthLabel, weekdayShort } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
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

const keyExtractor = (d: Day) => d.day;

export default function TimeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('time');
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

  const monthOffline = monthLogs.isPending && monthLogs.fetchStatus === 'paused';
  const monthLoading = monthLogs.isPending && !monthOffline;
  // Cached logs are showing but the latest refresh failed.
  const staleError = monthLogs.isError && monthLogs.data !== undefined ? monthLogs.error : weekLogs.isError && weekLogs.data !== undefined ? weekLogs.error : null;

  const listHeader = (
    <View style={{ gap: layout.sectionGap, paddingBottom: spacing.md }}>
      <CategoryHeader module="time" />

      {staleError ? <RefreshError error={staleError} onRetry={() => void Promise.all([monthLogs.refetch(), weekLogs.refetch()])} retrying={monthLogs.isRefetching || weekLogs.isRefetching} /> : null}

      {weekLogs.isPending ? (
        <SkeletonCard lines={1} />
      ) : weekLogs.isError && !weekLogs.data ? (
        <LoadError size="inline" error={weekLogs.error} title={t('errors.loadTotals')} onRetry={() => void weekLogs.refetch()} retrying={weekLogs.isRefetching} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <StatCard label={t('stats.today')} value={formatMinutes(todayMinutes)} icon="today-outline" accent="time" />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <StatCard label={t('stats.week')} value={formatMinutes(weekMinutes)} icon="calendar-outline" accent="time" />
          </View>
        </View>
      )}

      <TimerCard />

      <MonthSwitcher month={month} onChange={setMonth} accent="time" />

      {breakdown.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('distribution.title')} subtitle={t('distribution.subtitle', { total: formatMinutes(monthTotal), month: monthLabel(month) })} />
          {breakdown.map((item) => {
            const percent = monthTotal > 0 ? (item.minutes / monthTotal) * 100 : 0;
            const name = timeCategoryLabel(item.category);
            const summary = t('distribution.row', { duration: formatMinutes(item.minutes), percent: Math.round(percent) });
            return (
              <View key={item.category} accessible accessibilityLabel={`${name}, ${summary}`} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                    {name}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary">
                    {summary}
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
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => <DayCard day={item.day} items={item.items} index={index} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          monthLoading ? (
            <SkeletonList count={4} trailing />
          ) : monthOffline ? (
            <OfflineState description={t('offline')} onRetry={() => void monthLogs.refetch()} />
          ) : monthLogs.isError ? (
            <LoadError error={monthLogs.error} title={t('errors.loadLogs')} onRetry={() => void monthLogs.refetch()} retrying={monthLogs.isRefetching} />
          ) : (
            <EmptyState
              accent="time"
              icon="time-outline"
              title={t('empty.title', { month: monthLabel(month) })}
              description={t('empty.body')}
              actionTitle={t('actions.addLog')}
              onAction={() => openTimeLog(router)}
            />
          )
        }
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        windowSize={7}
        contentContainerStyle={[padding, { gap: spacing.md, paddingBottom: FAB_CLEARANCE }]}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
      <CategoryFab module="time" label={t('actions.addLog')} onPress={() => openTimeLog(router)} />
    </CategoryFrame>
  );
}

const DayCard = memo(function DayCard({ day, items, index }: { day: string; items: TimeLog[]; index: number }) {
  const motion = useListMotion(index);
  const { t } = useTranslation('time');
  return (
    <Animated.View {...motion}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Text variant="label" weight="semiBold" accessibilityRole="header" style={{ flex: 1 }}>
            {t('day.heading', { weekday: weekdayShort(day), date: formatDay(day) })}
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

const LogRow = memo(function LogRow({ log, divider }: { log: TimeLog; divider: boolean }) {
  const router = useRouter();
  const { t } = useTranslation('time');
  const color = categoryColor(log.category);
  const duration = formatMinutes(log.duration);
  const category = log.category ? timeCategoryLabel(log.category) : null;
  return (
    <ListItem
      leading={
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
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
      subtitle={[category, log.description].filter(Boolean).join(' · ') || undefined}
      meta={
        <Text variant="label" weight="bold" numeric numberOfLines={1}>
          {duration}
        </Text>
      }
      divider={divider}
      chevron={false}
      onPress={() => openTimeLog(router, log)}
      accessibilityLabel={category ? t('log.labelCategory', { activity: log.activity, duration, category }) : t('log.label', { activity: log.activity, duration })}
      accessibilityHint={t('log.hint')}
    />
  );
});

function TimerCard() {
  const notify = useNotify();
  const { t } = useTranslation('time');
  const { timer, loaded, start, clear } = useRunningTimer();
  const save = useSaveTimeLog();
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const now = useNow(!!timer);

  if (!loaded) return <SkeletonCard lines={2} />;

  const activityError = submitted && !activity.trim() ? t('timer.activityNeeded') : null;

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
      analytics.track('time_logged');
      notify.success(t('timer.saved', { duration: formatMinutes(minutes), activity: timer.activity }));
    } catch (e) {
      notify.error(failureMessage(e, t('errors.stop')));
    }
  }

  async function discard() {
    const ok = await notify.confirm({
      title: t('timer.discardTitle'),
      message: t('timer.discardMessage'),
      confirmLabel: t('timer.discard'),
      cancelLabel: t('timer.keep'),
      destructive: true,
    });
    if (!ok) return;
    clear();
    notify.info(t('timer.discarded'));
  }

  if (timer) {
    const seconds = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
    const activeColor = categoryColor(timer.category);
    const clock = formatClock(seconds);
    return (
      <Card variant="tinted" accent="time" gradient="time" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="radio-button-on" size={16} color={activeColor} accessibilityElementsHidden importantForAccessibility="no" />
          <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {timer.activity}
          </Text>
          {timer.category ? <Tag label={timeCategoryLabel(timer.category)} color={activeColor} /> : null}
        </View>

        <Text variant="display" numeric accessibilityRole="timer" accessibilityLabel={t('timer.elapsed', { clock })} style={{ textAlign: 'center' }}>
          {clock}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button title={t('timer.stop')} leftIcon="stop" onPress={stop} loading={save.isPending} style={{ flex: 1, minWidth: 150 }} />
          <Button title={t('timer.discard')} variant="tertiary" leftIcon="trash-outline" onPress={discard} disabled={save.isPending} style={{ flex: 1, minWidth: 120 }} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title={t('timer.stopwatch')} subtitle={t('timer.stopwatchHint')} />
      <Input
        label={t('timer.activityLabel')}
        value={activity}
        onChangeText={setActivity}
        placeholder={t('timer.activityPlaceholder')}
        autoCapitalize="sentences"
        returnKeyType="go"
        error={activityError}
        onSubmitEditing={begin}
      />
      <ChipGroup>
        {TIME_CATEGORIES.map((name) => (
          <Chip key={name} label={timeCategoryLabel(name)} selected={category === name} color={categoryColor(name)} onPress={() => setCategory(category === name ? null : name)} />
        ))}
      </ChipGroup>
      <Button title={t('timer.start')} leftIcon="play" onPress={begin} />
    </Card>
  );
}
