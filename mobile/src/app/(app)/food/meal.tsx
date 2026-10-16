import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useDeleteMeal, useSaveMeal } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type Meal, type MealInput, type MealType } from '@/features/food/types';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

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

type NumberKey = 'quantity' | 'calories' | 'protein' | 'carbs' | 'fats' | 'fiber' | 'sugar';
type Errors = Partial<Record<NumberKey | 'foodName', string>>;

export default function MealScreen() {
  const router = useRouter();
  const notify = useNotify();
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
  const [errors, setErrors] = useState<Errors>({});

  const save = useSaveMeal();
  const remove = useDeleteMeal();

  /** Edits a field and clears that field's error. */
  const edit = (key: keyof Errors, set: (value: string) => void) => (value: string) => {
    set(value);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit() {
    const found: Errors = {};
    if (!foodName.trim()) found.foodName = 'Enter what you ate.';

    const numbers: Record<NumberKey, number | undefined | null> = {
      quantity: toOptionalNumber(quantity),
      calories: toOptionalNumber(calories),
      protein: toOptionalNumber(protein),
      carbs: toOptionalNumber(carbs),
      fats: toOptionalNumber(fats),
      fiber: toOptionalNumber(fiber),
      sugar: toOptionalNumber(sugar),
    };
    for (const key of Object.keys(numbers) as NumberKey[]) {
      if (numbers[key] === null) found[key] = 'Enter 0 or more.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      haptics.warning();
      return;
    }

    const input: MealInput = {
      date,
      mealType,
      foodName: foodName.trim(),
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
      quantity: numbers.quantity ?? undefined,
      calories: numbers.calories == null ? undefined : Math.round(numbers.calories),
      protein: numbers.protein ?? undefined,
      carbs: numbers.carbs ?? undefined,
      fats: numbers.fats ?? undefined,
      fiber: numbers.fiber ?? undefined,
      sugar: numbers.sugar ?? undefined,
    };

    try {
      await save.mutateAsync({ id: existing?.id, input });
      notify.success(existing ? 'Changes saved' : `${foodName.trim()} logged`);
      router.back();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: 'Delete this entry?',
      message: `${existing.foodName} will be removed from your log.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success('Entry deleted');
      router.back();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
    }
  }

  const macroField = { flexGrow: 1, flexBasis: 96 } as const;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit food' : 'Log food' }} />

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Meal" />
        <ChipGroup>
          {MEAL_TYPES.map((slot) => (
            <Chip key={slot.value} label={slot.label} icon={slot.icon} selected={mealType === slot.value} accent="food" onPress={() => setMealType(slot.value)} />
          ))}
        </ChipGroup>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Input
          label="Food"
          value={foodName}
          onChangeText={edit('foodName', setFoodName)}
          placeholder="For example, grilled chicken salad"
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={errors.foodName}
        />
        <Input
          label="Calories"
          value={calories}
          onChangeText={edit('calories', setCalories)}
          keyboardType="number-pad"
          placeholder="0"
          error={errors.calories}
          rightAdornment={
            <Text variant="label" color="textSecondary">
              kcal
            </Text>
          }
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Input containerStyle={macroField} label="Quantity" value={quantity} onChangeText={edit('quantity', setQuantity)} keyboardType="decimal-pad" placeholder="1" error={errors.quantity} />
          <Input containerStyle={macroField} label="Unit" value={unit} onChangeText={setUnit} placeholder="serving, g, bowl" autoCapitalize="none" returnKeyType="done" />
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Macronutrients" subtitle="All optional" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Input containerStyle={macroField} label="Protein (g)" value={protein} onChangeText={edit('protein', setProtein)} keyboardType="decimal-pad" placeholder="0" error={errors.protein} />
          <Input containerStyle={macroField} label="Carbs (g)" value={carbs} onChangeText={edit('carbs', setCarbs)} keyboardType="decimal-pad" placeholder="0" error={errors.carbs} />
          <Input containerStyle={macroField} label="Fats (g)" value={fats} onChangeText={edit('fats', setFats)} keyboardType="decimal-pad" placeholder="0" error={errors.fats} />
        </View>

        {showMore ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <Input containerStyle={macroField} label="Fiber (g)" value={fiber} onChangeText={edit('fiber', setFiber)} keyboardType="decimal-pad" placeholder="0" error={errors.fiber} />
            <Input containerStyle={macroField} label="Sugar (g)" value={sugar} onChangeText={edit('sugar', setSugar)} keyboardType="decimal-pad" placeholder="0" error={errors.sugar} />
          </View>
        ) : (
          <Button title="Add fiber and sugar" variant="tertiary" size="sm" leftIcon="add" fullWidth={false} onPress={() => setShowMore(true)} />
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Cooking method, restaurant, ingredients"
          autoCapitalize="sentences"
          style={{ minHeight: 64 }}
        />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? 'Save changes' : 'Log food'} leftIcon="checkmark" onPress={submit} loading={save.isPending} />
        {existing ? <Button title="Delete entry" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
      </View>
    </Screen>
  );
}
