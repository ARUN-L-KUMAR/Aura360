import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

import {
  applyPreset,
  DEFAULT_LAYOUT,
  HOME_LAYOUT_KEY,
  markCustomized,
  moveModule,
  normalizeLayout,
  setSection,
  toggleModule,
  type HomeLayout,
  type HomeModule,
  type HomePresetId,
  type HomeSection,
} from './layout';

/**
 * The Home layout lives on the phone: the server has no per-person dashboard setting, so the choice is per device (the
 * customize screen says so). One shared store keeps Home and the customize screen in step, and every change is saved at
 * once. `ready` turns true once the saved choice has been read, so Home can wait for it instead of flashing the default.
 */
let current: HomeLayout = DEFAULT_LAYOUT;
let started = false;
let ready = false;
/** The person changed the layout before the saved one was read: their change wins over what was stored. */
let touched = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function load() {
  if (started) return;
  started = true;
  AsyncStorage.getItem(HOME_LAYOUT_KEY)
    .then((raw) => {
      if (!raw || touched) return;
      try {
        current = normalizeLayout(JSON.parse(raw));
      } catch {
        // A corrupt value just means the default stays.
      }
    })
    .catch(() => {})
    .finally(() => {
      ready = true;
      notify();
    });
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getLayout = () => current;
const getReady = () => ready;

function commit(next: HomeLayout) {
  if (next === current) return;
  touched = true;
  current = next;
  notify();
  AsyncStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next)).catch(() => {
    // Not critical: the choice stays for this session.
  });
}

export function useHomeLayout() {
  const layout = useSyncExternalStore(subscribe, getLayout, getLayout);
  const loaded = useSyncExternalStore(subscribe, getReady, getReady);

  const toggle = useCallback((module: HomeModule) => commit(toggleModule(current, module)), []);
  const move = useCallback((module: HomeModule, delta: -1 | 1) => commit(moveModule(current, module, delta)), []);
  const section = useCallback((name: HomeSection, on: boolean) => commit(setSection(current, name, on)), []);
  const preset = useCallback((id: HomePresetId) => commit(applyPreset(current, id)), []);
  /** "Keep everything": remember the choice was seen, change nothing. */
  const keepAll = useCallback(() => commit(markCustomized(current)), []);
  const reset = useCallback(() => commit({ ...DEFAULT_LAYOUT, customized: true }), []);

  return { layout, ready: loaded, toggle, move, section, preset, keepAll, reset };
}
