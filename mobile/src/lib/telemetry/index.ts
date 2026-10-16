import AsyncStorage from '@react-native-async-storage/async-storage';

import { createTelemetry } from './core';

export type { EventMap, EventName } from './events';
export type { TelemetryAdapter } from './core';

const CONSENT_KEY = 'aura.telemetry.enabled.v1';

/**
 * The app-wide analytics + crash-reporting hook. Usage:
 *
 * ```ts
 * analytics.track('transaction_created', { type: 'expense' });   // typed: see ./events.ts
 * analytics.captureException(error, { where: 'budget.save' });
 * ```
 *
 * Off until the user opts in (Settings > Privacy). In development every call is also printed to the console.
 */
export const analytics = createTelemetry(
  {
    async get() {
      const raw = await AsyncStorage.getItem(CONSENT_KEY);
      return raw === null ? null : raw === 'true';
    },
    async set(enabled) {
      await AsyncStorage.setItem(CONSENT_KEY, String(enabled));
    },
  },
  { logToConsole: __DEV__ },
);
