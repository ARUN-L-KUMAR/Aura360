import type { EventMap, EventName } from './events';

/**
 * Pure telemetry core (no React Native imports, so it is unit-tested under plain Node). `index.ts` wires it to
 * AsyncStorage. Nothing is sent unless (a) the user has opted in and (b) an adapter is registered. The app ships with
 * no vendor adapter: add Sentry / Firebase / PostHog by implementing `TelemetryAdapter` and calling `addAdapter`.
 */
export interface TelemetryAdapter {
  name: string;
  track?(event: string, props?: Record<string, unknown>): void;
  screen?(name: string): void;
  captureException?(error: unknown, context?: Record<string, unknown>): void;
  /** Called with an opaque id (never an email or name). `null` on sign-out. */
  identify?(userId: string | null): void;
}

export interface ConsentStorage {
  get(): Promise<boolean | null>;
  set(enabled: boolean): Promise<void>;
}

export function createTelemetry(storage: ConsentStorage, options: { logToConsole?: boolean } = {}) {
  const adapters = new Set<TelemetryAdapter>();
  let enabled = false;
  let ready = false;

  const each = (fn: (adapter: TelemetryAdapter) => void) => {
    for (const adapter of adapters) {
      try {
        fn(adapter);
      } catch {
        // A faulty vendor SDK must never break the app.
      }
    }
  };
  const log = (...args: unknown[]) => {
    if (options.logToConsole) console.log('[telemetry]', ...args);
  };

  const load = storage
    .get()
    .then((value) => {
      enabled = value === true;
    })
    .catch(() => {})
    .finally(() => {
      ready = true;
    });

  return {
    /** Resolves once the stored consent has been read. */
    ready: () => load,
    isReady: () => ready,
    isEnabled: () => enabled,
    async setEnabled(value: boolean) {
      enabled = value;
      await storage.set(value).catch(() => {});
    },
    addAdapter(adapter: TelemetryAdapter) {
      adapters.add(adapter);
      return () => adapters.delete(adapter);
    },
    track<E extends EventName>(event: E, ...props: EventMap[E] extends Record<string, never> ? [] : [EventMap[E]]) {
      log('track', event, props[0] ?? '');
      if (!enabled) return;
      each((a) => a.track?.(event, props[0] as Record<string, unknown> | undefined));
    },
    screen(name: string) {
      log('screen', name);
      if (!enabled) return;
      each((a) => a.screen?.(name));
    },
    /** Crashes and handled errors. Uses the same opt-in as analytics. */
    captureException(error: unknown, context?: Record<string, unknown>) {
      log('exception', error instanceof Error ? error.message : String(error), context ?? '');
      if (!enabled) return;
      each((a) => a.captureException?.(error, context));
    },
    identify(userId: string | null) {
      if (!enabled) return;
      each((a) => a.identify?.(userId));
    },
  };
}

export type Telemetry = ReturnType<typeof createTelemetry>;
