import { MutationCache, QueryCache, QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError } from '@/lib/api';
import { analytics } from '@/lib/telemetry';
import { isExpectedFailure } from '@/lib/telemetry/expected';

/** Report only failures that point at a bug or a server outage: being offline, timeouts and 4xx are expected. */
function report(error: unknown, where: string) {
  if (isExpectedFailure(error)) return;
  analytics.captureException(error, { where });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: (error) => report(error, 'query') }),
        mutationCache: new MutationCache({ onError: (error) => report(error, 'mutation') }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Also how long a saved copy of a screen's data is kept on the phone (see providers/offline.tsx)
            gcTime: 7 * 24 * 60 * 60 * 1000,
            retry: (failureCount, error) => {
              // Don't hammer the server when the request itself is wrong or we're signed out.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
              return failureCount < 2;
            },
          },
          // Without this an edit made offline would wait forever. Instead it fails right away (creates are queued
          // by the offline queue; anything else shows the usual "can't reach the server" error).
          mutations: { networkMode: 'always' },
        },
      }),
  );

  // Refetch stale data when the app comes back to the foreground (React Native has no window focus).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
