/**
 * Which mascot the user picked for Aura, shared across every place the mascot is shown (the floating bubble,
 * the sheet header, settings) without prop-drilling. Lives in AsyncStorage; fails open to the default mascot.
 *
 * THIS FILE EXISTS TWICE: here (mobile) and in apps/web/lib/ai/mascot/selection.ts. The storage mechanism
 * differs (AsyncStorage vs localStorage), but the shape and behaviour should match.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { DEFAULT_MASCOT, isMascotId, type MascotId } from './characters';

const STORAGE_KEY = 'aura.mascot.id.v1';

let current: MascotId = DEFAULT_MASCOT;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reads the stored mascot once. A read error or missing value keeps the default. Never rejects. */
function load(): Promise<void> {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      if (isMascotId(stored)) current = stored;
    })
    .catch(() => {})
    .then(() => {
      loaded = true;
      emit();
    });
  return loading;
}

export function setMascot(id: MascotId): void {
  current = id;
  loaded = true;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {
    // Not persisted: the choice still applies for the rest of this session.
  });
}

/** The selected mascot, and a setter. Starts at the default until the stored value has loaded. */
export function useMascot(): [MascotId, (id: MascotId) => void] {
  const id = useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_MASCOT,
  );
  useEffect(() => {
    if (!loaded) void load();
  }, []);
  return [id, setMascot];
}
