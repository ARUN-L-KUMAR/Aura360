/**
 * The list of shared screenshots waiting to be imported, as a plain reducer. No React and no native code, so every
 * rule below is unit-tested (tests/share-queue.test.ts). inbox.ts owns the one live instance of this state.
 *
 * The rule that matters most: a screenshot enters this list exactly once, when Android delivers the share. Nothing
 * here (and nothing a screen does while rendering) can add it again, so it cannot be imported twice by a re-render.
 */
import type { TransactionDraft } from '../../components/finance/receipt.ts';
import { noRejections, totalRejected } from './accept.ts';
import type { ImportErrorCode, RejectionCounts, ShareItem } from './types.ts';

export type InboxState = {
  items: ShareItem[];
  /** Files turned away since the list was last cleared, so the screen can say so. */
  rejected: RejectionCounts;
};

export const emptyInbox: InboxState = { items: [], rejected: noRejections() };

export type NewItem = { id: string; sourceUri: string; mimeType: string };

export type InboxAction =
  | { type: 'received'; shareId: number; items: NewItem[]; rejected: RejectionCounts }
  | { type: 'staged'; id: string; fileUri: string; mimeType: string; fingerprint: string | null; seenBefore: 'saved' | 'skipped' | null }
  | { type: 'failed'; id: string; error: ImportErrorCode }
  | { type: 'reading'; id: string }
  | { type: 'review'; id: string; draft: TransactionDraft }
  | { type: 'retry'; id: string }
  | { type: 'importAgain'; id: string }
  | { type: 'saved'; id: string; summary: { amount: number; description: string } }
  | { type: 'skipped'; id: string }
  | { type: 'clear' };

const addCounts = (a: RejectionCounts, b: RejectionCounts): RejectionCounts => ({
  unsupported: a.unsupported + b.unsupported,
  unsafe: a.unsafe + b.unsafe,
  tooMany: a.tooMany + b.tooMany,
  empty: a.empty + b.empty,
});

/** Applies `change` to one item. If it returns the item untouched the state is returned as is, so subscribers do not re-render for nothing. */
function update(state: InboxState, id: string, change: (item: ShareItem) => ShareItem): InboxState {
  let changed = false;
  const items = state.items.map((item) => {
    if (item.id !== id) return item;
    const next = change(item);
    if (next !== item) changed = true;
    return next;
  });
  return changed ? { ...state, items } : state;
}

export function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  switch (action.type) {
    case 'received': {
      const known = new Set(state.items.map((item) => item.id));
      const fresh: ShareItem[] = action.items
        .filter((item) => !known.has(item.id))
        .map((item) => ({
          id: item.id,
          shareId: action.shareId,
          sourceUri: item.sourceUri,
          mimeType: item.mimeType,
          status: 'staging',
          fileUri: null,
          fingerprint: null,
          seenBefore: null,
          importAgain: false,
          error: null,
          draft: null,
          saved: null,
        }));
      return { items: [...state.items, ...fresh], rejected: addCounts(state.rejected, action.rejected) };
    }
    case 'staged':
      return update(state, action.id, (item) =>
        item.status === 'staging'
          ? { ...item, status: 'ready', fileUri: action.fileUri, mimeType: action.mimeType, fingerprint: action.fingerprint, seenBefore: action.seenBefore }
          : item,
      );
    case 'failed':
      return update(state, action.id, (item) => (isFinished(item) ? item : { ...item, status: 'failed', error: action.error }));
    case 'reading':
      return update(state, action.id, (item) => (item.status === 'ready' ? { ...item, status: 'reading', error: null } : item));
    case 'review':
      // From "reading" when the read worked; from "failed" when the person chose to type the entry in by hand instead.
      return update(state, action.id, (item) =>
        item.status === 'reading' || item.status === 'review' || item.status === 'failed'
          ? { ...item, status: 'review', draft: action.draft, error: null }
          : item,
      );
    case 'retry':
      // Without a copy of the file there is nothing to read yet, so the copy is made again first.
      return update(state, action.id, (item) => (item.status === 'failed' ? { ...item, status: item.fileUri ? 'ready' : 'staging', error: null } : item));
    case 'importAgain':
      return update(state, action.id, (item) => (item.status === 'ready' ? { ...item, importAgain: true } : item));
    case 'saved':
      return update(state, action.id, (item) => (isFinished(item) ? item : { ...item, status: 'saved', saved: action.summary, error: null }));
    case 'skipped':
      return update(state, action.id, (item) => (isFinished(item) ? item : { ...item, status: 'skipped' }));
    case 'clear':
      return emptyInbox;
  }
}

export const isFinished = (item: ShareItem) => item.status === 'saved' || item.status === 'skipped';

/** The screenshot being worked on: the first one not yet saved or skipped. */
export const currentItem = (state: InboxState): ShareItem | null => state.items.find((item) => !isFinished(item)) ?? null;

export const savedItems = (state: InboxState) => state.items.filter((item) => item.status === 'saved');

/** Screenshots still to deal with, including the current one. */
export const unfinishedCount = (state: InboxState) => state.items.filter((item) => !isFinished(item)).length;

/** 1-based position of an item among all the screenshots of this session ("2 of 3"). */
export function positionOf(state: InboxState, id: string): { index: number; total: number } {
  const at = state.items.findIndex((item) => item.id === id);
  return { index: at + 1, total: state.items.length };
}

/** Something has arrived that the import screen has to show: a screenshot, or a note that every file was turned away. */
export const hasArrivals = (state: InboxState) => state.items.length > 0 || totalRejected(state.rejected) > 0;
