export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Meal = {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  quantity: string | null;
  unit: string | null;
  calories: number | null;
  protein: string | null;
  carbs: string | null;
  fats: string | null;
  fiber: string | null;
  sugar: string | null;
  notes: string | null;
  createdAt: string;
};

/** What the API accepts. Optional numbers must be omitted, never null (the server schema rejects null). */
export type MealInput = {
  date: string;
  mealType: MealType;
  foodName: string;
  quantity?: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
  notes?: string;
};

export type ParsedMealItem = {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
};

export type ParsedMeal = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  summary: string;
  items: ParsedMealItem[];
};

export type MacroTargets = { calories: number; protein: number; carbs: number; fats: number; waterMl: number };

/** Same defaults as the web app. */
export const DEFAULT_TARGETS: MacroTargets = { calories: 2200, protein: 160, carbs: 230, fats: 65, waterMl: 2500 };

export const MEAL_TYPES: { value: MealType; label: string; icon: 'cafe-outline' | 'sunny-outline' | 'moon-outline' | 'nutrition-outline' }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { value: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { value: 'snack', label: 'Snacks', icon: 'nutrition-outline' },
];

export type MealTotals = { calories: number; protein: number; carbs: number; fats: number };

export function sumMeals(meals: Meal[]): MealTotals {
  return meals.reduce<MealTotals>(
    (total, meal) => ({
      calories: total.calories + (Number(meal.calories) || 0),
      protein: total.protein + (Number(meal.protein) || 0),
      carbs: total.carbs + (Number(meal.carbs) || 0),
      fats: total.fats + (Number(meal.fats) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

/** The meal slot that fits the time of day, used as the default when logging. */
export function suggestMealType(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
}
