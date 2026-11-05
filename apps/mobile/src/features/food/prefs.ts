import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_TARGETS, type MacroTargets } from './types';

/**
 * Daily targets and water intake live on the phone. The server has no table for them (the web app
 * keeps water in memory only), so they are per-device for now.
 */
const TARGETS_KEY = 'aura.food.targets';
const waterKey = (day: string) => `aura.food.water.${day}`;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not critical: the value stays in memory for this session.
  }
}

export function useTargets() {
  const [targets, setTargetsState] = useState<MacroTargets>(DEFAULT_TARGETS);

  useEffect(() => {
    let cancelled = false;
    readJson<Partial<MacroTargets>>(TARGETS_KEY).then((saved) => {
      if (!cancelled && saved) setTargetsState({ ...DEFAULT_TARGETS, ...saved });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTargets = useCallback(async (next: MacroTargets) => {
    setTargetsState(next);
    await writeJson(TARGETS_KEY, next);
  }, []);

  return { targets, setTargets };
}

export function useWater(day: string) {
  // The amount is stored together with the day it belongs to, so switching days never shows
  // yesterday's number while today's is still loading.
  const [entry, setEntry] = useState<{ day: string; ml: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    readJson<number>(waterKey(day)).then((saved) => {
      if (!cancelled && typeof saved === 'number') setEntry({ day, ml: saved });
    });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const waterMl = entry?.day === day ? entry.ml : 0;

  const addWater = useCallback(
    (ml: number) => {
      setEntry((current) => {
        const next = Math.max(0, (current?.day === day ? current.ml : 0) + ml);
        void writeJson(waterKey(day), next);
        return { day, ml: next };
      });
    },
    [day],
  );

  return { waterMl, addWater };
}
