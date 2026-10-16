import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { FormCard, cleanAmount, failureMessage, parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Card, readableOn } from '@/components/ui/card';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteGoal, useSaveGoal } from '@/features/finance/hooks';
import { GOAL_CATEGORIES, GOAL_COLORS, type Goal } from '@/features/finance/types';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { layout, neutral, radius, spacing, tabularNums, useTheme } from '@/theme';

/** Spoken names for the swatches in GOAL_COLORS, in the same order. */
const COLOR_NAMES = ['Indigo', 'Green', 'Purple', 'Amber', 'Red', 'Pink', 'Teal'];

function parseGoal(raw?: string): Goal | null {
  try {
    return raw ? (JSON.parse(raw) as Goal) : null;
  } catch {
    return null;
  }
}

export default function GoalScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ goal?: string }>();
  const existing = useMemo(() => parseGoal(params.goal), [params.goal]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [target, setTarget] = useState(existing ? String(existing.targetAmount) : '');
  const [saved, setSaved] = useState(existing ? String(existing.currentAmount) : '');
  const [category, setCategory] = useState(existing?.category ?? 'Savings');
  const [color, setColor] = useState(existing?.color ?? GOAL_COLORS[0]);
  const [targetDate, setTargetDate] = useState(existing?.targetDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const targetRef = useRef<TextInput>(null);
  const savedRef = useRef<TextInput>(null);
  const save = useSaveGoal();
  const remove = useDeleteGoal();

  const targetValue = parseAmount(target);
  const savedValue = saved.trim() ? parseAmount(saved) : 0;
  const targetVal = Number.isFinite(targetValue) ? targetValue : 0;
  const savedVal = Number.isFinite(savedValue) ? savedValue : 0;
  const progressPercent = targetVal > 0 ? Math.min(100, Math.round((savedVal / targetVal) * 100)) : 0;

  const titleError = title.trim() ? null : 'Give your goal a name.';
  const targetError = !Number.isFinite(targetValue) || targetValue <= 0 ? 'Enter a target amount greater than 0.' : null;
  const savedError = !Number.isFinite(savedValue) ? 'Enter a valid amount.' : savedValue < 0 ? 'Saved amount cannot be negative.' : null;

  async function submit() {
    setSubmitted(true);
    if (titleError || targetError || savedError) {
      haptics.warning();
      return;
    }

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
      notify.success(existing ? 'Goal updated' : 'Goal created');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: 'Delete goal?',
      message: `"${existing.title}" will be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success('Goal deleted');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not delete. Try again.'));
    }
  }

  const symbol = (
    <Text variant="body" color="textSecondary">
      {CURRENCY_SYMBOL}
    </Text>
  );

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit goal' : 'New goal' }} />

      {/* Live preview of the goal card */}
      <Card tintColor={color} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Tag label={category} color={color} tone="accent" />
          <Text variant="title" numeric>
            {progressPercent}%
          </Text>
        </View>
        <Text variant="title" numberOfLines={1}>
          {title.trim() || 'Goal name'}
        </Text>
        <ProgressBar percent={progressPercent} color={color} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="caption" numeric color="textSecondary">
            Saved: {formatMoney(savedVal)}
          </Text>
          <Text variant="caption" numeric color="textSecondary">
            Target: {formatMoney(targetVal)}
          </Text>
        </View>
      </Card>

      <FormCard>
        <Input
          label="Goal name"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Trip to Japan"
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={submitted ? titleError : null}
          onSubmitEditing={() => targetRef.current?.focus()}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Input
              ref={targetRef}
              label="Target"
              value={target}
              onChangeText={(text) => setTarget(cleanAmount(text))}
              leftAdornment={symbol}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              returnKeyType="next"
              style={{ fontVariant: tabularNums }}
              error={submitted ? targetError : null}
              onSubmitEditing={() => savedRef.current?.focus()}
            />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Input
              ref={savedRef}
              label="Saved so far"
              value={saved}
              onChangeText={(text) => setSaved(cleanAmount(text))}
              leftAdornment={symbol}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              returnKeyType="done"
              style={{ fontVariant: tabularNums }}
              error={submitted ? savedError : null}
            />
          </View>
        </View>
      </FormCard>

      <FormCard title="Category" icon="pricetags-outline">
        <ChipGroup>
          {GOAL_CATEGORIES.map((name) => (
            <Chip key={name} label={name} accent="finance" selected={category === name} onPress={() => setCategory(name)} />
          ))}
        </ChipGroup>
      </FormCard>

      <FormCard title="Goal colour" icon="color-palette-outline">
        <View accessibilityRole="radiogroup" accessibilityLabel="Goal colour" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {GOAL_COLORS.map((value, i) => {
            const isSelected = color === value;
            return (
              <PressableScale
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={COLOR_NAMES[i] ?? `Colour ${i + 1}`}
                accessibilityState={{ checked: isSelected }}
                haptic="select"
                onPress={() => setColor(value)}
                ringRadius={radius.pill}
                style={{
                  width: layout.minTouchTarget,
                  height: layout.minTouchTarget,
                  borderRadius: radius.pill,
                  backgroundColor: value,
                  borderWidth: isSelected ? 3 : 1,
                  borderColor: isSelected ? colors.text : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {isSelected ? <Ionicons name="checkmark" size={22} color={readableOn(value, neutral[50])} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </FormCard>

      <FormCard>
        <DateField label="Target date (optional)" value={targetDate} onChange={setTargetDate} clearable placeholder="No deadline" minimumDate={new Date()} />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          autoCapitalize="sentences"
          placeholder="Why are you saving for this?"
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? 'Save changes' : 'Create goal'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete goal" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
