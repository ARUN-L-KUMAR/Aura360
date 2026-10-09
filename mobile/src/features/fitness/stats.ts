import type { Exercise, FitnessEntry } from './types';

export const isWorkout = (entry: FitnessEntry) => entry.type === 'workout';

/** Total kg lifted: sets x reps x weight, per exercise (same formula as the web app). */
export function volumeOf(exercises: Exercise[] | null | undefined) {
  if (!Array.isArray(exercises)) return 0;
  return exercises.reduce((total, ex) => total + (ex.sets || 1) * (ex.reps || 1) * (ex.weight || 0), 0);
}

export function summarise(entries: FitnessEntry[]) {
  const workouts = entries.filter(isWorkout);
  return {
    count: workouts.length,
    minutes: workouts.reduce((sum, e) => sum + (e.duration || 0), 0),
    calories: workouts.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0),
    volume: workouts.reduce((sum, e) => sum + volumeOf(e.exercises), 0),
  };
}

/** Epley estimate of the one-rep max. */
export function estimateOneRepMax(weight: number, reps: number) {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/** Monday-first flags: which days of the current week have at least one workout. */
export function weekCompletion(entries: FitnessEntry[], today = new Date()) {
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const done = new Set(entries.filter(isWorkout).map((e) => e.date.slice(0, 10)));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { iso, done: done.has(iso), isToday: i === mondayOffset, isFuture: i > mondayOffset };
  });
}

/**
 * Last weight/reps/sets logged for each exercise name (case-insensitive), from the newest entry.
 * `entries` must be newest first (the API order).
 */
export function lastPerformanceByExercise(entries: FitnessEntry[]) {
  const latest = new Map<string, Exercise>();
  for (const entry of entries) {
    if (!isWorkout(entry) || !Array.isArray(entry.exercises)) continue;
    for (const ex of entry.exercises) {
      const key = ex.name.trim().toLowerCase();
      if (key && !latest.has(key)) latest.set(key, ex);
    }
  }
  return latest;
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
