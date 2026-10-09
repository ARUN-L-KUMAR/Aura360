import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteTimeLog, useSaveTimeLog } from '@/features/time/hooks';
import { DURATION_PRESETS, TIME_CATEGORIES, categoryColor, type TimeLog } from '@/features/time/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const CUSTOM = '__custom__';

function parseLog(raw?: string): TimeLog | null {
  try {
    return raw ? (JSON.parse(raw) as TimeLog) : null;
  } catch {
    return null;
  }
}

export default function TimeLogScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ log?: string }>();
  const existing = useMemo(() => parseLog(params.log), [params.log]);

  const knownCategory = !existing?.category || TIME_CATEGORIES.includes(existing.category);

  const [activity, setActivity] = useState(existing?.activity ?? '');
  const [category, setCategory] = useState(existing?.category ? (knownCategory ? existing.category : CUSTOM) : '');
  const [customCategory, setCustomCategory] = useState(existing?.category && !knownCategory ? existing.category : '');
  const [duration, setDuration] = useState(existing ? String(existing.duration) : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [score, setScore] = useState<number | null>(existing?.productivityScore ?? null);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useSaveTimeLog();
  const remove = useDeleteTimeLog();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;

  async function submit() {
    const minutes = Number.parseInt(duration, 10);
    if (!activity.trim()) return setError('What did you do?');
    if (!Number.isFinite(minutes) || minutes <= 0) return setError('Enter how many minutes it took.');

    setError(null);
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          date,
          activity: activity.trim(),
          category: finalCategory || undefined,
          duration: minutes,
          description: description.trim() || undefined,
          productivityScore: score ?? undefined,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this time log?', existing.activity, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(existing.id);
            router.back();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit time log' : 'Add time log' }} />

      {/* Activity Card */}
      <GlassCard
        glowColor={moduleColors.time}
        style={{
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="Activity Name"
          value={activity}
          onChangeText={setActivity}
          placeholder="e.g. Deep Work, Learning Rust, Client Call"
          autoFocus={!existing}
          style={{ fontSize: 18, fontWeight: '600' }}
        />

        <View style={{ gap: spacing.xs }}>
          <Text variant="label" muted>
            Category
          </Text>
          <ChipGroup>
            {TIME_CATEGORIES.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={category === name}
                color={categoryColor(name)}
                onPress={() => setCategory(category === name ? '' : name)}
              />
            ))}
            <Chip
              label="Custom…"
              selected={category === CUSTOM}
              color={moduleColors.time}
              onPress={() => setCategory(CUSTOM)}
            />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input value={customCategory} onChangeText={setCustomCategory} placeholder="Category name" />
          ) : null}
        </View>
      </GlassCard>

      {/* Duration Card with Presets */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="timer-outline" size={16} color={moduleColors.time} />
          <Text variant="label" muted>
            Duration
          </Text>
        </View>
        <Input
          label="Minutes"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="60"
          style={{ fontSize: 24, fontWeight: '700' }}
        />
        <ChipGroup>
          {DURATION_PRESETS.map((minutes) => (
            <Chip
              key={minutes}
              label={minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
              selected={duration === String(minutes)}
              color={moduleColors.time}
              onPress={() => setDuration(String(minutes))}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {/* Productivity Score */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="sparkles-outline" size={16} color={colors.warning} />
          <Text variant="label" muted>
            Productivity Rating (1 - 10)
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
            const isSelected = score === value;
            const scoreColor = value <= 4 ? colors.danger : value <= 7 ? colors.warning : colors.success;
            return (
              <Pressable
                key={value}
                onPress={() => setScore(isSelected ? null : value)}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  backgroundColor: isSelected ? scoreColor : isDark ? 'rgba(34, 48, 65, 0.6)' : colors.cardMuted,
                  borderWidth: 1,
                  borderColor: isSelected ? scoreColor : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 13,
                    color: isSelected ? '#ffffff' : colors.text,
                  }}>
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* Date & Description */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />
        <Input
          label="Notes (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What did you achieve, blockers encountered…"
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button title={existing ? 'Save changes' : 'Add time log'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete time log" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
