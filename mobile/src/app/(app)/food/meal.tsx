import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteMeal, useSaveMeal } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type Meal, type MealInput, type MealType } from '@/features/food/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

function parseMeal(raw?: string): Meal | null {
  try {
    return raw ? (JSON.parse(raw) as Meal) : null;
  } catch {
    return null;
  }
}

const toText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? '' : String(Number(value));

function toOptionalNumber(text: string): number | undefined | null {
  if (!text.trim()) return undefined;
  const value = Number.parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export default function MealScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ meal?: string; mealType?: string; date?: string }>();
  const existing = useMemo(() => parseMeal(params.meal), [params.meal]);

  const initialType = (existing?.mealType ??
    (MEAL_TYPES.some((m) => m.value === params.mealType) ? (params.mealType as MealType) : suggestMealType())) as MealType;

  const [mealType, setMealType] = useState<MealType>(initialType);
  const [foodName, setFoodName] = useState(existing?.foodName ?? '');
  const [quantity, setQuantity] = useState(toText(existing?.quantity));
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [calories, setCalories] = useState(toText(existing?.calories));
  const [protein, setProtein] = useState(toText(existing?.protein));
  const [carbs, setCarbs] = useState(toText(existing?.carbs));
  const [fats, setFats] = useState(toText(existing?.fats));
  const [fiber, setFiber] = useState(toText(existing?.fiber));
  const [sugar, setSugar] = useState(toText(existing?.sugar));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? params.date ?? toIsoDay(new Date()));
  const [showMore, setShowMore] = useState(!!(existing && (existing.fiber || existing.sugar)));
  const [error, setError] = useState<string | null>(null);

  const save = useSaveMeal();
  const remove = useDeleteMeal();

  async function submit() {
    if (!foodName.trim()) return setError('What did you eat?');

    const numbers = {
      quantity: toOptionalNumber(quantity),
      calories: toOptionalNumber(calories),
      protein: toOptionalNumber(protein),
      carbs: toOptionalNumber(carbs),
      fats: toOptionalNumber(fats),
      fiber: toOptionalNumber(fiber),
      sugar: toOptionalNumber(sugar),
    };
    if (Object.values(numbers).some((value) => value === null)) return setError('Numbers must be 0 or more.');

    const input: MealInput = {
      date,
      mealType,
      foodName: foodName.trim(),
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
      quantity: numbers.quantity ?? undefined,
      calories: numbers.calories === undefined ? undefined : Math.round(numbers.calories as number),
      protein: numbers.protein ?? undefined,
      carbs: numbers.carbs ?? undefined,
      fats: numbers.fats ?? undefined,
      fiber: numbers.fiber ?? undefined,
      sugar: numbers.sugar ?? undefined,
    };

    setError(null);
    try {
      await save.mutateAsync({ id: existing?.id, input });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this entry?', existing.foodName, [
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
      <Stack.Screen options={{ title: existing ? 'Edit food' : 'Log food' }} />

      {/* Meal Slot Chips */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="time-outline" size={16} color={moduleColors.food} />
          <Text variant="label" muted>
            Meal Slot
          </Text>
        </View>
        <ChipGroup>
          {MEAL_TYPES.map((slot) => (
            <Chip
              key={slot.value}
              label={slot.label}
              selected={mealType === slot.value}
              color={moduleColors.food}
              onPress={() => setMealType(slot.value)}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {/* Hero Calories & Food Name Card */}
      <GlassCard
        glowColor={moduleColors.food}
        style={{
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="Food Name"
          value={foodName}
          onChangeText={setFoodName}
          placeholder="e.g. Grilled Chicken Salad, Oats Bowl"
          autoFocus={!existing}
          style={{ fontSize: 18, fontWeight: '600' }}
        />

        <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
          <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
            CALORIES (KCAL)
          </Text>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={{
              fontSize: 38,
              fontWeight: '800',
              color: moduleColors.food,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
              minWidth: 120,
              paddingVertical: 0,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="serving, g, bowl…" />
          </View>
        </View>
      </GlassCard>

      {/* Macros Split */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="pie-chart-outline" size={16} color={colors.textMuted} />
          <Text variant="label" muted>
            Macronutrients
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{ fontWeight: '700' }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Carbs (g)"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{ fontWeight: '700' }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Fats (g)"
              value={fats}
              onChangeText={setFats}
              keyboardType="decimal-pad"
              placeholder="0"
              style={{ fontWeight: '700' }}
            />
          </View>
        </View>

        {showMore ? (
          <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <Input label="Fiber (g)" value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Sugar (g)" value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" placeholder="0" />
            </View>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setShowMore(true)} hitSlop={8}>
            <Text variant="label" style={{ fontWeight: '600', color: moduleColors.food }}>
              + Add Fiber & Sugar
            </Text>
          </Pressable>
        )}
      </GlassCard>

      {/* Date & Notes */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Cooking method, restaurant, ingredients…"
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

      <Button title={existing ? 'Save changes' : 'Log food'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete entry" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
