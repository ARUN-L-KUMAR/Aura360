import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { CategoryPicker } from '@/components/finance/category-picker';
import { categoryIcon } from '@/components/finance/category-icons';
import { failureMessage } from '@/components/finance/failure-message';
import { goalAccent } from '@/components/finance/goal-accent';
import { FormCard, cleanAmount, parseAmount } from '@/components/finance/form-parts';
import { categoryLabel } from '@/components/finance/labels';
import { Button } from '@/components/ui/button';
import { Card, readableOn } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ProgressRing } from '@/components/viz/progress-ring';
import { useDeleteGoal, useSaveGoal } from '@/features/finance/hooks';
import { GOAL_CATEGORIES, GOAL_COLORS, type Goal } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, neutral, radius, spacing, tabularNums, useTheme } from '@/theme';

const PREVIEW_RING = spacing.xxxl * 2;
const PREVIEW_RING_THICKNESS = spacing.sm + 2;

/** Catalog keys for the spoken names of the swatches in GOAL_COLORS, in the same order. */
const COLOR_NAME_KEYS = ['indigo', 'green', 'purple', 'amber', 'red', 'pink', 'teal'] as const;

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
  const { t } = useTranslation('finance');
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

  const titleError = title.trim() ? null : t('goal.nameNeeded');
  const targetError = !Number.isFinite(targetValue) || targetValue <= 0 ? t('goal.targetInvalid') : null;
  const savedError = !Number.isFinite(savedValue) ? t('goal.savedInvalid') : savedValue < 0 ? t('goal.savedNegative') : null;

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
      analytics.track('goal_saved');
      notify.success(existing ? t('goal.updated') : t('goal.created'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: t('goal.deleteTitle'),
      message: t('goal.deleteMessage', { title: existing.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(t('goal.deleted'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.delete')));
    }
  }

  const symbol = (
    <Text variant="body" color="textSecondary" accessibilityElementsHidden importantForAccessibility="no">
      {CURRENCY_SYMBOL}
    </Text>
  );

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('goal.titleEdit') : t('goal.titleNew') }} />

      {/* Live preview of the goal card. It repeats what the fields below already say, so screen readers skip it. */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ProgressRing value={progressPercent} size={PREVIEW_RING} thickness={PREVIEW_RING_THICKNESS} accent={goalAccent(color)}>
          <Text variant="title" weight="bold" numeric>
            {progressPercent}%
          </Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Tag label={categoryLabel(category)} color={color} tone="accent" />
          <Text variant="title" weight="bold" numberOfLines={2}>
            {title.trim() || t('goal.namePlaceholder')}
          </Text>
          <Text variant="caption" numeric color="textSecondary">
            {t('goal.saved', { amount: formatMoney(savedVal) })}
          </Text>
          <Text variant="caption" numeric color="textSecondary">
            {t('goal.target', { amount: formatMoney(targetVal) })}
          </Text>
        </View>
      </Card>

      <FormCard>
        <Input
          label={t('goal.nameLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('goal.nameExample')}
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
              label={t('goal.targetLabel')}
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
              label={t('goal.savedLabel')}
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

      <FormCard title={t('goal.category')} icon="pricetags-outline">
        <CategoryPicker
          accessibilityLabel={t('goal.category')}
          value={category}
          onChange={setCategory}
          options={GOAL_CATEGORIES.map((name) => ({ value: name, label: categoryLabel(name), icon: categoryIcon(name) }))}
        />
      </FormCard>

      <FormCard title={t('goal.colour')} icon="color-palette-outline">
        <View accessibilityRole="radiogroup" accessibilityLabel={t('goal.colour')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {GOAL_COLORS.map((value, i) => {
            const isSelected = color === value;
            const nameKey = COLOR_NAME_KEYS[i];
            return (
              <PressableScale
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={nameKey ? t(`goal.colours.${nameKey}` as const) : t('goal.colours.fallback', { index: i + 1 })}
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
        <DateField label={t('goal.dateLabel')} value={targetDate} onChange={setTargetDate} clearable placeholder={t('goal.dateNone')} minimumDate={new Date()} />
        <Input
          label={t('goal.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          multiline
          autoCapitalize="sentences"
          placeholder={t('goal.notesPlaceholder')}
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? t('goal.saveChanges') : t('goal.create')} onPress={submit} loading={save.isPending} />
      {existing ? <Button title={t('goal.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
