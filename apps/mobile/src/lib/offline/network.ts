import type { NetInfoState } from '@react-native-community/netinfo';
import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Network detection is optional. `@react-native-community/netinfo` is a native module, so a development build made before
 * it was added doesn't contain it.
 *
 * It must NOT be loaded in that case: when a module throws while loading, Metro does not hand the error to a try/catch,
 * it reports it to React Native's fatal-error handler (a red error in development, a crash in a release build). So we first
 * check that the native side exists, and only then load the JavaScript.
 *
 * Without it the app still works offline: a create that can't reach the server is queued from the failed request itself,
 * and sending is retried when the app returns to the foreground and every 45 seconds while something waits. What is lost
 * is only the instant "connection is back" signal.
 */
type NetInfoModule = typeof import('@react-native-community/netinfo').default;

let cached: NetInfoModule | null | undefined;

/** Does this build contain the native half of netinfo? (checked without throwing, for both architectures) */
function nativeModuleIsPresent(): boolean {
  try {
    return !!(TurboModuleRegistry.get('RNCNetInfo') ?? NativeModules.RNCNetInfo);
  } catch {
    return false;
  }
}

export function getNetInfo(): NetInfoModule | null {
  if (cached !== undefined) return cached;

  if (!nativeModuleIsPresent()) {
    cached = null;
    if (__DEV__) console.log('[offline] netinfo is not in this build; rebuild the development build to get instant reconnect detection.');
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = (require('@react-native-community/netinfo')?.default as NetInfoModule | undefined) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

export const isOnline = (state: NetInfoState) => !!state.isConnected && state.isInternetReachable !== false;
