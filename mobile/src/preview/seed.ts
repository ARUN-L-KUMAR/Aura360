import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { DEFAULT_SERVER_PREFS, type ServerPrefs } from '@/features/notifications/types';

import { buildBalances, buildBudgets, buildGoals, buildTransactions } from './seed-finance';
import { SKINCARE_PRODUCTS, buildFitness, buildMeals, buildReadiness, buildTimeLogs } from './seed-health';
import { FASHION_ITEMS, FASHION_OUTFITS, FASHION_PROFILE, NOTES, NOTIFICATIONS, SAVED } from './seed-life';
import { isoDaysAgo, monthOf } from './seed-util';
import { PREVIEW_USER } from './mock-user';

/** Everything the sample user has, built once per page load from today's date. */
export function buildSeed() {
  const transactions = buildTransactions();
  const fitness = buildFitness();
  const meals = buildMeals();
  const timeLogs = buildTimeLogs();
  const currentMonth = monthOf(isoDaysAgo(0));

  // Home dashboard: counts, the 7 day activity chart (ending today) and this month's totals.
  const chart = Array.from({ length: 7 }, (_, i) => {
    const date = isoDaysAgo(6 - i);
    const activities =
      transactions.filter((t) => t.date === date).length +
      fitness.filter((f) => f.date === date).length +
      meals.filter((m) => m.date === date).length +
      NOTES.filter((n) => n.createdAt.slice(0, 10) === date).length;
    return { date, activities };
  });
  const month = { income: 0, expense: 0, investment: 0 };
  for (const t of transactions) {
    if (monthOf(t.date) !== currentMonth) continue;
    if (t.type === 'income' || t.type === 'expense' || t.type === 'investment') month[t.type] += Number(t.amount);
  }
  const counts = {
    finance: transactions.length,
    fitness: fitness.length,
    food: meals.length,
    notes: NOTES.length,
    saved: SAVED.length,
    fashion: FASHION_ITEMS.length,
    skincare: SKINCARE_PRODUCTS.length,
    time: timeLogs.length,
  };
  // The `today` block, computed from the same sample data the screens read.
  const todayDate = isoDaysAgo(0);
  const weekFrom = isoDaysAgo(6);
  const sum = (values: (number | string | null | undefined)[]) => values.reduce<number>((total, value) => total + (Number(value) || 0), 0);
  const todaysMeals = meals.filter((m) => m.date === todayDate);
  const weekWorkouts = fitness.filter((f) => f.type === 'workout' && f.date >= weekFrom && f.date <= todayDate);
  const todaysTime = timeLogs.filter((l) => l.date === todayDate);
  const topTime = [...todaysTime].sort((a, b) => b.duration - a.duration)[0];
  const monthBudgets = buildBudgets(transactions, currentMonth, currentMonth).data;
  const today: NonNullable<Dashboard['today']> = {
    date: todayDate,
    food: {
      calories: sum(todaysMeals.map((m) => m.calories)),
      protein: sum(todaysMeals.map((m) => m.protein)),
      carbs: sum(todaysMeals.map((m) => m.carbs)),
      fats: sum(todaysMeals.map((m) => m.fats)),
      meals: todaysMeals.length,
    },
    fitness: {
      minutesToday: sum(weekWorkouts.filter((f) => f.date === todayDate).map((f) => f.duration)),
      minutesWeek: sum(weekWorkouts.map((f) => f.duration)),
      workoutsToday: weekWorkouts.filter((f) => f.date === todayDate).length,
      workoutsWeek: weekWorkouts.length,
      activeDaysWeek: new Set(weekWorkouts.map((f) => f.date)).size,
    },
    time: { minutesToday: sum(todaysTime.map((l) => l.duration)), topCategory: topTime?.category ?? null },
    finance: {
      spentToday: sum(transactions.filter((t) => t.type === 'expense' && t.date === todayDate).map((t) => t.amount)),
      budgetTotal: sum(monthBudgets.map((b) => b.amount)),
      budgetSpent: sum(monthBudgets.map((b) => b.spent)),
      budgetCount: monthBudgets.length,
    },
    pinnedNotes: NOTES.filter((n) => n.isPinned && !n.isArchived)
      .slice(0, 3)
      .map((n) => {
        const checklist = Array.isArray(n.metadata?.checklist) ? (n.metadata.checklist as { completed?: boolean }[]) : null;
        return {
          ...n,
          preview: (n.content ?? '').slice(0, 140),
          checklistDone: checklist ? checklist.filter((item) => item.completed).length : null,
          checklistTotal: checklist ? checklist.length : null,
        };
      }),
  };
  const dashboard: Dashboard = {
    profile: { name: PREVIEW_USER.name, image: null },
    totalActivities: chart.reduce((sum, point) => sum + point.activities, 0),
    counts,
    chart,
    month,
    recentTransactions: [...transactions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    today,
  };

  const prefs: ServerPrefs = {
    ...DEFAULT_SERVER_PREFS,
    workout: { ...DEFAULT_SERVER_PREFS.workout, enabled: true },
    meals: { ...DEFAULT_SERVER_PREFS.meals, enabled: true },
    skincare: { ...DEFAULT_SERVER_PREFS.skincare, enabled: true },
  };

  return {
    currentMonth,
    dashboard,
    transactions,
    balances: buildBalances(),
    budgetsFor: (monthKey: string) => buildBudgets(transactions, currentMonth, monthKey),
    goals: buildGoals(),
    fitness,
    readiness: buildReadiness(fitness),
    meals,
    timeLogs,
    notes: NOTES,
    saved: SAVED,
    fashionItems: FASHION_ITEMS,
    fashionOutfits: FASHION_OUTFITS,
    fashionProfile: FASHION_PROFILE,
    skincare: SKINCARE_PRODUCTS,
    inbox: { notifications: NOTIFICATIONS, unreadCount: NOTIFICATIONS.filter((n) => !n.isRead).length },
    prefs: { prefs, devices: 1 },
  };
}

export type PreviewSeed = ReturnType<typeof buildSeed>;
