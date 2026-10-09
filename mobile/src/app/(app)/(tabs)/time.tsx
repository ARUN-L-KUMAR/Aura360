import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useRunningTimer, useSaveTimeLog, useTimeLogs } from '@/features/time/hooks';
import { TIME_CATEGORIES, byCategory, categoryColor, formatMinutes, totalMinutes, type TimeLog } from '@/features/time/types';
import { ApiError } from '@/lib/api';
import { formatDay, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { useNow } from '@/lib/use-now';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

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

export default function TimeScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const [month, setMonth] = useState(monthKey());
  const isCurrent = month === monthKey();

  const monthLogs = useTimeLogs(`${month}-01`, lastDayOf(month));
  const today = toIsoDay(new Date());
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toIsoDay(d);
  }, []);
  const weekLogs = useTimeLogs(weekStart, today);

  const logs = useMemo(() => monthLogs.data ?? [], [monthLogs.data]);
  const todayMinutes = totalMinutes((weekLogs.data ?? []).filter((log) => log.date.slice(0, 10) === today));
  const weekMinutes = totalMinutes(weekLogs.data ?? []);

  const breakdown = useMemo(() => byCategory(logs), [logs]);
  const monthTotal = totalMinutes(logs);

  const days = useMemo(() => {
    const byDay = new Map<string, TimeLog[]>();
    for (const log of logs) {
      const key = log.date.slice(0, 10);
      byDay.set(key, [...(byDay.get(key) ?? []), log]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [logs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen onRefresh={() => Promise.all([monthLogs.refetch(), weekLogs.refetch()])} refreshing={monthLogs.isRefetching || weekLogs.isRefetching}>
        <Text variant="title">Time</Text>

        {/* KPI Summary Cards */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <GlassCard style={{ flex: 1, gap: spacing.xs }} glowColor={moduleColors.time}>
            <Text variant="caption" muted style={{ fontWeight: '600' }}>
              Today Tracked
            </Text>
            <Text variant="display" style={{ fontSize: 26, lineHeight: 30, color: moduleColors.time }}>
              {formatMinutes(todayMinutes)}
            </Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="caption" muted style={{ fontWeight: '600' }}>
              Last 7 Days
            </Text>
            <Text variant="display" style={{ fontSize: 26, lineHeight: 30 }}>
              {formatMinutes(weekMinutes)}
            </Text>
          </GlassCard>
        </View>

        {/* Live Timer or Timer Starter */}
        <TimerCard />

        {/* Month Navigator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setMonth(shiftMonth(month, -1))}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.cardMuted : 'transparent',
            })}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="calendar-outline" size={16} color={moduleColors.time} />
            <Text variant="heading" style={{ fontSize: 16 }}>
              {monthLabel(month)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrent}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isCurrent ? 0.3 : 1,
              backgroundColor: pressed ? colors.cardMuted : 'transparent',
            })}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {monthLogs.isPending ? (
          <Card>
            <Text muted>Loading…</Text>
          </Card>
        ) : null}
        {monthLogs.isError ? (
          <Card>
            <Text muted>{monthLogs.error instanceof Error ? monthLogs.error.message : "Couldn't load time logs."}</Text>
          </Card>
        ) : null}

        {/* Category Breakdown */}
        {breakdown.length > 0 ? (
          <GlassCard style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="heading" style={{ fontSize: 16 }}>
                Time Distribution
              </Text>
              <Text variant="caption" muted style={{ fontWeight: '600' }}>
                {formatMinutes(monthTotal)} total
              </Text>
            </View>
            {breakdown.map((item) => (
              <View key={item.category} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label" style={{ fontWeight: '600' }}>
                    {item.category}
                  </Text>
                  <Text variant="caption" muted>
                    {formatMinutes(item.minutes)} ({Math.round((item.minutes / monthTotal) * 100)}%)
                  </Text>
                </View>
                <ProgressBar percent={(item.minutes / monthTotal) * 100} color={categoryColor(item.category)} />
              </View>
            ))}
          </GlassCard>
        ) : null}

        {!monthLogs.isPending && !monthLogs.isError && days.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title={`No Time Logged in ${monthLabel(month)}`}
            description="Start the live stopwatch above or manually log hours spent on activities."
          />
        ) : null}

        {/* History Days */}
        {days.map(([day, items]) => (
          <GlassCard key={day} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontWeight: '700' }}>
                {formatDay(day)}
              </Text>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  backgroundColor: `${moduleColors.time}20`,
                }}>
                <Text variant="caption" style={{ color: moduleColors.time, fontWeight: '700' }}>
                  {formatMinutes(totalMinutes(items))}
                </Text>
              </View>
            </View>
            {items.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </GlassCard>
        ))}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add time log"
        onPress={() => openTimeLog(router)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: moduleColors.time,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        })}>
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </View>
  );
}

function LogRow({ log }: { log: TimeLog }) {
  const router = useRouter();
  const color = categoryColor(log.category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${log.activity}, ${formatMinutes(log.duration)}`}
      onPress={() => openTimeLog(router, log)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="time-outline" size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '500' }}>
          {log.activity}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {[log.category, log.description].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={{ fontWeight: '700' }}>{formatMinutes(log.duration)}</Text>
    </Pressable>
  );
}

function TimerCard() {
  const { timer, loaded, start, clear } = useRunningTimer();
  const save = useSaveTimeLog();
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = useNow(!!timer);

  if (!loaded) return null;

  function begin() {
    if (!activity.trim()) return setError('What are you working on?');
    setError(null);
    start(activity.trim(), category);
    setActivity('');
  }

  async function stop() {
    if (!timer) return;
    const endedAt = Date.now();
    const minutes = Math.max(1, Math.round((endedAt - timer.startedAt) / 60000));
    setError(null);
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. The timer is still running, try again.');
    }
  }

  function discard() {
    Alert.alert('Discard this timer?', 'The time will not be saved.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: clear },
    ]);
  }

  if (timer) {
    const seconds = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
    const activeColor = categoryColor(timer.category);
    return (
      <GlassCard glowColor={activeColor} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: activeColor }} />
          <Text variant="heading" style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>
            {timer.activity}
          </Text>
          {timer.category ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: `${activeColor}20`,
              }}>
              <Text variant="caption" style={{ color: activeColor, fontWeight: '700' }}>
                {timer.category}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          variant="display"
          style={{
            fontSize: 44,
            lineHeight: 48,
            fontVariant: ['tabular-nums'],
            color: activeColor,
            textAlign: 'center',
            marginVertical: spacing.xs,
          }}>
          {formatClock(seconds)}
        </Text>

        {error ? <Text color="danger">{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Stop & Save" onPress={stop} loading={save.isPending} />
          </View>
          <Button title="Discard" variant="ghost" onPress={discard} />
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard glowColor={moduleColors.time} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons name="stopwatch-outline" size={18} color={moduleColors.time} />
        <Text variant="heading" style={{ fontSize: 16 }}>
          Live Stopwatch
        </Text>
      </View>
      <Input value={activity} onChangeText={setActivity} placeholder="e.g. Deep Work, Workout, Coding" returnKeyType="go" onSubmitEditing={begin} />
      <ChipGroup>
        {TIME_CATEGORIES.map((name) => (
          <Chip key={name} label={name} selected={category === name} color={categoryColor(name)} onPress={() => setCategory(category === name ? null : name)} />
        ))}
      </ChipGroup>
      {error ? <Text color="danger">{error}</Text> : null}
      <Button title="▶ Start Timer" onPress={begin} />
    </GlassCard>
  );
}
