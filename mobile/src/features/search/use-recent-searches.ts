import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { addRecent, parseRecent, removeRecent } from './match';

export const RECENT_SEARCHES_KEY = 'aura.search.recent.v1';

/**
 * The user's last searches (max 8, newest first, no duplicates), kept on this device. Updates show immediately and are
 * written in the background; a failed read or write just means the list is not remembered.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);
  // The latest list, so two quick calls build on each other instead of on a stale render.
  const latest = useRef<string[]>([]);
  const touched = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => {
        // If the user already changed the list before the read finished, keep their version.
        if (!alive || touched.current) return;
        latest.current = parseRecent(raw);
        setRecent(latest.current);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const commit = useCallback((next: string[]) => {
    touched.current = true;
    latest.current = next;
    setRecent(next);
    const write = next.length > 0 ? AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)) : AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    write.catch(() => {});
  }, []);

  const add = useCallback((query: string) => commit(addRecent(latest.current, query)), [commit]);
  const remove = useCallback((query: string) => commit(removeRecent(latest.current, query)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);

  return { recent, add, remove, clear };
}
