import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { CoachExercise, Exercise, FitnessInput } from './types';

/**
 * The live workout lives outside React so it survives switching tabs, leaving the screen and
 * backgrounding the app, and is saved to the phone so it survives the app being closed.
 * Timers are derived from timestamps (not counted per second), so they stay right in the background.
 */

export type LiveSet = { id: string; weight: number; reps: number; done: boolean };

export type LiveExercise = {
  id: string;
  name: string;
  category: string;
  restSeconds: number;
  sets: LiveSet[];
};

export type LiveSession = {
  title: string;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  restEndsAt: number | null;
  restTotalSec: number;
  exercises: LiveExercise[];
};

type StoreState = { hydrated: boolean; session: LiveSession | null };

const STORAGE_KEY = 'aura.fitness.liveSession';
const DEFAULT_REST_SECONDS = 90;

let state: StoreState = { hydrated: false, session: null };
const listeners = new Set<() => void>();
let counter = 0;

function emit(next: StoreState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function persist(session: LiveSession | null) {
  const write = session ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)) : AsyncStorage.removeItem(STORAGE_KEY);
  write.catch(() => {
    // Not critical: the session keeps working in memory.
  });
}

function update(change: (session: LiveSession) => LiveSession) {
  if (!state.session) return;
  const next = change(state.session);
  persist(next);
  emit({ ...state, session: next });
}

const newId = () => `${Date.now().toString(36)}-${counter++}`;

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    let saved: LiveSession | null = null;
    try {
      saved = raw ? (JSON.parse(raw) as LiveSession) : null;
    } catch {
      saved = null;
    }
    emit({ hydrated: true, session: saved });
  })
  .catch(() => emit({ hydrated: true, session: null }));

export function useLiveSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export { useNow } from '@/lib/use-now';

// ─── Derived values ───────────────────────────────────────────────────────────

export function elapsedSeconds(session: LiveSession, now: number) {
  const end = session.pausedAt ?? now;
  return Math.max(0, Math.floor((end - session.startedAt - session.pausedTotalMs) / 1000));
}

export function restRemainingSeconds(session: LiveSession, now: number) {
  if (!session.restEndsAt) return null;
  const remaining = Math.ceil((session.restEndsAt - now) / 1000);
  return remaining > 0 ? remaining : 0;
}

export function sessionTotals(session: LiveSession) {
  let doneSets = 0;
  let totalSets = 0;
  let volume = 0;
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      totalSets += 1;
      if (set.done) {
        doneSets += 1;
        volume += set.weight * set.reps;
      }
    }
  }
  return { doneSets, totalSets, volume };
}

/** The API payload for a finished session (the same lossy per-exercise averages the web app saves). */
export function buildWorkoutPayload(session: LiveSession, now: number, date: string): FitnessInput {
  const seconds = elapsedSeconds(session, now);
  const { doneSets, volume } = sessionTotals(session);

  const exercises: Exercise[] = session.exercises
    .filter((ex) => ex.sets.some((set) => set.done))
    .map((ex) => {
      const done = ex.sets.filter((set) => set.done);
      return {
        name: ex.name,
        sets: done.length,
        reps: Math.round(done.reduce((sum, set) => sum + set.reps, 0) / done.length),
        weight: Math.round(done.reduce((sum, set) => sum + set.weight, 0) / done.length),
      };
    });

  return {
    date,
    type: 'workout',
    workoutType: 'strength',
    duration: Math.max(1, Math.round(seconds / 60)),
    caloriesBurned: Math.round((seconds / 60) * 7.5 + doneSets * 4),
    intensity: 'high',
    exercises,
    metadata: { name: session.title },
    notes: `Live session: ${session.title}. Volume ${Math.round(volume).toLocaleString()} kg across ${doneSets} sets.`,
  };
}

// ─── Building exercises ───────────────────────────────────────────────────────

/** "8-10" -> 8, "12 steps/leg" -> 12, 10 -> 10. */
function firstNumber(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

/** Turns a coach/plan exercise into live sets, pre-filled from what you last lifted for it. */
export function buildExercise(seed: CoachExercise, last?: Exercise): LiveExercise {
  const count = seed.sets && seed.sets > 0 ? seed.sets : last?.sets && last.sets > 0 ? last.sets : 3;
  const reps = firstNumber(seed.reps, last?.reps ?? 10);
  const weight = last?.weight ?? 0;
  return {
    id: newId(),
    name: seed.name,
    category: seed.category ?? 'General',
    restSeconds: seed.restSeconds ?? DEFAULT_REST_SECONDS,
    sets: Array.from({ length: count }, () => ({ id: newId(), weight, reps, done: false })),
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export const sessionActions = {
  start(title: string, exercises: LiveExercise[] = []) {
    const session: LiveSession = {
      title,
      startedAt: Date.now(),
      pausedAt: null,
      pausedTotalMs: 0,
      restEndsAt: null,
      restTotalSec: DEFAULT_REST_SECONDS,
      exercises,
    };
    persist(session);
    emit({ ...state, session });
  },

  discard() {
    persist(null);
    emit({ ...state, session: null });
  },

  setTitle(title: string) {
    update((s) => ({ ...s, title }));
  },

  togglePause() {
    update((s) => {
      const now = Date.now();
      return s.pausedAt ? { ...s, pausedAt: null, pausedTotalMs: s.pausedTotalMs + (now - s.pausedAt) } : { ...s, pausedAt: now };
    });
  },

  addExercise(exercise: LiveExercise) {
    update((s) => ({ ...s, exercises: [...s.exercises, exercise] }));
  },

  replaceExercise(id: string, name: string) {
    update((s) => ({ ...s, exercises: s.exercises.map((ex) => (ex.id === id ? { ...ex, name } : ex)) }));
  },

  removeExercise(id: string) {
    update((s) => ({ ...s, exercises: s.exercises.filter((ex) => ex.id !== id) }));
  },

  addSet(exerciseId: string) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { id: newId(), weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false }] };
      }),
    }));
  },

  removeSet(exerciseId: string, index: number) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((_, i) => i !== index) } : ex)),
    }));
  },

  updateSet(exerciseId: string, index: number, patch: Partial<Pick<LiveSet, 'weight' | 'reps'>>) {
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)) } : ex,
      ),
    }));
  },

  /** Marks a set done / not done. Finishing a set starts that exercise's rest timer. Returns true if it started a rest. */
  toggleSet(exerciseId: string, index: number) {
    let startedRest = false;
    update((s) => {
      const exercise = s.exercises.find((ex) => ex.id === exerciseId);
      const becomingDone = exercise ? !exercise.sets[index]?.done : false;
      startedRest = becomingDone;
      return {
        ...s,
        restEndsAt: becomingDone && exercise ? Date.now() + exercise.restSeconds * 1000 : s.restEndsAt,
        restTotalSec: becomingDone && exercise ? exercise.restSeconds : s.restTotalSec,
        exercises: s.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, sets: ex.sets.map((set, i) => (i === index ? { ...set, done: !set.done } : set)) } : ex,
        ),
      };
    });
    return startedRest;
  },

  adjustRest(deltaSeconds: number) {
    update((s) => {
      if (!s.restEndsAt) return s;
      return { ...s, restEndsAt: s.restEndsAt + deltaSeconds * 1000, restTotalSec: Math.max(10, s.restTotalSec + deltaSeconds) };
    });
  },

  skipRest() {
    update((s) => ({ ...s, restEndsAt: null }));
  },
};
