import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { RingCard } from '@/components/fitness/section-kit';
import { FoodHeading } from '@/components/food/food-kit';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { useParseMeal, useSaveMeals } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type MealType, type ParsedMeal, type ParsedMealItem } from '@/features/food/types';
import { useErrorMessage } from '@/features/food/use-error-message';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

const EXAMPLE_KEYS = ['eggs', 'chicken', 'shake'] as const;

const NUMERIC_KEYS = ['calories', 'protein', 'carbs', 'fats'] as const;

export function AiLogSection({ header, onLogged }: { header: ReactNode; onLogged: () => void }) {
  const { accent, colors } = useTheme();
  const notify = useNotify();
  const { t } = useTranslation('food');
  const errorMessage = useErrorMessage();
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [parsed, setParsed] = useState<ParsedMeal | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  const parse = useParseMeal();
  const save = useSaveMeals();

  async function analyse() {
    if (!text.trim()) {
      haptics.warning();
      return setTextError(t('aiLog.describeFirst'));
    }
    setTextError(null);
    try {
      setParsed(await parse.mutateAsync({ mealText: text.trim(), mealType }));
    } catch (e) {
      notify.error(errorMessage(e, t('aiLog.parseFailed')));
    }
  }

  function updateItem(index: number, patch: Partial<ParsedMealItem>) {
    setParsed((current) => (current ? { ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) } : current));
  }

  function removeItem(index: number) {
    setParsed((current) => (current ? { ...current, items: current.items.filter((_, i) => i !== index) } : current));
  }

  async function logAll() {
    if (!parsed || parsed.items.length === 0) return;
    const date = toIsoDay(new Date());
    const count = parsed.items.length;
    try {
      await save.mutateAsync(
        parsed.items.map((item) => ({
          date,
          mealType,
          foodName: item.foodName,
          quantity: item.quantity || 1,
          unit: item.unit || 'serving',
          calories: Math.round(item.calories || 0),
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fats: item.fats || 0,
          fiber: item.fiber || 0,
          sugar: item.sugar || 0,
          notes: `AI parsed: "${text.trim().slice(0, 50)}"`,
        })),
      );
      setText('');
      setParsed(null);
      notify.success(t('aiLog.logged', { count, slot: t(`mealsLower.${mealType}`) }));
      analytics.track('meal_logged', { source: 'ai' });
      onLogged();
    } catch (e) {
      notify.error(errorMessage(e, t('aiLog.saveFailed')));
    }
  }

  const totals = parsed?.items.reduce(
    (sum, item) => ({
      calories: sum.calories + (Number(item.calories) || 0),
      protein: sum.protein + (Number(item.protein) || 0),
      carbs: sum.carbs + (Number(item.carbs) || 0),
      fats: sum.fats + (Number(item.fats) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  return (
    <Screen>
      {header}

      <RingCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconTile icon="sparkles" accent="ai" />
          <View style={{ flex: 1 }}>
            <FoodHeading overline={t('aiLog.overline')} title={t('aiLog.title')} subtitle={t('aiLog.subtitle')} />
          </View>
        </View>

        <Input
          label={t('aiLog.whatDidYouEat')}
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (textError) setTextError(null);
            if (parsed) setParsed(null);
          }}
          placeholder={t('aiLog.placeholder')}
          multiline
          autoCapitalize="sentences"
          error={textError}
          style={{ minHeight: 88 }}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textMuted">
            {t('aiLog.meal')}
          </Text>
          <ChipGroup>
            {MEAL_TYPES.map((slot) => (
              <Chip key={slot.value} label={slot.label} icon={slot.icon} selected={mealType === slot.value} accent="food" onPress={() => setMealType(slot.value)} />
            ))}
          </ChipGroup>
        </View>

        {!parsed ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" color="textMuted">
              {t('aiLog.tryExample')}
            </Text>
            <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {EXAMPLE_KEYS.map((key, index) => {
                const example = t(`aiLog.examples.${key}`);
                return (
                  <ListItem
                    key={key}
                    icon="sparkles-outline"
                    accent="ai"
                    title={example}
                    titleLines={2}
                    divider={index < EXAMPLE_KEYS.length - 1}
                    accessibilityHint={t('aiLog.exampleHint')}
                    onPress={() => setText(example)}
                    chevron={false}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        <Button title={parsed ? t('aiLog.analyseAgain') : t('aiLog.analyse')} leftIcon="sparkles" variant={parsed ? 'secondary' : 'primary'} onPress={analyse} loading={parse.isPending} />
      </RingCard>

      {parse.isPending ? <SkeletonCard lines={3} /> : null}

      {parsed && totals ? (
        <>
          <RingCard
            accessible
            accessibilityLabel={[
              t('aiLog.estimatedTotal'),
              t('units.kcal', { value: Math.round(totals.calories) }),
              t('macros.proteinSpoken', { count: Math.round(totals.protein) }),
              t('macros.carbsSpoken', { count: Math.round(totals.carbs) }),
              t('macros.fatsSpoken', { count: Math.round(totals.fats) }),
              parsed.summary,
            ]
              .filter(Boolean)
              .join(', ')}
            style={{ gap: spacing.md }}>
            <Text variant="overline" style={{ color: accent('food').text }}>
              {t('aiLog.estimatedTotal')}
            </Text>
            <AnimatedNumber value={Math.round(totals.calories)} format={(n) => t('units.kcal', { value: n.toLocaleString(getDeviceLocale()) })} variant="display" />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {(
                [
                  { key: 'protein', label: t('rings.protein'), value: totals.protein },
                  { key: 'carbs', label: t('rings.carbs'), value: totals.carbs },
                  { key: 'fats', label: t('rings.fats'), value: totals.fats },
                ] as const
              ).map((macro) => (
                <View key={macro.key} style={{ flex: 1, gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.cardMuted }}>
                  <Text variant="label" weight="bold" numeric numberOfLines={1}>
                    {t('units.grams', { value: Math.round(macro.value) })}
                  </Text>
                  <Text variant="overline" color="textMuted" numberOfLines={1}>
                    {macro.label}
                  </Text>
                </View>
              ))}
            </View>
            {parsed.summary ? (
              <Text variant="caption" color="textSecondary">
                {parsed.summary}
              </Text>
            ) : null}
          </RingCard>

          <FoodHeading overline={t('aiLog.itemsOverline')} title={t('aiLog.items')} count={parsed.items.length} subtitle={t('aiLog.itemsSubtitle')} />

          {parsed.items.length === 0 ? (
            <Text variant="body" color="textSecondary">
              {t('aiLog.nothingLeft')}
            </Text>
          ) : null}

          {parsed.items.map((item, index) => (
            <RingCard key={index} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  label={t('meal.food')}
                  value={item.foodName}
                  onChangeText={(value) => updateItem(index, { foodName: value })}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
                <IconButton icon="close-circle-outline" accessibilityLabel={t('aiLog.removeItem', { name: item.foodName })} onPress={() => removeItem(index)} style={{ marginBottom: spacing.xs }} />
              </View>
              <Text variant="caption" color="textSecondary">
                {item.quantity} {item.unit}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {NUMERIC_KEYS.map((key) => (
                  <NumberField key={key} label={t(`aiLog.fields.${key}`)} value={item[key] ?? 0} onChange={(value) => updateItem(index, { [key]: value })} />
                ))}
              </View>
            </RingCard>
          ))}

          <Button
            title={t('aiLog.logAll', { count: parsed.items.length, slot: t(`mealsLower.${mealType}`) })}
            leftIcon="checkmark"
            onPress={logAll}
            loading={save.isPending}
            disabled={parsed.items.length === 0}
          />
        </>
      ) : null}
    </Screen>
  );
}

/**
 * Decimal field backed by a number. It keeps its own text so "7." survives while typing, and re-syncs only when the
 * number is changed from outside (for example when an item above it is removed).
 */
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if ((Number.parseFloat(text) || 0) !== value) setText(String(value));
  }
  return (
    <Input
      containerStyle={{ flexGrow: 1, flexBasis: 120 }}
      label={label}
      value={text}
      keyboardType="decimal-pad"
      onChangeText={(next) => {
        setText(next);
        onChange(Number.parseFloat(next) || 0);
      }}
    />
  );
}
