import { useCallback, useEffect, useRef, useState } from 'react';

import { useLatest } from '@/components/ui/bottom-sheet';
import { useNotify } from '@/providers/notify';

/** How long the Undo toast stays up. The real delete runs when it closes. */
const UNDO_MS = 6000;

type Options = {
  /** The real delete. Called only once the Undo toast has closed without Undo (or when the screen goes away). */
  commit: (id: string) => Promise<unknown>;
  /** Toast text, e.g. `Note deleted`. */
  message: string;
};

/**
 * Deferred delete with Undo: `remove(id)` hides the row straight away and shows an Undo toast. If the user taps Undo
 * the row simply comes back and nothing was sent; otherwise `commit` runs the moment the toast closes (timeout, swipe
 * or close). A delete still pending when the screen unmounts is committed immediately, and a failed commit brings the
 * row back with an error toast.
 */
export function useUndoableRemove({ commit, message }: Options) {
  const notify = useNotify();
  const commitRef = useLatest(commit);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  /** Ids hidden and waiting for either Undo or the toast closing. */
  const pending = useRef(new Set<string>());

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
      if (pending.current.has(id)) return;
      pending.current.add(id);
      setHiddenIds((current) => new Set(current).add(id));
      notify.toast({
        message,
        severity: 'info',
        duration: UNDO_MS,
        action: {
          label: 'Undo',
          onPress: () => {
            if (pending.current.delete(id)) unhide(id);
          },
        },
        // Runs after Undo too, but then the id is no longer pending and nothing is sent.
        onClose: () => {
          if (pending.current.delete(id)) void run(id);
        },
      });
    },
    [message, notify, run, unhide],
  );

  // Leaving the screen with a delete still waiting: send it now rather than silently dropping it.
  useEffect(() => {
    const waiting = pending.current;
    return () => {
      for (const id of waiting) void run(id);
      waiting.clear();
    };
  }, [run]);

  return { hiddenIds, remove };
}
