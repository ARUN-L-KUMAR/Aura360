import type { Exercise, FitnessEntry, Readiness } from '@/features/fitness/types';
import type { Meal, MealType } from '@/features/food/types';
import type { SkincareProduct } from '@/features/skincare/types';
import type { TimeLog } from '@/features/time/types';

import { daysAgo, isoDaysAgo, isoOf, makeRandom, pad, stamp } from './seed-util';

// ---------------------------------------------------------------------------------------------------------------
// Fitness
// ---------------------------------------------------------------------------------------------------------------

type Template = { name: string; type: string; kind: string; minutes: [number, number]; kcal: [number, number]; lifts?: { name: string; sets: number; reps: number; weight: number }[]; distance?: [number, number] };

const BY_WEEKDAY: Record<number, Template> = {
  1: {
    name: 'Push Day',
    type: 'workout',
    kind: 'Strength',
    minutes: [55, 70],
    kcal: [320, 420],
    lifts: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 60 },
      { name: 'Overhead Press', sets: 3, reps: 10, weight: 35 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 22 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weight: 8 },
      { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25 },
    ],
  },
  2: {
    name: 'Pull Day',
    type: 'workout',
    kind: 'Strength',
    minutes: [55, 65],
    kcal: [300, 400],
    lifts: [
      { name: 'Barbell Row', sets: 4, reps: 8, weight: 55 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 50 },
      { name: 'Pull-ups', sets: 3, reps: 8, weight: 0 },
      { name: 'Dumbbell Curl', sets: 3, reps: 12, weight: 14 },
    ],
  },
  3: { name: 'Easy Run', type: 'workout', kind: 'Running', minutes: [30, 42], kcal: [280, 400], distance: [5, 7.5] },
  4: {
    name: 'Leg Day',
    type: 'workout',
    kind: 'Strength',
    minutes: [60, 75],
    kcal: [380, 480],
    lifts: [
      { name: 'Barbell Back Squat', sets: 4, reps: 6, weight: 80 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weight: 70 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 140 },
    ],
  },
  5: { name: 'HIIT Circuit', type: 'workout', kind: 'HIIT', minutes: [25, 35], kcal: [300, 380] },
  6: { name: 'Morning Yoga', type: 'workout', kind: 'Yoga', minutes: [35, 50], kcal: [120, 180] },
  0: { name: 'Long Walk', type: 'workout', kind: 'Walking', minutes: [40, 60], kcal: [160, 240], distance: [3.5, 5] },
};

const MOODS = ['Great', 'Good', 'Good', 'Okay', 'Tired'];

export function buildFitness(): FitnessEntry[] {
  const r = makeRandom(21);
  const entries: Omit<FitnessEntry, 'id'>[] = [];
  const base = {
    workoutType: null,
    duration: null,
    caloriesBurned: null,
    distance: null,
    intensity: null,
    measurementType: null,
    measurementValue: null,
    measurementUnit: null,
    exercises: null,
    notes: null,
    mood: null,
    metadata: null,
  };

  for (let offset = 0; offset < 200; offset++) {
    const date = daysAgo(offset);
    const iso = isoOf(date);
    const weekday = date.getDay();
    // A four day streak up to today, a rest day before it, then roughly five sessions a week.
    const forced = offset <= 3;
    const rest = offset === 4 || (!forced && (weekday === 0 ? r.chance(0.55) : r.chance(0.14)));
    if (!rest) {
      const t = BY_WEEKDAY[weekday];
      const progress = Math.floor((200 - offset) / 14) * 0.9;
      const exercises: Exercise[] | null = t.lifts
        ? t.lifts.map((lift) => ({ name: lift.name, sets: lift.sets, reps: lift.reps, weight: lift.weight ? Math.round((lift.weight + progress) / 2.5) * 2.5 : 0 }))
        : null;
      entries.push({
        ...base,
        date: iso,
        type: t.type,
        workoutType: t.kind,
        duration: r.between(t.minutes[0], t.minutes[1]),
        caloriesBurned: r.between(t.kcal[0], t.kcal[1], 5),
        distance: t.distance ? (t.distance[0] + r.next() * (t.distance[1] - t.distance[0])).toFixed(1) : null,
        intensity: t.kind === 'HIIT' ? 'high' : t.kind === 'Yoga' || t.kind === 'Walking' ? 'low' : 'medium',
        exercises,
        mood: r.pick(MOODS),
        metadata: { name: t.name },
        createdAt: stamp(iso, 18, r.between(0, 40)),
      });
    }

    if (offset % 7 === 1) {
      entries.push({
        ...base,
        date: iso,
        type: 'measurement',
        measurementType: 'weight',
        measurementValue: (72 + offset * 0.025 + (r.next() - 0.5) * 0.4).toFixed(1),
        measurementUnit: 'kg',
        createdAt: stamp(iso, 7, 5),
      });
    }
    if (offset % 14 === 2) {
      entries.push({ ...base, date: iso, type: 'measurement', measurementType: 'body_fat', measurementValue: (17.6 + offset * 0.012).toFixed(1), measurementUnit: '%', createdAt: stamp(iso, 7, 8) });
      entries.push({ ...base, date: iso, type: 'measurement', measurementType: 'waist', measurementValue: (81.5 + offset * 0.01).toFixed(1), measurementUnit: 'cm', createdAt: stamp(iso, 7, 10) });
    }
  }
  const goalDay = isoDaysAgo(20);
  entries.push({ ...base, date: goalDay, type: 'goal', notes: 'Reach 70 kg and run 10 km by January', createdAt: stamp(goalDay, 9, 0) });

  entries.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  return entries.map((entry, index) => ({ id: `fit-${String(index + 1).padStart(4, '0')}`, ...entry })).reverse();
}

export function buildReadiness(entries: FitnessEntry[]): Readiness {
  const from = isoDaysAgo(6);
  const week = entries.filter((e) => e.type === 'workout' && e.date >= from);
  return {
    score: 78,
    status: 'Optimal Training State',
    recommendation: 'Good recovery between sessions. A moderate lower-body day fits well; keep sleep above seven hours.',
    workoutsLast7Days: week.length,
    totalMinutesLast7Days: week.reduce((sum, e) => sum + (e.duration ?? 0), 0),
    totalCaloriesLast7Days: week.reduce((sum, e) => sum + (e.caloriesBurned ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------------------------------------------

type Dish = { name: string; quantity: string; unit: string; calories: number; protein: number; carbs: number; fats: number; fiber: number; sugar: number };

const DISHES: Record<MealType, Dish[]> = {
  breakfast: [
    { name: 'Oats with banana and almonds', quantity: '1', unit: 'bowl', calories: 380, protein: 14, carbs: 58, fats: 10, fiber: 8, sugar: 14 },
    { name: 'Masala omelette with toast', quantity: '2', unit: 'eggs', calories: 420, protein: 24, carbs: 28, fats: 22, fiber: 3, sugar: 4 },
    { name: 'Poha with peanuts', quantity: '1', unit: 'plate', calories: 340, protein: 8, carbs: 56, fats: 9, fiber: 4, sugar: 3 },
    { name: 'Greek yogurt with berries', quantity: '1', unit: 'cup', calories: 260, protein: 20, carbs: 28, fats: 6, fiber: 4, sugar: 18 },
  ],
  lunch: [
    { name: 'Dal, rice and sabzi', quantity: '1', unit: 'plate', calories: 640, protein: 22, carbs: 98, fats: 16, fiber: 11, sugar: 6 },
    { name: 'Grilled chicken rice bowl', quantity: '1', unit: 'bowl', calories: 620, protein: 48, carbs: 62, fats: 18, fiber: 6, sugar: 5 },
    { name: 'Rajma chawal', quantity: '1', unit: 'plate', calories: 650, protein: 24, carbs: 96, fats: 15, fiber: 14, sugar: 5 },
    { name: 'Paneer wrap', quantity: '1', unit: 'wrap', calories: 540, protein: 26, carbs: 52, fats: 24, fiber: 5, sugar: 4 },
  ],
  snack: [
    { name: 'Roasted chana', quantity: '1', unit: 'cup', calories: 210, protein: 12, carbs: 32, fats: 4, fiber: 9, sugar: 4 },
    { name: 'Whey protein shake', quantity: '1', unit: 'scoop', calories: 160, protein: 28, carbs: 6, fats: 3, fiber: 1, sugar: 3 },
    { name: 'Apple with peanut butter', quantity: '1', unit: 'serving', calories: 230, protein: 6, carbs: 30, fats: 11, fiber: 6, sugar: 20 },
    { name: 'Almonds and walnuts', quantity: '30', unit: 'g', calories: 190, protein: 5, carbs: 6, fats: 17, fiber: 3, sugar: 1 },
  ],
  dinner: [
    { name: 'Chapati with paneer bhurji', quantity: '2', unit: 'chapati', calories: 560, protein: 28, carbs: 52, fats: 26, fiber: 7, sugar: 5 },
    { name: 'Grilled fish with vegetables', quantity: '1', unit: 'plate', calories: 520, protein: 44, carbs: 30, fats: 24, fiber: 8, sugar: 6 },
    { name: 'Moong dal khichdi with curd', quantity: '1', unit: 'bowl', calories: 480, protein: 20, carbs: 72, fats: 12, fiber: 9, sugar: 6 },
    { name: 'Egg curry with rice', quantity: '1', unit: 'plate', calories: 590, protein: 30, carbs: 68, fats: 22, fiber: 5, sugar: 5 },
  ],
};
const MEAL_HOURS: Record<MealType, number> = { breakfast: 8, lunch: 13, snack: 17, dinner: 20 };

export function buildMeals(): Meal[] {
  const r = makeRandom(33);
  const meals: Omit<Meal, 'id'>[] = [];
  const nowHour = new Date().getHours();
  for (let offset = 0; offset < 70; offset++) {
    const iso = isoDaysAgo(offset);
    for (const mealType of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
      if (offset === 0 && MEAL_HOURS[mealType] > nowHour) continue;
      if (mealType === 'snack' && r.chance(0.2)) continue;
      const dish = r.pick(DISHES[mealType]);
      const scale = 0.92 + r.next() * 0.16;
      meals.push({
        date: iso,
        mealType,
        foodName: dish.name,
        quantity: dish.quantity,
        unit: dish.unit,
        calories: Math.round(dish.calories * scale),
        protein: (dish.protein * scale).toFixed(1),
        carbs: (dish.carbs * scale).toFixed(1),
        fats: (dish.fats * scale).toFixed(1),
        fiber: dish.fiber.toFixed(1),
        sugar: dish.sugar.toFixed(1),
        notes: null,
        createdAt: stamp(iso, MEAL_HOURS[mealType], r.between(0, 40)),
      });
    }
  }
  meals.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  return meals.map((meal, index) => ({ id: `meal-${String(index + 1).padStart(4, '0')}`, ...meal })).reverse();
}

// ---------------------------------------------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------------------------------------------

const TIME_PLAN: { activity: string; category: string; minutes: [number, number]; start: number; weekdayOnly?: boolean }[] = [
  { activity: 'Deep work: product roadmap', category: 'Work', minutes: [90, 150], start: 9, weekdayOnly: true },
  { activity: 'Team stand-up and reviews', category: 'Work', minutes: [30, 60], start: 11, weekdayOnly: true },
  { activity: 'Client calls', category: 'Work', minutes: [45, 90], start: 14, weekdayOnly: true },
  { activity: 'Spanish course', category: 'Study', minutes: [30, 45], start: 7 },
  { activity: 'Gym session', category: 'Exercise', minutes: [50, 70], start: 18 },
  { activity: 'Reading', category: 'Personal', minutes: [25, 45], start: 21 },
  { activity: 'Dinner with family', category: 'Social', minutes: [45, 75], start: 20 },
  { activity: 'Power nap', category: 'Rest', minutes: [20, 30], start: 15 },
];

export function buildTimeLogs(): TimeLog[] {
  const r = makeRandom(47);
  const logs: Omit<TimeLog, 'id'>[] = [];
  for (let offset = 0; offset < 70; offset++) {
    const date = daysAgo(offset);
    const iso = isoOf(date);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    for (const plan of TIME_PLAN) {
      if (plan.weekdayOnly && weekend) continue;
      if (offset === 0 && plan.start > new Date().getHours()) continue;
      if (!plan.weekdayOnly && r.chance(0.3)) continue;
      const duration = r.between(plan.minutes[0], plan.minutes[1], 5);
      const end = plan.start * 60 + duration;
      logs.push({
        date: iso,
        activity: plan.activity,
        category: plan.category,
        duration,
        startTime: `${pad(plan.start)}:00`,
        endTime: `${pad(Math.floor(end / 60) % 24)}:${pad(end % 60)}`,
        description: null,
        productivityScore: plan.category === 'Work' ? r.between(6, 9) : null,
        createdAt: stamp(iso, plan.start, 0),
      });
    }
  }
  logs.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  return logs.map((log, index) => ({ id: `time-${String(index + 1).padStart(4, '0')}`, ...log })).reverse();
}

// ---------------------------------------------------------------------------------------------------------------
// Skincare
// ---------------------------------------------------------------------------------------------------------------

export const SKINCARE_PRODUCTS: SkincareProduct[] = [
  { id: 'skin-1', productName: 'Gentle foaming cleanser', brand: 'CeraVe', category: 'Cleanser', bodyPart: 'face', routineTime: 'both', routineOrder: 1, status: 'owned', rating: 5, notes: null },
  { id: 'skin-2', productName: '10% Vitamin C serum', brand: 'Minimalist', category: 'Serum', bodyPart: 'face', routineTime: 'morning', routineOrder: 2, status: 'owned', rating: 4, notes: 'Patch tested' },
  { id: 'skin-3', productName: 'Niacinamide 10% + zinc', brand: 'The Ordinary', category: 'Serum', bodyPart: 'face', routineTime: 'morning', routineOrder: 3, status: 'owned', rating: 4, notes: null },
  { id: 'skin-4', productName: 'Moisturising lotion', brand: 'Cetaphil', category: 'Moisturiser', bodyPart: 'face', routineTime: 'both', routineOrder: 4, status: 'owned', rating: 5, notes: null },
  { id: 'skin-5', productName: 'Sunscreen SPF 50', brand: 'La Roche-Posay', category: 'Sunscreen', bodyPart: 'face', routineTime: 'morning', routineOrder: 5, status: 'owned', rating: 5, notes: null },
  { id: 'skin-6', productName: 'Retinol 0.3%', brand: 'Neutrogena', category: 'Treatment', bodyPart: 'face', routineTime: 'evening', routineOrder: 2, status: 'owned', rating: 4, notes: 'Three nights a week' },
  { id: 'skin-7', productName: 'Salicylic acid exfoliant', brand: 'Paula\'s Choice', category: 'Exfoliant', bodyPart: 'face', routineTime: 'weekly', routineOrder: null, status: 'need_to_buy', rating: null, notes: null },
  { id: 'skin-8', productName: 'Anti-dandruff shampoo', brand: 'Head & Shoulders', category: 'Hair care', bodyPart: 'hair', routineTime: 'optional', routineOrder: null, status: 'owned', rating: 3, notes: null },
];
