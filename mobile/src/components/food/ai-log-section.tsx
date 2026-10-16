import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useParseMeal, useSaveMeals } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type MealType, type ParsedMeal, type ParsedMealItem } from '@/features/food/types';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

const EXAMPLES = [
  '2 scrambled eggs on toast with half an avocado and black coffee',
  'Grilled chicken breast (200g) with rice and steamed broccoli',
  'Whey protein shake with 1 banana and 20g peanut butter',
];

const NUMERIC_FIELDS: { key: 'calories' | 'protein' | 'carbs' | 'fats'; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fats', label: 'Fats (g)' },
];

export function AiLogSection({ header, onLogged }: { header: ReactNode; onLogged: () => void }) {
  const { accent } = useTheme();
  const notify = useNotify();
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [parsed, setParsed] = useState<ParsedMeal | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  const parse = useParseMeal();
  const save = useSaveMeals();
  const slotLabel = MEAL_TYPES.find((slot) => slot.value === mealType)?.label ?? '';

  async function analyse() {
    if (!text.trim()) {
      haptics.warning();
      return setTextError('Describe what you ate first.');
    }
    setTextError(null);
    try {
      setParsed(await parse.mutateAsync({ mealText: text.trim(), mealType }));
    } catch (e) {
      notify.error(e instanceof ApiError || e instanceof Error ? e.message : 'Could not read that meal.');
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
      notify.success(`Logged ${count} ${count === 1 ? 'item' : 'items'} to ${slotLabel.toLowerCase()}`);
      onLogged();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not save these meals. Try again.');
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

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: accent('ai').soft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={20} color={accent('ai').text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" accessibilityRole="header">
              Log with AI
            </Text>
            <Text variant="caption" color="textSecondary">
              Describe a meal in your own words and we will estimate the nutrition.
            </Text>
          </View>
        </View>

        <Input
          label="What did you eat?"
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (textError) setTextError(null);
            if (parsed) setParsed(null);
          }}
          placeholder="For example, 2 scrambled eggs on toast with black coffee"
          multiline
          autoCapitalize="sentences"
          error={textError}
          style={{ minHeight: 88 }}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            Meal
          </Text>
          <ChipGroup>
            {MEAL_TYPES.map((slot) => (
              <Chip key={slot.value} label={slot.label} icon={slot.icon} selected={mealType === slot.value} accent="food" onPress={() => setMealType(slot.value)} />
            ))}
          </ChipGroup>
        </View>

        {!parsed ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" color="textSecondary">
              Try an example
            </Text>
            {EXAMPLES.map((example) => (
              <ListItem key={example} icon="sparkles-outline" accent="ai" title={example} titleLines={2} accessibilityHint="Fills in the description" onPress={() => setText(example)} chevron={false} />
            ))}
          </View>
        ) : null}

        <Button title={parsed ? 'Analyse again' : 'Analyse with AI'} leftIcon="sparkles" variant={parsed ? 'secondary' : 'primary'} onPress={analyse} loading={parse.isPending} />
      </Card>

      {parse.isPending ? <SkeletonCard lines={3} /> : null}

      {parsed && totals ? (
        <>
          <Card variant="tinted" accent="food" style={{ gap: spacing.xs }}>
            <Text variant="label" color="textSecondary">
              Estimated total
            </Text>
            <Text variant="display" numeric style={{ color: accent('food').text }}>
              {Math.round(totals.calories)} kcal
            </Text>
            <Text variant="body" weight="semiBold" numeric>
              P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fats)}g
            </Text>
            {parsed.summary ? (
              <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
                {parsed.summary}
              </Text>
            ) : null}
          </Card>

          <SectionHeader title="Items" count={parsed.items.length} subtitle="Check the estimates and fix anything that looks off." />

          {parsed.items.length === 0 ? (
            <Text variant="body" color="textSecondary">
              Nothing left to log. Analyse again to start over.
            </Text>
          ) : null}

          {parsed.items.map((item, index) => (
            <Card key={index} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  label="Food"
                  value={item.foodName}
                  onChangeText={(value) => updateItem(index, { foodName: value })}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
                <IconButton icon="close-circle-outline" accessibilityLabel={`Remove ${item.foodName}`} onPress={() => removeItem(index)} style={{ marginBottom: spacing.xs }} />
              </View>
              <Text variant="caption" color="textSecondary">
                {item.quantity} {item.unit}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {NUMERIC_FIELDS.map((field) => (
                  <NumberField key={field.key} label={field.label} value={item[field.key] ?? 0} onChange={(value) => updateItem(index, { [field.key]: value })} />
                ))}
              </View>
            </Card>
          ))}

          <Button
            title={`Log ${parsed.items.length} ${parsed.items.length === 1 ? 'item' : 'items'} to ${slotLabel.toLowerCase()}`}
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
