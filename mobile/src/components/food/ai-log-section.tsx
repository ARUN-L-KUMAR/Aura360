import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useParseMeal, useSaveMeals } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type MealType, type ParsedMeal, type ParsedMealItem } from '@/features/food/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const EXAMPLES = [
  '2 scrambled eggs on toast with half an avocado and black coffee',
  'Grilled chicken breast (200g) with rice and steamed broccoli',
  'Whey protein shake with 1 banana and 20g peanut butter',
];

const NUMERIC_FIELDS: { key: keyof ParsedMealItem; label: string }[] = [
  { key: 'calories', label: 'kcal' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fats', label: 'Fats' },
];

export function AiLogSection({ header, onLogged }: { header: ReactNode; onLogged: () => void }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const [text, setText] = useState('');
  const [mealType, setMealType] = useState<MealType>(suggestMealType());
  const [parsed, setParsed] = useState<ParsedMeal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = useParseMeal();
  const save = useSaveMeals();

  async function analyse() {
    if (!text.trim()) return setError('Describe what you ate first.');
    setError(null);
    try {
      setParsed(await parse.mutateAsync({ mealText: text.trim(), mealType }));
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Could not read that meal.');
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
    setError(null);
    const date = toIsoDay(new Date());
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
      onLogged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save these meals. Try again.');
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

      <GlassCard glowColor={moduleColors.ai} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.md,
              backgroundColor: `${moduleColors.ai}25`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="sparkles" size={16} color={moduleColors.ai} />
          </View>
          <View>
            <Text variant="heading" style={{ fontSize: 16 }}>
              AI Food Intelligence
            </Text>
            <Text variant="caption" muted>
              Type in natural language to parse nutritional macros
            </Text>
          </View>
        </View>

        <Input
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (parsed) setParsed(null);
          }}
          placeholder="e.g. 2 scrambled eggs on toast with black coffee"
          multiline
          style={{ minHeight: 88, textAlignVertical: 'top', paddingTop: spacing.md }}
        />

        <ChipGroup>
          {MEAL_TYPES.map((slot) => (
            <Chip key={slot.value} label={slot.label} selected={mealType === slot.value} color={moduleColors.food} onPress={() => setMealType(slot.value)} />
          ))}
        </ChipGroup>

        {!parsed ? (
          <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
            <Text variant="caption" muted style={{ fontWeight: '600' }}>
              Tap an example to try:
            </Text>
            {EXAMPLES.map((example) => (
              <Pressable
                key={example}
                accessibilityRole="button"
                onPress={() => setText(example)}
                hitSlop={4}
                style={({ pressed }) => ({
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: radius.sm,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text variant="caption" style={{ color: colors.text }} numberOfLines={2}>
                  “{example}”
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? <Text color="danger">{error}</Text> : null}
        <Button title={parsed ? 'Analyse again' : 'Analyse with AI'} variant={parsed ? 'secondary' : 'primary'} onPress={analyse} loading={parse.isPending} />
      </GlassCard>

      {parsed && totals ? (
        <>
          <GlassCard glowColor={moduleColors.food} style={{ gap: spacing.xs }}>
            <Text variant="label" muted>
              Estimated Total
            </Text>
            <Text variant="display" style={{ fontSize: 28, lineHeight: 32, color: moduleColors.food }}>
              {Math.round(totals.calories)} kcal
            </Text>
            <Text style={{ fontWeight: '600' }}>
              P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fats)}g
            </Text>
            {parsed.summary ? (
              <Text variant="caption" muted style={{ marginTop: spacing.xs }}>
                {parsed.summary}
              </Text>
            ) : null}
          </GlassCard>

          {parsed.items.map((item, index) => (
            <GlassCard key={`${item.foodName}-${index}`} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input value={item.foodName} onChangeText={(value) => updateItem(index, { foodName: value })} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.foodName}`} onPress={() => removeItem(index)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text variant="caption" muted>
                {item.quantity} {item.unit}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {NUMERIC_FIELDS.map((field) => (
                  <View key={field.key} style={{ flex: 1 }}>
                    <Input
                      label={field.label}
                      value={String(item[field.key] ?? '')}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => updateItem(index, { [field.key]: Number.parseFloat(value) || 0 } as Partial<ParsedMealItem>)}
                    />
                  </View>
                ))}
              </View>
            </GlassCard>
          ))}

          <Button
            title={`Log ${parsed.items.length} ${parsed.items.length === 1 ? 'item' : 'items'} to ${MEAL_TYPES.find((slot) => slot.value === mealType)?.label}`}
            onPress={logAll}
            loading={save.isPending}
            disabled={parsed.items.length === 0}
          />
        </>
      ) : null}
    </Screen>
  );
}

