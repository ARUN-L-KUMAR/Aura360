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

/** A workout's display name: the name the user typed, else its kind (strength, cardio…). */
export function workoutTitle(entry: Pick<FitnessEntry, 'metadata' | 'workoutType' | 'type'>) {
  const name = typeof entry.metadata?.name === 'string' ? entry.metadata.name.trim() : '';
  if (name) return name;
  const kind = entry.workoutType || entry.type || 'workout';
  return `${kind[0].toUpperCase()}${kind.slice(1)} workout`;
}

export type Substitution = { name: string; equipment: string; whyItWorks: string };

export const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Walking', 'Running', 'Cycling', 'Sports', 'Other'];
export const INTENSITIES = ['low', 'medium', 'high'];
export const MOODS = ['Great', 'Good', 'Okay', 'Tired'];

export const MEASUREMENTS: { value: string; label: string; unit: string }[] = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'body_fat', label: 'Body fat', unit: '%' },
  { value: 'waist', label: 'Waist', unit: 'cm' },
  { value: 'chest', label: 'Chest', unit: 'cm' },
  { value: 'arms', label: 'Arms', unit: 'cm' },
  { value: 'thighs', label: 'Thighs', unit: 'cm' },
];

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

export const COACH_GOALS = ['Hypertrophy & Muscle Building', 'Strength & Powerlifting', 'Fat Loss & Conditioning', 'General Fitness'];
export const COACH_EQUIPMENT = ['Full Commercial Gym', 'Home Dumbbells', 'Bodyweight Only', 'Resistance Bands'];
export const COACH_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
