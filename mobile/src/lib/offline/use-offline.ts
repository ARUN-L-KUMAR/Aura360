import { useSyncExternalStore } from 'react';

import { getSnapshot, subscribe, type OfflineSnapshot } from '@/lib/offline/queue';

/** What the offline queue is doing right now: online or not, how many entries wait, which were rejected. */
export function useOfflineSnapshot(): OfflineSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
