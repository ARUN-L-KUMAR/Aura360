import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { toIsoDay } from '@/components/ui/date-field';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { buildExercise, sessionActions, useLiveSession } from '@/features/fitness/session-store';
import { useSaveMeal } from '@/features/food/hooks';
import type { MealType } from '@/features/food/types';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing } from '@/theme';

/**
 * The assistant can answer with a fenced JSON block (```widget:workout …```). These render it as a
 * native card instead of raw JSON. The rules for what counts as which widget match the web app.
 */

export type Widget =
  | { kind: 'workout'; data: WorkoutData }
  | { kind: 'meal'; data: MealData }
  | { kind: 'finance'; data: FinanceData }
  | { kind: 'fashion'; data: FashionData };

type WorkoutData = {
  title: string;
  focus: string;
  durationMinutes: number;
  exercises: { name: string; sets: number | string; reps: number | string; notes?: string }[];
};
type MealData = { title: string; mealType: MealType; calories: number; protein: number; carbs: number; fats: number; items: { name: string; portion?: string }[] };
type FinanceData = { title: string; totalIncome: number; currency: string; categories: { name: string; percentage: number; description?: string }[]; advice?: string };
type FashionData = { title: string; vibe: string; occasion: string; palette: { name: string; hex: string }[]; items: { category: string; name: string; color: string; colorHex?: string }[]; stylingTip?: string };

export function parseWidget(raw: string, lang?: string): Widget | null {
  const text = raw.trim();
  if (!((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')))) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const type = String(parsed.widget || parsed.type || lang?.replace(/^widget:?/, '') || '').toLowerCase();

  if (type === 'workout' || type === 'fitness' || (Array.isArray(parsed.exercises) && parsed.exercises.length > 0)) {
    return {
      kind: 'workout',
      data: {
        title: parsed.title || 'Workout',
        focus: parsed.difficulty || (Array.isArray(parsed.targetMuscles) ? parsed.targetMuscles.join(', ') : 'Strength'),
        durationMinutes: typeof parsed.duration === 'number' ? parsed.duration : Number.parseInt(String(parsed.duration ?? parsed.durationMinutes ?? '45'), 10) || 45,
        exercises: (parsed.exercises ?? []).map((ex: any) => ({ name: ex.name || 'Exercise', sets: ex.sets ?? 3, reps: ex.reps ?? '10', notes: ex.weight ? String(ex.weight) : ex.notes })),
      },
    };
  }

  if (type === 'meal' || type === 'food' || type === 'nutrition' || (parsed.calories !== undefined && parsed.macros !== undefined) || (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0)) {
    const items = Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((ing: any) => ({ name: typeof ing === 'string' ? ing : ing.name || 'Ingredient', portion: typeof ing === 'object' ? ing.portion : undefined }))
        : [];
    return {
      kind: 'meal',
      data: {
        title: parsed.name || parsed.title || parsed.mealTitle || 'Meal',
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(parsed.mealType) ? parsed.mealType : 'lunch',
        calories: Number(parsed.calories) || 0,
        protein: Number(parsed.macros?.protein ?? parsed.protein) || 0,
        carbs: Number(parsed.macros?.carbs ?? parsed.carbs) || 0,
        fats: Number(parsed.macros?.fats ?? parsed.fats) || 0,
        items,
      },
    };
  }

  if (type === 'finance' || type === 'budget' || (parsed.totalIncome !== undefined && Array.isArray(parsed.categories))) {
    return {
      kind: 'finance',
      data: {
        title: parsed.title || 'Budget plan',
        totalIncome: Number(parsed.totalIncome) || 0,
        currency: parsed.currency || '₹',
        categories: (parsed.categories ?? []).map((c: any) => ({ name: c.name || 'Category', percentage: Number(c.percentage) || 0, description: c.description })),
        advice: parsed.advice || parsed.notes,
      },
    };
  }

  if (type === 'fashion' || type === 'outfit' || type === 'style' || (Array.isArray(parsed.items) && (parsed.vibe || parsed.palette))) {
    return {
      kind: 'fashion',
      data: {
        title: parsed.title || 'Outfit idea',
        vibe: parsed.vibe || '',
        occasion: parsed.occasion || '',
        palette: Array.isArray(parsed.palette) ? parsed.palette : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        stylingTip: parsed.stylingTip || parsed.tip,
      },
    };
  }
  return null;
}

export function AiWidget({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case 'workout':
      return <WorkoutWidget data={widget.data} />;
    case 'meal':
      return <MealWidget data={widget.data} />;
    case 'finance':
      return <FinanceWidget data={widget.data} />;
    case 'fashion':
      return <FashionWidget data={widget.data} />;
  }
}

function Heading({ icon, color, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <View style={[styles.headingIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading" style={{ fontSize: 16 }} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function WorkoutWidget({ data }: { data: WorkoutData }) {
  const router = useRouter();
  const { session } = useLiveSession();
  const color = moduleColors.fitness;

  function start() {
    const begin = () => {
      sessionActions.start(
        data.title,
        data.exercises.map((ex) => buildExercise({ name: ex.name, sets: Number(ex.sets) || undefined, reps: ex.reps })),
      );
      router.navigate('/fitness');
    };
    if (session) {
      Alert.alert('Replace current workout?', `"${session.title}" is still in progress.`, [
        { text: 'Keep current', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: begin },
      ]);
    } else {
      begin();
    }
  }

  return (
    <GlassCard glowColor={color} style={styles.card}>
      <Heading icon="barbell-outline" color={color} title={data.title} subtitle={`${data.focus} · ~${data.durationMinutes} min`} />
      {data.exercises.map((ex, index) => (
        <View key={`${ex.name}-${index}`} style={styles.row}>
          <Text style={{ flex: 1 }} numberOfLines={2}>
            {ex.name}
          </Text>
          <Text muted>
            {ex.sets} × {ex.reps}
          </Text>
        </View>
      ))}
      <Button title="Start this workout" onPress={start} />
    </GlassCard>
  );
}

function MealWidget({ data }: { data: MealData }) {
  const save = useSaveMeal();
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = moduleColors.food;

  async function log() {
    setError(null);
    try {
      await save.mutateAsync({
        input: {
          date: toIsoDay(new Date()),
          mealType: data.mealType,
          foodName: data.title,
          quantity: 1,
          unit: 'serving',
          calories: Math.round(data.calories),
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
          notes: 'Added from Ask Aura',
        },
      });
      setLogged(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log this meal.');
    }
  }

  return (
    <GlassCard glowColor={color} style={styles.card}>
      <Heading icon="restaurant-outline" color={color} title={data.title} subtitle={data.mealType[0].toUpperCase() + data.mealType.slice(1)} />
      <View style={styles.macroRow}>
        <Macro label="kcal" value={Math.round(data.calories)} />
        <Macro label="Protein" value={`${Math.round(data.protein)}g`} />
        <Macro label="Carbs" value={`${Math.round(data.carbs)}g`} />
        <Macro label="Fats" value={`${Math.round(data.fats)}g`} />
      </View>
      {data.items.slice(0, 8).map((item, index) => (
        <Text key={`${item.name}-${index}`} variant="caption" muted>
          • {item.name}
          {item.portion ? ` (${item.portion})` : ''}
        </Text>
      ))}
      {error ? <Text color="danger">{error}</Text> : null}
      <Button title={logged ? 'Logged ✓' : 'Log this meal'} onPress={log} loading={save.isPending} disabled={logged} variant={logged ? 'secondary' : 'primary'} />
    </GlassCard>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="heading" style={{ fontSize: 17 }}>
        {value}
      </Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

const FINANCE_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'];

function FinanceWidget({ data }: { data: FinanceData }) {
  const color = moduleColors.finance;
  const total = data.categories.reduce((sum, c) => sum + c.percentage, 0);
  const money = (value: number) => (data.currency === '₹' ? formatMoney(value) : `${data.currency}${Math.round(value).toLocaleString()}`);

  return (
    <GlassCard glowColor={color} style={styles.card}>
      <Heading icon="wallet-outline" color={color} title={data.title} subtitle={data.totalIncome ? `Based on ${money(data.totalIncome)}` : undefined} />
      {data.categories.map((category, index) => (
        <View key={`${category.name}-${index}`} style={{ gap: spacing.xs }}>
          <View style={styles.row}>
            <Text style={{ flex: 1 }} numberOfLines={1}>
              {category.name}
            </Text>
            <Text style={{ fontWeight: '600' }}>
              {data.totalIncome ? `${money((data.totalIncome * category.percentage) / 100)} · ` : ''}
              {category.percentage}%
            </Text>
          </View>
          <ProgressBar percent={category.percentage} color={FINANCE_COLORS[index % FINANCE_COLORS.length]} height={6} />
          {category.description ? (
            <Text variant="caption" muted>
              {category.description}
            </Text>
          ) : null}
        </View>
      ))}
      {total !== 100 && data.categories.length > 0 ? (
        <Text variant="caption" muted>
          Allocations add up to {total}%.
        </Text>
      ) : null}
      {data.advice ? (
        <Text variant="caption" muted>
          {data.advice}
        </Text>
      ) : null}
    </GlassCard>
  );
}

function FashionWidget({ data }: { data: FashionData }) {
  const color = moduleColors.fashion;
  return (
    <GlassCard glowColor={color} style={styles.card}>
      <Heading icon="shirt-outline" color={color} title={data.title} subtitle={[data.vibe, data.occasion].filter(Boolean).join(' · ')} />
      {data.palette.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {data.palette.slice(0, 8).map((swatch, index) => (
            <View key={`${swatch.hex}-${index}`} accessible accessibilityLabel={swatch.name} style={[styles.swatch, { backgroundColor: swatch.hex }]} />
          ))}
        </View>
      ) : null}
      {data.items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.row}>
          <View style={[styles.swatchSmall, { backgroundColor: item.colorHex || '#94a3b8' }]} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1}>{item.name}</Text>
            <Text variant="caption" muted>
              {item.category} · {item.color}
            </Text>
          </View>
        </View>
      ))}
      {data.stylingTip ? (
        <Text variant="caption" muted>
          {data.stylingTip}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md + 2, marginVertical: spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between' },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  swatchSmall: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
});
