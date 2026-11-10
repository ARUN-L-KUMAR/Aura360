import { useSyncExternalStore } from 'react';

import { getSnapshot, subscribe, type InboxSnapshot } from './inbox';

/** The shared screenshots waiting to be imported, live. */
export function useShareInbox(): InboxSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
