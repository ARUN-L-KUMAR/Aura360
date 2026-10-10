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
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normaliseServerUrl(fromEnv);

  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return `http://${metroHost}:${API_PORT}`;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const REQUEST_TIMEOUT_MS = 20_000;
export const CURRENCY_SYMBOL = '₹';
