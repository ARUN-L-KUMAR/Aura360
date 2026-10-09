import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteGoal, useSaveGoal } from '@/features/finance/hooks';
import { GOAL_CATEGORIES, GOAL_COLORS, type Goal } from '@/features/finance/types';
import { ApiError } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

function parseGoal(raw?: string): Goal | null {
  try {
    return raw ? (JSON.parse(raw) as Goal) : null;
  } catch {
    return null;
  }
}

export default function GoalScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ goal?: string }>();
  const existing = useMemo(() => parseGoal(params.goal), [params.goal]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [target, setTarget] = useState(existing ? String(existing.targetAmount) : '');
  const [saved, setSaved] = useState(existing ? String(existing.currentAmount) : '');
  const [category, setCategory] = useState(existing?.category ?? 'Savings');
  const [color, setColor] = useState(existing?.color ?? GOAL_COLORS[0]);
  const [targetDate, setTargetDate] = useState(existing?.targetDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useSaveGoal();
  const remove = useDeleteGoal();

  const targetVal = Number.parseFloat(target.replace(/,/g, '')) || 0;
  const savedVal = Number.parseFloat(saved.replace(/,/g, '')) || 0;
  const progressPercent = targetVal > 0 ? Math.min(100, Math.round((savedVal / targetVal) * 100)) : 0;

  async function submit() {
    const targetValue = Number.parseFloat(target.replace(/,/g, ''));
    const savedValue = saved.trim() ? Number.parseFloat(saved.replace(/,/g, '')) : 0;
    if (!title.trim()) return setError('Give your goal a name.');
    if (!Number.isFinite(targetValue) || targetValue <= 0) return setError('Enter a target amount greater than 0.');
    if (!Number.isFinite(savedValue) || savedValue < 0) return setError('Saved amount cannot be negative.');

    setError(null);
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          title: title.trim(),
          targetAmount: targetValue,
          currentAmount: savedValue,
          targetDate: targetDate || null,
          category,
          color,
          notes: notes.trim() || null,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete goal?', `"${existing.title}" will be removed.`, [
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
      <Stack.Screen options={{ title: existing ? 'Edit goal' : 'New goal' }} />

      {/* Goal Preview Card */}
      <GlassCard
        glowColor={color}
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <Text variant="label" style={{ fontWeight: '700', color }}>
              {category.toUpperCase()}
            </Text>
          </View>
          <Text variant="caption" style={{ fontWeight: '700', color }}>
            {progressPercent}%
          </Text>
        </View>

        <Text variant="heading" numberOfLines={1}>
          {title.trim() || 'Goal title'}
        </Text>

        <ProgressBar percent={progressPercent} color={color} height={6} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" muted>
            Saved: {formatMoney(savedVal)}
          </Text>
          <Text variant="caption" muted>
            Target: {formatMoney(targetVal)}
          </Text>
        </View>
      </GlassCard>

      {/* Basic Inputs */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Input
          label="Goal Name"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Dream Vacation, Mac Mini M4"
          autoFocus={!existing}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label={`Target (${CURRENCY_SYMBOL})`}
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={`Saved so far (${CURRENCY_SYMBOL})`}
              value={saved}
              onChangeText={setSaved}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
        </View>
      </GlassCard>

      {/* Category Selection */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="pricetags-outline" size={16} color={colors.textMuted} />
          <Text variant="label" muted>
            Category
          </Text>
        </View>
        <ChipGroup>
          {GOAL_CATEGORIES.map((name) => (
            <Chip
              key={name}
              label={name}
              selected={category === name}
              color={color}
              onPress={() => setCategory(name)}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {/* Color Picker */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />
          <Text variant="label" muted>
            Accent Colour
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          {GOAL_COLORS.map((value) => {
            const isSelected = color === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${value}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setColor(value)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: value,
                  borderWidth: isSelected ? 3 : 1,
                  borderColor: isSelected ? colors.text : 'rgba(255,255,255,0.2)',
                  transform: [{ scale: pressed ? 0.92 : isSelected ? 1.1 : 1 }],
                  alignItems: 'center',
                  justifyContent: 'center',
                })}>
                {isSelected ? <Ionicons name="checkmark" size={18} color="#ffffff" /> : null}
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* Target Date & Notes */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <DateField
          label="Target date (optional)"
          value={targetDate}
          onChange={setTargetDate}
          clearable
          placeholder="No deadline set"
          minimumDate={new Date()}
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Why are you saving for this?"
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

      <Button title={existing ? 'Save changes' : 'Create goal'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete goal" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
