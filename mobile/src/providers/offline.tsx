import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { api, apiSession } from '@/lib/api';
import { getNetInfo, isOnline } from '@/lib/offline/network';
import * as queue from '@/lib/offline/queue';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { useAuth } from '@/providers/auth';

/**
 * Offline mode for the phone app:
 *  - screens you have seen stay readable with no signal (their data is saved on the phone, per user);
 *  - creating an expense, workout, meal, time log or note offline is saved on the phone and sent when you're back online.
 * The queue itself is lib/offline/queue.ts; this file connects it to the network, the signed-in user and React Query.
 */

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = (userId: string) => `aura.queryCache.${userId}`;
const REPLAY_EVERY_MS = 45_000;

// ids only need to be unique on this phone, so the queue's built-in generator is enough (no native module needed)
queue.configureQueue({ storage: AsyncStorage });

// React Native has no browser online/offline events: tell React Query about the network (once)
let networkWired = false;
function wireNetwork() {
  if (networkWired) return;
  networkWired = true;
  const NetInfo = getNetInfo();
  if (!NetInfo) return; // not in this build: assume online, and rely on failed requests (see lib/offline/network.ts)
  onlineManager.setEventListener((setOnline) => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(isOnline(state));
      void queue.setOnline(isOnline(state));
    });
    return unsubscribe;
  });
}

/** Sends one queued request. skipQueue: if it fails again it must fail, not be queued a second time. */
const send = (path: string, body: unknown) => api(path, { method: 'POST', body, skipQueue: true });

/** "Sync now": send everything waiting for the signed-in user. */
export function syncNow() {
  return queue.replay(send);
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const { pending, online } = useOfflineSnapshot();
  const previousUser = useRef<string | null>(null);

  // Network state + hand failed creates to the queue
  useEffect(() => {
    wireNetwork();
    void getNetInfo()?.fetch().then((state) => queue.setOnline(isOnline(state)));

    apiSession.setOfflineHandler(async (path, options) => {
      if (!queue.isQueueable(options.method, path)) return { handled: false };
      const reply = await queue.enqueue(path, options.body);
      return reply === null ? { handled: false } : { handled: true, value: reply };
    });
    return () => apiSession.setOfflineHandler(null);
  }, []);

  // Whose entries to show and send
  useEffect(() => {
    void queue.setCurrentUser(userId).then(() => {
      if (userId) void syncNow();
    });
  }, [userId]);

  // After entries were sent: refresh the screens and say what happened
  useEffect(
    () =>
      queue.onReplayResult((result) => {
        if (result.sent > 0) {
          void queryClient.invalidateQueries();
          void queue.flashNotice(`Synced ${result.sent} offline ${result.sent === 1 ? 'entry' : 'entries'}`);
        } else if (result.failed > 0) {
          void queue.flashNotice(`${result.failed} ${result.failed === 1 ? 'entry' : 'entries'} couldn't be saved`);
        } else if (result.authRequired) {
          void queue.flashNotice('Sign in again to finish syncing');
        }
      }),
    [queryClient],
  );

  // When to try sending: connection comes back, app returns to the foreground, and every so often while something waits
  useEffect(() => {
    if (online && pending > 0) void syncNow();
  }, [online, pending]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!online || pending === 0) return;
    const timer = setInterval(() => void syncNow(), REPLAY_EVERY_MS);
    return () => clearInterval(timer);
  }, [online, pending]);

  // Keep a copy of each screen's data on the phone (per user), restored on the next launch even with no signal
  useEffect(() => {
    if (!userId) {
      // signed out: remove the saved copy
      if (previousUser.current) void AsyncStorage.removeItem(CACHE_KEY(previousUser.current));
      previousUser.current = null;
      return;
    }
    previousUser.current = userId;

    const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: CACHE_KEY(userId), throttleTime: 2000 });
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: CACHE_MAX_AGE_MS,
      buster: 'v1',
      dehydrateOptions: {
        // only finished results; the AI chat is streamed and not worth keeping
        shouldDehydrateQuery: (query) => query.state.status === 'success' && query.queryKey[0] !== 'ai',
      },
    });
    return unsubscribe;
  }, [userId, queryClient]);

  return <>{children}</>;
}
