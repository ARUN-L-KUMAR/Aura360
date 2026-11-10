import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * First-run flags. Both live in AsyncStorage and both fail open: a storage error never traps the user in onboarding
 * and never makes the permissions screen reappear on every launch.
 *
 * - onboarding: shown before the first sign-in. The value is also kept in memory and published to subscribers, so the
 *   auth layout reacts the moment the onboarding screen finishes (no round trip through storage, no redirect loop).
 * - permissions: shown once, after the first sign-in.
 */
export const ONBOARDING_DONE_KEY = 'aura.onboarding.done.v1';
export const PERMISSIONS_PROMPTED_KEY = 'aura.permissions.prompted.v1';

// ---------------------------------------------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------------------------------------------

/** null until the stored value has been read. */
let onboardingDone: boolean | null = null;
let loading: Promise<boolean> | null = null;
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

/** Reads the stored flag once. A read error counts as "not done". Never rejects. */
export function loadOnboardingDone(): Promise<boolean> {
  loading ??= AsyncStorage.getItem(ONBOARDING_DONE_KEY)
    .then((value) => value === 'true')
    .catch(() => false)
    .then((stored) => {
      // markOnboardingDone may have run while the read was in flight: done always wins.
      if (onboardingDone === null) {
        onboardingDone = stored;
        emit();
      }
      return onboardingDone === true;
    });
  return loading;
}

/** Marks onboarding as finished, synchronously for this session and then (best effort) on disk. */
export async function markOnboardingDone(): Promise<void> {
  if (onboardingDone !== true) {
    onboardingDone = true;
    emit();
  }
  try {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {
    // Not persisted: onboarding may show again next launch, but never again in this session.
  }
}

/** `null` while the flag is loading (render a plain background), then `true` / `false`. */
export function useOnboardingDone(): boolean | null {
  const value = useSyncExternalStore(
    subscribe,
    () => onboardingDone,
    () => null,
  );
  useEffect(() => {
    if (value === null) void loadOnboardingDone();
  }, [value]);
  return value;
}

// ---------------------------------------------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------------------------------------------

let permissionsClaimed = false;

/**
 * True at most once per app session, and only when the permissions screen has never been shown on this install.
 * A storage error answers false (better to skip the screen than to show it on every launch).
 */
export async function claimPermissionsPrompt(): Promise<boolean> {
  if (permissionsClaimed) return false;
  permissionsClaimed = true;
  try {
    return (await AsyncStorage.getItem(PERMISSIONS_PROMPTED_KEY)) !== 'true';
  } catch {
    return false;
  }
}

export async function markPermissionsPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSIONS_PROMPTED_KEY, 'true');
  } catch {
    // Swallowed: the in-session claim above already prevents a second prompt this launch.
  }
}
