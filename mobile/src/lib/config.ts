import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

/**
 * Where the Aura360 server lives when the user hasn't chosen one.
 *
 * 1. EXPO_PUBLIC_API_URL (set in mobile/.env) wins.
 * 2. In development the app runs from the laptop's Metro server, so the API is on the same
 *    machine: reuse that host (this makes a real phone on the same Wi-Fi work with no setup).
 * 3. Emulator fallbacks.
 *
 * The user can override all of this on the sign-in screen ("Server"), which is how the app
 * will be pointed at the home server later.
 */
/**
 * The server base is only ever `scheme://host[:port]`. The app adds its own `/api/...` paths, so a pasted address such
 * as `https://example.com/api/health` would otherwise make every request a 404.
 */
export function normaliseServerUrl(value: string): string {
  const trimmed = value.trim();
  let origin = trimmed;
  try {
    origin = new URL(trimmed).origin;
  } catch {
    origin = trimmed.replace(/\/+$/, '');
  }

  // On Android emulator, 'localhost' and '127.0.0.1' refer to the emulator itself, not the host machine.
  // Rewrite to 10.0.2.2 (the host PC loopback alias in Android) so local dev connects reliably:
  if (Platform.OS === 'android' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return origin.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }

  return origin;
}

export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normaliseServerUrl(fromEnv);

  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return `http://${metroHost}:${API_PORT}`;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

/**
 * Every server the app may talk to when the user hasn't chosen one, in order of preference.
 * `EXPO_PUBLIC_API_URLS` is a comma-separated list (e.g. "https://app.example.com,https://base.example.com"); the
 * app uses the first one that answers. Falls back to the single address from defaultApiUrl().
 */
export function defaultApiUrls(): string[] {
  const listed = (process.env.EXPO_PUBLIC_API_URLS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normaliseServerUrl);
  return [...new Set(listed.length ? listed : [defaultApiUrl()])];
}

export const REQUEST_TIMEOUT_MS = 20_000;
export const CURRENCY_SYMBOL = '₹';
