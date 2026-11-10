import type { TFunction } from 'i18next';

import type { FashionItem, FashionOutfit } from '@/features/fashion/types';
import type { Budget, Goal, Transaction } from '@/features/finance/types';
import { OVERALL_BUDGET } from '@/features/finance/types';
import type { FitnessEntry } from '@/features/fitness/types';
import type { Meal } from '@/features/food/types';
import { checklistOf, type Note } from '@/features/notes/types';
import { hostOf, type SavedItem } from '@/features/saved/types';
import type { SkincareProduct } from '@/features/skincare/types';
import type { TimeLog } from '@/features/time/types';
import { formatDay, formatMoney } from '@/lib/format';

import type { SearchEntry } from './types';

/**
 * Turns each section's records into flat search entries (title, subtitle, hidden searchable text, right-hand value and
 * the route that opens it). Routes and params are exactly what the sections themselves push, so a result opens the
 * same screen as tapping the row inside its section.
 */
type T = TFunction<'search'>;

const SEPARATOR = ' · ';
const joinParts = (...parts: (string | null | undefined | false)[]) => parts.filter((part): part is string => !!part && part.trim().length > 0).join(SEPARATOR);
const texts = (...values: (string | null | undefined | readonly string[])[]): string[] => {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === 'string') out.push(value);
    else if (value) out.push(...value);
  }
  return out.filter((text) => text.trim().length > 0);
};
const sentence = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text);
const json = (value: unknown) => JSON.stringify(value);

function duration(minutes: number, t: T) {
  if (minutes < 60) return t('item.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t('item.hoursMinutes', { hours, minutes: rest }) : t('item.hours', { hours });
}

export function noteEntries(notes: readonly Note[] | undefined, t: T): SearchEntry[] {
  return (notes ?? []).map((note) => {
    const checklist = (checklistOf(note) ?? []).map((item) => item.text);
    return {
      key: `notes:${note.id}`,
      group: 'notes',
      title: note.title?.trim() || t('item.untitledNote'),
      subtitle: note.content?.trim() || checklist.join(', ') || null,
      extras: texts(note.tags ?? [], note.category, checklist),
      meta: note.isArchived ? t('item.archived') : formatDay(note.updatedAt),
      route: { pathname: '/notes/edit', params: { note: json(note) } },
    };
  });
}

export function savedEntries(items: readonly SavedItem[] | undefined): SearchEntry[] {
  return (items ?? []).map((item) => ({
    key: `saved:${item.id}`,
    group: 'saved',
    title: item.title,
    subtitle: item.description?.trim() || hostOf(item.url),
    extras: texts(item.url, item.tags ?? [], item.type),
    meta: null,
    route: { pathname: '/saved/item', params: { item: json(item) } },
  }));
}

export function transactionEntries(transactions: readonly Transaction[], t: T): SearchEntry[] {
  return transactions.map((tx) => ({
    key: `transactions:${tx.id}`,
    group: 'transactions',
    title: tx.description?.trim() || tx.category,
    subtitle: joinParts(tx.description?.trim() ? tx.category : null, formatDay(tx.date)),
    extras: texts(tx.notes, t(`item.${tx.type}`), tx.paymentMethod),
    meta: formatMoney(tx.amount),
    route: { pathname: '/finance/transaction', params: { tx: json(tx) } },
  }));
}

export function budgetEntries(budgets: readonly Budget[] | undefined, month: string, t: T): SearchEntry[] {
  return (budgets ?? []).map((budget) => ({
    key: `budgets:${budget.id}`,
    group: 'budgets',
    title: budget.category === OVERALL_BUDGET ? t('item.overallBudget') : budget.category,
    subtitle: t('item.budgetSpent', { spent: formatMoney(budget.spent), limit: formatMoney(budget.amount) }),
    extras: [],
    meta: null,
    route: { pathname: '/finance/budget', params: { month, budget: json(budget) } },
  }));
}

export function goalEntries(goals: readonly Goal[] | undefined, t: T): SearchEntry[] {
  return (goals ?? []).map((goal) => ({
    key: `goals:${goal.id}`,
    group: 'goals',
    title: goal.title,
    subtitle: goal.category,
    extras: texts(goal.notes),
    meta: t('item.goalSaved', { percent: Math.round(goal.percentage) }),
    route: { pathname: '/finance/goal', params: { goal: json(goal) } },
  }));
}

/** Wardrobe and wishlist items (sold and donated pieces are not shown in either section, so they are not searched). */
export function fashionEntries(items: readonly FashionItem[] | undefined): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const item of items ?? []) {
    if (item.status !== 'wardrobe' && item.status !== 'wishlist') continue;
    out.push({
      key: `${item.status}:${item.id}`,
      group: item.status,
      title: item.name,
      subtitle: joinParts(item.brand, item.category) || null,
      extras: texts(item.description, item.subcategory, item.color, item.size, item.tags ?? [], item.notes, item.occasion ?? [], item.season ?? []),
      meta: item.price != null && Number(item.price) > 0 ? formatMoney(item.price) : null,
      route: { pathname: '/fashion/add', params: { id: item.id } },
    });
  }
  return out;
}

/** Outfits have no detail screen of their own, so they open the Fashion tab. */
export function outfitEntries(outfits: readonly FashionOutfit[] | undefined): SearchEntry[] {
  return (outfits ?? []).map((outfit) => ({
    key: `outfits:${outfit.id}`,
    group: 'outfits',
    title: outfit.name,
    subtitle: joinParts(outfit.occasion, outfit.vibe) || null,
    extras: texts(outfit.notes),
    meta: null,
    route: { pathname: '/fashion' },
  }));
}

export function mealEntries(meals: readonly Meal[], t: T): SearchEntry[] {
  return meals.map((meal) => ({
    key: `meals:${meal.id}`,
    group: 'meals',
    title: meal.foodName,
    subtitle: joinParts(t(`item.${meal.mealType}`), formatDay(meal.date)),
    extras: texts(meal.notes, meal.quantity ? `${Number(meal.quantity)}${meal.unit ? ` ${meal.unit}` : ''}` : null),
    meta: typeof meal.calories === 'number' ? t('item.calories', { value: Math.round(meal.calories) }) : null,
    route: { pathname: '/food/meal', params: { meal: json(meal) } },
  }));
}

/** Workouts open the workout editor; measurements and goals open the entry form, as in the Fitness log. */
export function fitnessEntries(entries: readonly FitnessEntry[] | undefined, t: T): SearchEntry[] {
  return (entries ?? []).map((entry) => {
    const isWorkout = entry.type === 'workout';
    const named = typeof entry.metadata?.name === 'string' ? entry.metadata.name.trim() : '';
    const title = isWorkout
      ? named || sentence(entry.workoutType || t('item.workout'))
      : entry.type === 'measurement'
        ? sentence((entry.measurementType ?? t('item.measurement')).replace(/_/g, ' '))
        : entry.type === 'goal'
          ? t('item.goal')
          : t('item.entry');
    const value =
      entry.measurementValue !== null && entry.measurementValue !== undefined
        ? `${Number(entry.measurementValue)}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}`
        : null;
    return {
      key: `fitness:${entry.id}`,
      group: 'fitness',
      title,
      subtitle: joinParts(formatDay(entry.date), isWorkout ? (entry.duration ? duration(entry.duration, t) : null) : value),
      extras: texts(entry.notes, entry.mood, entry.workoutType, entry.intensity, (entry.exercises ?? []).map((exercise) => exercise.name)),
      meta: null,
      route: isWorkout ? { pathname: '/fitness/workout', params: { entry: json(entry) } } : { pathname: '/fitness/entry', params: { entry: json(entry) } },
    };
  });
}

/** The Skincare tab handles products inline, so they open that tab. */
export function productEntries(products: readonly SkincareProduct[] | undefined): SearchEntry[] {
  return (products ?? []).map((product) => ({
    key: `products:${product.id}`,
    group: 'products',
    title: product.productName,
    subtitle: joinParts(product.brand, product.category) || null,
    extras: texts(product.notes, product.bodyPart, product.routineTime, product.status),
    meta: null,
    route: { pathname: '/skincare' },
  }));
}

export function timeLogEntries(logs: readonly TimeLog[], t: T): SearchEntry[] {
  return logs.map((log) => ({
    key: `timeLogs:${log.id}`,
    group: 'timeLogs',
    title: log.activity,
    subtitle: joinParts(log.category, formatDay(log.date)),
    extras: texts(log.description),
    meta: duration(log.duration, t),
    route: { pathname: '/time/log', params: { log: json(log) } },
  }));
}
