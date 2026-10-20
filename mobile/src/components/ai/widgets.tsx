import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toIsoDay } from '@/components/ui/date-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { buildExercise, sessionActions, useLiveSession } from '@/features/fitness/session-store';
import { useSaveMeal } from '@/features/food/hooks';
import type { MealType } from '@/features/food/types';
import { getDeviceLocale, i18n, useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

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
        title: parsed.title || i18n.t('ai:widgets.defaultWorkout'),
        focus: parsed.difficulty || (Array.isArray(parsed.targetMuscles) ? parsed.targetMuscles.join(', ') : i18n.t('ai:widgets.defaultFocus')),
        durationMinutes: typeof parsed.duration === 'number' ? parsed.duration : Number.parseInt(String(parsed.duration ?? parsed.durationMinutes ?? '45'), 10) || 45,
        exercises: (parsed.exercises ?? []).map((ex: any) => ({ name: ex.name || i18n.t('ai:widgets.defaultExercise'), sets: ex.sets ?? 3, reps: ex.reps ?? '10', notes: ex.weight ? String(ex.weight) : ex.notes })),
      },
    };
  }

  if (type === 'meal' || type === 'food' || type === 'nutrition' || (parsed.calories !== undefined && parsed.macros !== undefined) || (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0)) {
    const items = Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((ing: any) => ({ name: typeof ing === 'string' ? ing : ing.name || i18n.t('ai:widgets.defaultIngredient'), portion: typeof ing === 'object' ? ing.portion : undefined }))
        : [];
    return {
      kind: 'meal',
      data: {
        title: parsed.name || parsed.title || parsed.mealTitle || i18n.t('ai:widgets.defaultMeal'),
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
        title: parsed.title || i18n.t('ai:widgets.defaultBudget'),
        totalIncome: Number(parsed.totalIncome) || 0,
        currency: parsed.currency || '₹',
        categories: (parsed.categories ?? []).map((c: any) => ({ name: c.name || i18n.t('ai:widgets.defaultCategory'), percentage: Number(c.percentage) || 0, description: c.description })),
        advice: parsed.advice || parsed.notes,
      },
    };
  }

  if (type === 'fashion' || type === 'outfit' || type === 'style' || (Array.isArray(parsed.items) && (parsed.vibe || parsed.palette))) {
    return {
      kind: 'fashion',
      data: {
        title: parsed.title || i18n.t('ai:widgets.defaultOutfit'),
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

function Heading({ icon, module, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; module: ModuleKey; title: string; subtitle?: string }) {
  const { accent } = useTheme();
  const a = accent(module);
  return (
    <View style={styles.heading}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.headingIcon, { backgroundColor: a.soft, borderColor: a.border }]}>
        <Ionicons name={icon} size={20} color={a.text} />
      </View>
      <View style={styles.grow}>
        <Text variant="title" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function WorkoutWidget({ data }: { data: WorkoutData }) {
  const router = useRouter();
  const { confirm } = useNotify();
  const { t } = useTranslation('ai');
  const { session } = useLiveSession();

  async function start() {
    if (session) {
      const replace = await confirm({
        title: t('widgets.replaceTitle'),
        message: t('widgets.replaceMessage', { title: session.title }),
        confirmLabel: t('widgets.replace'),
        cancelLabel: t('widgets.keepCurrent'),
        destructive: true,
      });
      if (!replace) return;
    }
    sessionActions.start(
      data.title,
      data.exercises.map((ex) => buildExercise({ name: ex.name, sets: Number(ex.sets) || undefined, reps: ex.reps })),
    );
    analytics.track('workout_started', { source: 'coach' });
    router.navigate('/fitness');
  }

  return (
    <Card variant="tinted" accent="fitness" style={styles.card}>
      <Heading icon="barbell-outline" module="fitness" title={data.title} subtitle={t('widgets.workoutSubtitle', { focus: data.focus, minutes: data.durationMinutes })} />
      {data.exercises.map((ex, index) => (
        <View key={`${ex.name}-${index}`} accessible accessibilityLabel={t('widgets.exerciseSpoken', { name: ex.name, sets: ex.sets, reps: ex.reps })} style={styles.row}>
          <Text style={styles.grow} numberOfLines={2}>
            {ex.name}
          </Text>
          <Text color="textSecondary" numeric>
            {ex.sets} × {ex.reps}
          </Text>
        </View>
      ))}
      <Button title={t('widgets.startWorkout')} leftIcon="play" onPress={() => void start()} />
    </Card>
  );
}

function MealWidget({ data }: { data: MealData }) {
  const save = useSaveMeal();
  const notify = useNotify();
  const { t } = useTranslation(['ai', 'food']);
  const [logged, setLogged] = useState(false);

  async function log() {
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
      notify.success(t('ai:widgets.mealLogged'));
      analytics.track('meal_logged', { source: 'ai' });
    } catch {
      notify.error(t('ai:widgets.mealFailed'));
    }
  }

  return (
    <Card variant="tinted" accent="food" style={styles.card}>
      <Heading icon="restaurant-outline" module="food" title={data.title} subtitle={t(`food:mealTypes.${data.mealType}`)} />
      <View style={styles.macroRow}>
        <Macro label={t('ai:widgets.kcal')} value={Math.round(data.calories)} />
        <Macro label={t('food:rings.protein')} value={t('food:units.grams', { value: Math.round(data.protein) })} />
        <Macro label={t('food:rings.carbs')} value={t('food:units.grams', { value: Math.round(data.carbs) })} />
        <Macro label={t('food:rings.fats')} value={t('food:units.grams', { value: Math.round(data.fats) })} />
      </View>
      {data.items.slice(0, 8).map((item, index) => (
        <Text key={`${item.name}-${index}`} variant="caption" color="textSecondary">
          {item.portion ? t('ai:widgets.itemWithPortion', { name: item.name, portion: item.portion }) : t('ai:widgets.item', { name: item.name })}
        </Text>
      ))}
      <Button
        title={logged ? t('ai:widgets.logged') : t('ai:widgets.logMeal')}
        leftIcon={logged ? 'checkmark' : 'add'}
        onPress={() => void log()}
        loading={save.isPending}
        disabled={logged}
        variant={logged ? 'secondary' : 'primary'}
      />
    </Card>
  );
}

function Macro({ label, value }: { label: string; value: string | number }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={styles.grow}>
      <Text variant="title" numeric>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/** Category order for the budget bars; each bar takes its colour from a module accent. */
const FINANCE_BAR_ACCENTS: ModuleKey[] = ['finance', 'time', 'food', 'fashion', 'skincare', 'fitness'];

function FinanceWidget({ data }: { data: FinanceData }) {
  const { accent } = useTheme();
  const { t } = useTranslation('ai');
  const total = data.categories.reduce((sum, c) => sum + c.percentage, 0);
  const money = (value: number) => (data.currency === '₹' ? formatMoney(value) : `${data.currency}${Math.round(value).toLocaleString(getDeviceLocale())}`);

  return (
    <Card variant="tinted" accent="finance" style={styles.card}>
      <Heading icon="wallet-outline" module="finance" title={data.title} subtitle={data.totalIncome ? t('widgets.basedOn', { amount: money(data.totalIncome) }) : undefined} />
      {data.categories.map((category, index) => {
        const amount = data.totalIncome ? `${money((data.totalIncome * category.percentage) / 100)} · ` : '';
        return (
          <View
            key={`${category.name}-${index}`}
            accessible
            accessibilityLabel={t('widgets.categorySpoken', { name: category.name, amount, percentage: category.percentage, description: category.description ? `, ${category.description}` : '' })}
            style={styles.categoryBlock}>
            <View style={styles.row}>
              <Text style={styles.grow} numberOfLines={2}>
                {category.name}
              </Text>
              <Text weight="semiBold" numeric>
                {amount}
                {category.percentage}%
              </Text>
            </View>
            <ProgressBar percent={category.percentage} color={accent(FINANCE_BAR_ACCENTS[index % FINANCE_BAR_ACCENTS.length]).solid} height={spacing.sm} />
            {category.description ? (
              <Text variant="caption" color="textSecondary">
                {category.description}
              </Text>
            ) : null}
          </View>
        );
      })}
      {total !== 100 && data.categories.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {t('widgets.allocations', { total })}
        </Text>
      ) : null}
      {data.advice ? (
        <Text variant="caption" color="textSecondary">
          {data.advice}
        </Text>
      ) : null}
    </Card>
  );
}

function FashionWidget({ data }: { data: FashionData }) {
  const { colors } = useTheme();
  const { t } = useTranslation('ai');
  const swatches = data.palette.slice(0, 8);
  return (
    <Card variant="tinted" accent="fashion" style={styles.card}>
      <Heading icon="shirt-outline" module="fashion" title={data.title} subtitle={[data.vibe, data.occasion].filter(Boolean).join(' · ')} />
      {swatches.length > 0 ? (
        <View accessible accessibilityLabel={t('widgets.paletteSpoken', { names: swatches.map((swatch) => swatch.name).join(', ') })} style={styles.swatchRow}>
          {swatches.map((swatch, index) => (
            // The colour values come from the assistant's reply; the border keeps pale swatches visible.
            <View key={`${swatch.hex}-${index}`} style={[styles.swatch, { backgroundColor: swatch.hex, borderColor: colors.borderStrong }]} />
          ))}
        </View>
      ) : null}
      {data.items.map((item, index) => (
        <View key={`${item.name}-${index}`} accessible accessibilityLabel={t('widgets.itemSpoken', { name: item.name, category: item.category, color: item.color })} style={styles.row}>
          <View style={[styles.swatchSmall, { backgroundColor: item.colorHex || colors.cardMuted, borderColor: colors.borderStrong }]} />
          <View style={styles.grow}>
            <Text numberOfLines={2}>{item.name}</Text>
            <Text variant="caption" color="textSecondary">
              {item.category} · {item.color}
            </Text>
          </View>
        </View>
      ))}
      {data.stylingTip ? (
        <Text variant="caption" color="textSecondary">
          {data.stylingTip}
        </Text>
      ) : null}
    </Card>
  );
}

const SWATCH = spacing.xl + spacing.xs;

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginVertical: spacing.xs },
  grow: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingIcon: { width: layout.minTouchTarget, height: layout.minTouchTarget, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between' },
  categoryBlock: { gap: spacing.xs },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  swatchSmall: { width: spacing.lg, height: spacing.lg, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
