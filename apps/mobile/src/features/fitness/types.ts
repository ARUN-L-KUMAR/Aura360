import { i18n } from '@/i18n';

export type EntryType = 'workout' | 'measurement' | 'goal';

export type Exercise = { name: string; sets?: number; reps?: number; weight?: number };

export type WorkoutIntensity = 'low' | 'medium' | 'high' | 'extreme';

export type FitnessEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: string;
  workoutType: string | null;
  duration: number | null;
  caloriesBurned: number | null;
  distance: string | null;
  intensity: WorkoutIntensity | string | null;
  measurementType: string | null;
  measurementValue: string | null;
  measurementUnit: string | null;
  exercises: Exercise[] | null;
  notes: string | null;
  mood: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

/** What the API accepts. Optional fields must be omitted, never null (the server schema rejects null). */
export type FitnessInput = {
  date: string;
  type: string;
  workoutType?: string;
  duration?: number;
  caloriesBurned?: number;
  distance?: number;
  intensity?: WorkoutIntensity | string;
  measurementType?: string;
  measurementValue?: number;
  measurementUnit?: string;
  exercises?: Exercise[];
  notes?: string;
  mood?: string;
  metadata?: Record<string, unknown>;
};

/** Alias kept for the workout-card / create-update hooks. */
export type CreateFitnessInput = FitnessInput;

export type Readiness = {
  score: number;
  status: string;
  recommendation: string;
  workoutsLast7Days: number;
  totalMinutesLast7Days: number;
  totalCaloriesLast7Days: number;
};

export type CoachExercise = {
  name: string;
  category?: string;
  sets?: number;
  reps?: string | number;
  restSeconds?: number;
  rpe?: number;
  notes?: string;
};

export type CoachDay = {
  dayNumber: number;
  name: string;
  isRestDay: boolean;
  focus: string;
  targetDurationMinutes: number;
  exercises: CoachExercise[];
};

export type CoachProgram = {
  programName: string;
  goal?: string;
  frequency?: string;
  difficulty?: string;
  weeklyOverview?: string;
  progressiveOverloadTip?: string;
  recoveryStrategy?: string;
  days: CoachDay[];
};

/** The text for a workout kind ("strength" -> "Strength"); kinds the app does not know are capitalised as they came. */
export function workoutTypeLabel(kind: string): string {
  const key = kind.trim().toLowerCase();
  if (isWorkoutTypeKey(key)) return i18n.t(`fitness:workoutTypes.${key}`);
  return key ? `${key[0].toUpperCase()}${key.slice(1)}` : '';
}

/** A workout's display name: the name the user typed, else its kind (strength, cardio…). */
export function workoutTitle(entry: Pick<FitnessEntry, 'metadata' | 'workoutType' | 'type'>) {
  const name = typeof entry.metadata?.name === 'string' ? entry.metadata.name.trim() : '';
  if (name) return name;
  const kind = (entry.workoutType || entry.type || 'workout').trim();
  if (!kind || kind.toLowerCase() === 'workout') return i18n.t('fitness:workoutTitleGeneric');
  return i18n.t('fitness:workoutTitle', { kind: workoutTypeLabel(kind) });
}

export type Substitution = { name: string; equipment: string; whyItWorks: string };

/** Server values for the kind of workout. The words shown to the user live in the `fitness` catalog (`workoutTypes.*`). */
export const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Walking', 'Running', 'Cycling', 'Sports', 'Other'];
const WORKOUT_TYPE_KEYS = ['strength', 'cardio', 'hiit', 'yoga', 'walking', 'running', 'cycling', 'sports', 'other', 'mobility'] as const;
export type WorkoutTypeKey = (typeof WORKOUT_TYPE_KEYS)[number];
export const isWorkoutTypeKey = (value: string): value is WorkoutTypeKey => (WORKOUT_TYPE_KEYS as readonly string[]).includes(value);

export const INTENSITIES = ['low', 'medium', 'high'];
const INTENSITY_KEYS = ['low', 'medium', 'high', 'extreme'] as const;
type IntensityKey = (typeof INTENSITY_KEYS)[number];
export const intensityLabel = (value: string): string => {
  const key = value.trim().toLowerCase();
  return (INTENSITY_KEYS as readonly string[]).includes(key) ? i18n.t(`fitness:intensity.${key as IntensityKey}`) : value;
};

/** Server values for how a workout felt. */
export const MOODS = ['Great', 'Good', 'Okay', 'Tired'];
const MOOD_KEYS = ['great', 'good', 'okay', 'tired'] as const;
export const moodLabel = (value: string): string => {
  const key = value.trim().toLowerCase();
  return (MOOD_KEYS as readonly string[]).includes(key) ? i18n.t(`fitness:moods.${key as (typeof MOOD_KEYS)[number]}`) : value;
};

export type MeasurementKey = 'weight' | 'body_fat' | 'waist' | 'chest' | 'arms' | 'thighs';
export const MEASUREMENTS: { value: MeasurementKey; unit: string }[] = [
  { value: 'weight', unit: 'kg' },
  { value: 'body_fat', unit: '%' },
  { value: 'waist', unit: 'cm' },
  { value: 'chest', unit: 'cm' },
  { value: 'arms', unit: 'cm' },
  { value: 'thighs', unit: 'cm' },
];
/** The text for a measurement kind; kinds the app does not know are shown with the underscores removed. */
export const measurementLabel = (value: string): string =>
  MEASUREMENTS.some((m) => m.value === value) ? i18n.t(`fitness:measurements.${value as MeasurementKey}`) : value.replace(/_/g, ' ');

export const COMMON_EXERCISES = [
  'Barbell Bench Press',
  'Incline Dumbbell Press',
  'Overhead Press',
  'Lat Pulldown',
  'Barbell Row',
  'Pull-ups',
  'Barbell Back Squat',
  'Romanian Deadlift',
  'Leg Press',
  'Deadlift',
  'Dumbbell Curl',
  'Tricep Pushdown',
  'Lateral Raise',
  'Plank',
];

/** Values sent to the coach endpoint (English by contract). The words shown to the user come from `coach.goals.*` and friends. */
export const COACH_GOALS = ['Hypertrophy & Muscle Building', 'Strength & Powerlifting', 'Fat Loss & Conditioning', 'General Fitness'];
export const COACH_EQUIPMENT = ['Full Commercial Gym', 'Home Dumbbells', 'Bodyweight Only', 'Resistance Bands'];
export const COACH_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const COACH_GOAL_KEYS: Record<string, 'hypertrophy' | 'strength' | 'fatLoss' | 'general'> = {
  'Hypertrophy & Muscle Building': 'hypertrophy',
  'Strength & Powerlifting': 'strength',
  'Fat Loss & Conditioning': 'fatLoss',
  'General Fitness': 'general',
};
const COACH_EQUIPMENT_KEYS: Record<string, 'gym' | 'dumbbells' | 'bodyweight' | 'bands'> = {
  'Full Commercial Gym': 'gym',
  'Home Dumbbells': 'dumbbells',
  'Bodyweight Only': 'bodyweight',
  'Resistance Bands': 'bands',
};
const COACH_LEVEL_KEYS: Record<string, 'beginner' | 'intermediate' | 'advanced'> = { Beginner: 'beginner', Intermediate: 'intermediate', Advanced: 'advanced' };

export const coachGoalLabel = (value: string): string => (COACH_GOAL_KEYS[value] ? i18n.t(`fitness:coach.goals.${COACH_GOAL_KEYS[value]}`) : value);
export const coachEquipmentLabel = (value: string): string => (COACH_EQUIPMENT_KEYS[value] ? i18n.t(`fitness:coach.equipment.${COACH_EQUIPMENT_KEYS[value]}`) : value);
export const coachLevelLabel = (value: string): string => (COACH_LEVEL_KEYS[value] ? i18n.t(`fitness:coach.levels.${COACH_LEVEL_KEYS[value]}`) : value);
