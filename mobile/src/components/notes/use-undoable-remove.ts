import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatest } from '@/components/ui/bottom-sheet';
import { useNotify } from '@/providers/notify';

/** How long the Undo toast stays up. The real delete runs just after it closes. */
const UNDO_MS = 6000;
const GRACE_MS = 300;

type Options = {
  /** The real delete. Called only once the Undo toast has closed without Undo (or when the screen goes away). */
  commit: (id: string) => Promise<unknown>;
  /** Toast text, e.g. `Note deleted`. */
  message: string;
};

/**
 * Deferred delete with Undo: `remove(id)` hides the row straight away and shows an Undo toast. If the user taps Undo
 * the row simply comes back and nothing was sent; otherwise `commit` runs when the toast closes. A delete still pending
 * when the screen unmounts is committed immediately, and a failed commit brings the row back with an error toast.
 */
export function useUndoableRemove({ commit, message }: Options) {
  const notify = useNotify();
  const commitRef = useLatest(commit);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const unhide = useCallback((id: string) => {
    setHiddenIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const run = useCallback(
    async (id: string) => {
      timers.current.delete(id);
      try {
        await commitRef.current(id);
      } catch (e) {
        unhide(id);
        notify.error(e);
      }
    },
    [commitRef, notify, unhide],
  );

  const remove = useCallback(
    (id: string) => {
      if (timers.current.has(id)) return;
      setHiddenIds((current) => new Set(current).add(id));
      timers.current.set(
        id,
        setTimeout(() => void run(id), UNDO_MS + GRACE_MS),
      );
      notify.toast({
        message,
        severity: 'info',
        duration: UNDO_MS,
        action: {
          label: 'Undo',
          onPress: () => {
            const timer = timers.current.get(id);
            if (timer === undefined) return; // already sent
            clearTimeout(timer);
            timers.current.delete(id);
            unhide(id);
          },
        },
      });
    },
    [message, notify, run, unhide],
  );

  // Leaving the screen with a delete still waiting: send it now rather than silently dropping it.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void run(id);
      }
      pending.clear();
    };
  }, [run]);

  return { hiddenIds, remove };
}
