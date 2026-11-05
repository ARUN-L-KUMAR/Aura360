import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { failureMessage } from '@/components/finance/failure-message';
import { ActionSheet, type SheetAction } from '@/components/notes/action-sheet';
import { useUndoableRemove } from '@/components/notes/use-undoable-remove';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Button } from '@/components/ui/button';
import { Card, withAlpha } from '@/components/ui/card';
import { CategoryFab, CategoryFrame, CategoryHeader } from '@/components/ui/category-template';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { PremiumHero } from '@/components/ui/premium-hero';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { MetricCard, MetricCell, MetricGrid } from '@/components/ui/section-kit';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { DonutChart } from '@/components/viz/donut-chart';
import { useDeleteTimeLog, useRunningTimer, useSaveTimeLog, useTimeLogs } from '@/features/time/hooks';
import { TIME_CATEGORIES, UNCATEGORISED, byCategory, categoryColor, formatClock, formatMinutes, timeCategoryLabel, totalMinutes, type TimeLog } from '@/features/time/types';
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

export function openTimeLog(router: ReturnType<typeof useRouter>, log?: TimeLog) {
  router.push({ pathname: '/time/log', params: log ? { log: JSON.stringify(log) } : {} });
}

type Day = { day: string; items: TimeLog[] };

const keyExtractor = (d: Day) => d.day;

export default function TimeScreen() {
  const router = useRouter();
  const { t } = useTranslation('time');
  const padding = useScreenPadding();
  const notify = useNotify();
  const [month, setMonth] = useState(monthKey());
  // Tapping a category in the distribution narrows the list below to it; tapping again shows everything.
  const [selected, setSelected] = useState<string | null>(null);
  const [menuLog, setMenuLog] = useState<TimeLog | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mutateAsync: deleteLog } = useDeleteTimeLog();
  const { hiddenIds, remove } = useUndoableRemove({
    commit: (id) => deleteLog(id),
    message: t('toast.deleted'),
    undoLabel: t('toast.undo'),
    onError: (e) => notify.error(failureMessage(e, t('errors.delete'))),
  });

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

  const logs = useMemo(() => (monthLogs.data ?? []).filter((log) => !hiddenIds.has(log.id)), [monthLogs.data, hiddenIds]);
  const todayMinutes = totalMinutes((weekLogs.data ?? []).filter((log) => log.date.slice(0, 10) === today));
  const weekMinutes = totalMinutes(weekLogs.data ?? []);
  // The 1-10 focus score people give an entry: average over the week's entries that have one.
  const scored = (weekLogs.data ?? []).filter((log) => typeof log.productivityScore === 'number');
  const focusAverage = scored.length > 0 ? scored.reduce((sum, log) => sum + (log.productivityScore ?? 0), 0) / scored.length : null;

  const breakdown = useMemo(() => byCategory(logs), [logs]);
  const monthTotal = totalMinutes(logs);

  const days = useMemo<Day[]>(() => {
    const byDay = new Map<string, TimeLog[]>();
    for (const log of logs) {
      if (selected !== null && (log.category?.trim() || UNCATEGORISED) !== selected) continue;
      const key = log.date.slice(0, 10);
      const list = byDay.get(key);
      if (list) list.push(log);
      else byDay.set(key, [log]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, items]) => ({ day, items }));
  }, [logs, selected]);

  const menuActions = useMemo<SheetAction[]>(() => {
    if (!menuLog) return [];
    return [
      { key: 'edit', label: t('action.edit'), icon: 'create-outline', onPress: () => openTimeLog(router, menuLog) },
      { key: 'delete', label: t('action.delete'), icon: 'trash-outline', destructive: true, onPress: () => remove(menuLog.id) },
    ];
  }, [menuLog, t, router, remove]);

  const openMenu = (log: TimeLog) => {
    haptics.impact();
    setMenuLog(log);
    setMenuOpen(true);
  };

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
        <MetricGrid>
          <MetricCell>
            <MetricCard label={t('stats.today')} value={todayMinutes} accent="time" icon="today-outline" format={(n) => formatMinutes(Math.round(n))} />
          </MetricCell>
          <MetricCell>
            <MetricCard label={t('stats.week')} value={weekMinutes} accent="time" icon="calendar-outline" format={(n) => formatMinutes(Math.round(n))} caption={focusAverage === null ? t('stats.weekAverage', { duration: formatMinutes(Math.round(weekMinutes / 7)) }) : t('stats.weekWithFocus', { duration: formatMinutes(Math.round(weekMinutes / 7)), value: (Math.round(focusAverage * 10) / 10).toFixed(1) })} />
          </MetricCell>
        </MetricGrid>
      )}

      <TimerCard />

      <MonthSwitcher month={month} onChange={setMonth} accent="time" />

      {breakdown.length > 0 ? (
        <Card style={{ gap: spacing.lg }}>
          <SectionHeader title={t('distribution.title')} subtitle={t('distribution.subtitle', { total: formatMinutes(monthTotal), month: monthLabel(month) })} />
          <View style={{ alignItems: 'center' }}>
            <DonutChart
              segments={breakdown.map((item) => ({ label: timeCategoryLabel(item.category), value: item.minutes, color: categoryColor(item.category) }))}
              selectedIndex={selected === null ? null : breakdown.findIndex((item) => item.category === selected)}
              accent="time"
              label={t('distribution.title')}>
              <Text variant="title" weight="bold" numeric>
                {formatMinutes(selected === null ? monthTotal : (breakdown.find((item) => item.category === selected)?.minutes ?? 0))}
              </Text>
              <Text variant="overline" color="textMuted" numberOfLines={1}>
                {selected === null ? t('distribution.logged') : timeCategoryLabel(selected)}
              </Text>
            </DonutChart>
          </View>
          <View>
            {breakdown.map((item) => {
              const percent = monthTotal > 0 ? (item.minutes / monthTotal) * 100 : 0;
              const name = timeCategoryLabel(item.category);
              const summary = t('distribution.row', { duration: formatMinutes(item.minutes), percent: Math.round(percent) });
              const on = selected === item.category;
              return (
                <PressableScale
                  key={item.category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${name}, ${summary}`}
                  accessibilityHint={on ? t('distribution.clearHint') : t('distribution.filterHint')}
                  scaleTo={1}
                  ringRadius={radius.md}
                  onPress={() => {
                    haptics.select();
                    setSelected(on ? null : item.category);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: layout.minTouchTarget, opacity: selected === null || on ? 1 : 0.5 }}>
                  <View style={{ width: spacing.md, height: spacing.md, borderRadius: radius.pill, backgroundColor: categoryColor(item.category) }} />
                  <Text variant="body" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                    {name}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary">
                    {summary}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {selected !== null ? (
            <Button title={t('distribution.clear', { category: timeCategoryLabel(selected) })} variant="tertiary" size="sm" leftIcon="close" onPress={() => setSelected(null)} />
          ) : null}
        </Card>
      ) : null}
    </View>
  );

  return (
    <CategoryFrame>
      <FlatList<Day>
        data={days}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => <DayCard day={item.day} items={item.items} index={index} onMenu={openMenu} />}
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
        style={{ flex: 1 }}
      />
      <CategoryFab module="time" label={t('actions.addLog')} onPress={() => openTimeLog(router)} />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={menuLog?.activity} actions={menuActions} />
    </CategoryFrame>
  );
}

const DayCard = memo(function DayCard({ day, items, index, onMenu }: { day: string; items: TimeLog[]; index: number; onMenu: (log: TimeLog) => void }) {
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
          <LogRow key={log.id} log={log} divider={i < items.length - 1} onMenu={onMenu} />
        ))}
      </Card>
    </Animated.View>
  );
});

const LogRow = memo(function LogRow({ log, divider, onMenu }: { log: TimeLog; divider: boolean; onMenu: (log: TimeLog) => void }) {
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
      subtitle={[category, typeof log.productivityScore === 'number' ? t('log.focus', { score: log.productivityScore }) : null, log.description].filter(Boolean).join(' · ') || undefined}
      meta={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="label" weight="bold" numeric numberOfLines={1}>
            {duration}
          </Text>
          <IconButton size="sm" icon="ellipsis-horizontal" accessibilityLabel={t('log.moreOptions', { activity: log.activity })} onPress={() => onMenu(log)} />
        </View>
      }
      divider={divider}
      chevron={false}
      onPress={() => openTimeLog(router, log)}
      onLongPress={() => onMenu(log)}
      accessibilityLabel={category ? t('log.labelCategory', { activity: log.activity, duration, category }) : t('log.label', { activity: log.activity, duration })}
      accessibilityHint={t('log.hint')}
    />
  );
});

function TimerCard() {
  const notify = useNotify();
  const { colors } = useTheme();
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
    const clock = formatClock(seconds);
    return (
      <PremiumHero accent="time"
        chip={{ icon: 'radio-button-on', label: timer.category ? `${t('timer.running')} · ${timeCategoryLabel(timer.category)}` : t('timer.running') }}
        title={timer.activity}
        actions={[
          { label: t('timer.stop'), icon: 'stop', variant: 'solid', onPress: () => void stop() },
          { label: t('timer.discard'), icon: 'trash-outline', variant: 'glass', onPress: () => void discard() },
        ]}>
        <Text variant="display" numeric accessibilityRole="timer" accessibilityLabel={t('timer.elapsed', { clock })} style={{ color: colors.onHero }}>
          {clock}
        </Text>
      </PremiumHero>
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
