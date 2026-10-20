import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

import { assignSlot, DEFAULT_SLOTS, normalizeSlots, type PinnableModule, type SlotIndex, type TabSlots } from './slots';

/**
 * The pinned bottom-bar modules live on the phone: the server has no per-user preference for them, so they are per
 * device (the settings screen says so). One shared store keeps the bar, the More sheet and Settings in step.
 */
const KEY = 'aura.nav.slots';

let current: TabSlots = DEFAULT_SLOTS;
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: TabSlots) {
  current = next;
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      try {
        emit(normalizeSlots(JSON.parse(raw)));
      } catch {
        // A corrupt value just means the defaults stay.
      }
    })
    .catch(() => {});
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => current;

function persist(next: TabSlots) {
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
    // Not critical: the choice stays for this session.
  });
}

export function useTabSlots() {
  const slots = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setSlot = useCallback((index: SlotIndex, module: PinnableModule) => {
    const next = assignSlot(current, index, module);
    if (next === current) return;
    emit(next);
    persist(next);
  }, []);

  const reset = useCallback(() => {
    emit(DEFAULT_SLOTS);
    persist(DEFAULT_SLOTS);
  }, []);

  return { slots, setSlot, reset };
}
