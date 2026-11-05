/**
 * Pure helpers for the "Today" part of Home: how far each goal ring is, and which next steps are worth suggesting.
 * No React, no app imports, so it runs under plain Node (tests/home-today.test.ts). It only reads what
 * `/api/mobile/dashboard` returns in `today`; nothing is invented.
 */

export type TodayInput = {
  food: { meals: number };
  fitness: { minutesWeek: number; workoutsToday: number };
  time: { minutesToday: number };
  finance: { spentToday: number; budgetTotal: number; budgetSpent: number; budgetCount: number };
};

/** Progress towards a goal as a fraction (1 = reached, above 1 = past it). 0 for a missing or zero goal. */
export function fractionOf(value: number, goal: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(goal) || goal <= 0 || value <= 0) return 0;
  return value / goal;
}

/** Whole-number percent of `fractionOf`, uncapped (110 means 10% over). */
export function percentOf(value: number, goal: number): number {
  return Math.round(fractionOf(value, goal) * 100);
}

/** Share of this month's budgets already spent, or null when no budget is set (so the UI can say so instead of 0%). */
export function budgetPercent(finance: Pick<TodayInput['finance'], 'budgetTotal' | 'budgetSpent' | 'budgetCount'>): number | null {
  if (finance.budgetCount <= 0 || finance.budgetTotal <= 0) return null;
  return percentOf(finance.budgetSpent, finance.budgetTotal);
}

export type NextAction = 'logMeal' | 'workout' | 'startTimer' | 'logSpending';

/**
 * Up to three suggestions for the moment: a meal that has not been logged, a workout when the week's minutes are short,
 * a timer when no time has been tracked, and the day's spending in the evening. Each one disappears once it is done.
 */
export function nextActions(
  today: TodayInput,
  options: { hour: number; timerRunning: boolean; weeklyGoalMinutes: number; /** Only these may be suggested (the modules kept on Home). All by default. */ allowed?: readonly NextAction[] },
): NextAction[] {
  const { hour, timerRunning, weeklyGoalMinutes, allowed } = options;
  const list: NextAction[] = [];
  if ((today.food.meals === 0 && hour >= 8 && hour < 22) || (today.food.meals === 1 && hour >= 14 && hour < 22)) list.push('logMeal');
  if (today.fitness.workoutsToday === 0 && today.fitness.minutesWeek < weeklyGoalMinutes && hour >= 6 && hour < 21) list.push('workout');
  if (!timerRunning && today.time.minutesToday === 0 && hour >= 8 && hour < 20) list.push('startTimer');
  if (today.finance.spentToday === 0 && hour >= 18) list.push('logSpending');
  return list.filter((action) => !allowed || allowed.includes(action)).slice(0, 3);
}

/** "1h 20m" / "45m" / "2h" for a number of minutes. Units come from the caller so they can be translated. */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  const safe = Number.isFinite(total) && total > 0 ? Math.round(total) : 0;
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export type DayScore = {
  /** Average progress of the goals that apply, 0-100 (a goal past its target counts as done). */
  percent: number;
  /** How many goals are reached (at 100 percent or more). */
  closed: number;
  /** How many goals count: three, or two when no budget is set. */
  total: number;
};

/**
 * The single "day score" on Home: the average of calories against the daily target, active minutes against the weekly
 * goal and the share of the budget used. Without a budget the score is the average of the other two. Each goal is
 * capped at 100 so one overshoot cannot hide the others.
 */
export function dayScore(input: {
  calories: number;
  calorieTarget: number;
  minutesWeek: number;
  weeklyGoalMinutes: number;
  budget: number | null;
  /** Which goals count. All three by default; Home passes only those whose module the person keeps on Home. */
  goals?: { calories: boolean; move: boolean; budget: boolean };
}): DayScore {
  const goals = input.goals ?? { calories: true, move: true, budget: true };
  const parts: number[] = [];
  if (goals.calories) parts.push(percentOf(input.calories, input.calorieTarget));
  if (goals.move) parts.push(percentOf(input.minutesWeek, input.weeklyGoalMinutes));
  if (goals.budget && input.budget !== null) parts.push(input.budget);
  if (parts.length === 0) return { percent: 0, closed: 0, total: 0 };
  const capped = parts.map((p) => Math.min(100, p));
  return {
    percent: Math.round(capped.reduce((a, b) => a + b, 0) / capped.length),
    closed: capped.filter((p) => p >= 100).length,
    total: capped.length,
  };
}
