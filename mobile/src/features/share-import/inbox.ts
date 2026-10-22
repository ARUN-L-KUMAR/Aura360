import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { TransactionDraft } from '@/components/finance/receipt';

import { classifyPayloads, noRejections } from './accept';
import { lookupHandled, rememberHandled } from './handled';
import { queueLink } from './link-inbox';
import { splitSharePayloads } from './links';
import { emptyInbox, hasArrivals, inboxReducer, isFinished, type InboxAction, type InboxState } from './queue';
import { StageError, deleteStaged, stageSharedImage } from './stage';
import { trace } from './trace';
import type { ImportErrorCode, ShareItem } from './types';

/**
 * The one place that holds shared screenshots while they are imported (a module, not React state, so it lives across
 * screens and a share that arrives before anything has rendered is not lost).
 *
 * How a share gets here:
 *  - Android hands it to the app as a SEND / SEND_MULTIPLE intent; expo-sharing keeps it natively and tells Expo Router
 *    about it with the link `aura360://expo-sharing` (cold start: the launch link; app already open: a new-link event).
 *  - src/app/+native-intent.ts sees that link and calls `captureNativeShare()`. It reads the shared items once and
 *    immediately clears the native copy, so the same share can never be read twice, however often screens re-render or
 *    Android replays the launch intent.
 *  - features/share-import/share-intake.tsx opens the import screen once the person is signed in and unlocked.
 *
 * Nothing in here touches the ledger. Saving always goes through the transaction form.
 */

const OWN_PACKAGE = Constants.expoConfig?.android?.package ?? 'com.aura360.app';
/** How long the list survives the import screen closing, so a hot reload or remount does not throw a share away. */
const CLOSE_GRACE_MS = 400;

export type InboxSnapshot = InboxState & { screenOpen: boolean };

let state: InboxState = emptyInbox;
let screenOpen = false;
let snapshot: InboxSnapshot = { ...state, screenOpen };
let shareCounter = 0;
/** When something was last captured, so a second trigger for the same share is not mistaken for an empty one. */
let lastCapturedAt = 0;
const RECENT_CAPTURE_MS = 3000;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function publish() {
  snapshot = { ...state, screenOpen };
  listeners.forEach((listener) => listener());
}

function dispatch(action: InboxAction) {
  const next = inboxReducer(state, action);
  if (next === state) return;
  state = next;
  publish();
}

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getSnapshot = () => snapshot;
export const getItem = (id: string): ShareItem | undefined => state.items.find((item) => item.id === id);

// ── receiving ───────────────────────────────────────────────────────────────────────────────────────────────────

type SharingModule = typeof import('expo-sharing');

/**
 * expo-sharing is loaded on first use, not at import: the module has native code, and a build installed before it was
 * added (an older APK running newer JavaScript, Expo Go) throws "Cannot find native module" the moment it is required.
 * Importing it at the top of this file would then crash the app at startup instead of just ignoring shares.
 */
function loadSharing(): SharingModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-sharing') as SharingModule;
  } catch {
    return null;
  }
}

/**
 * Reads whatever Android has delivered to the app and queues it. Safe to call at any time and any number of times: the
 * native copy is cleared right after reading, so a second call finds nothing. Returns how many screenshots were queued.
 *
 * `announce`: the caller knows a share just arrived (the share link). If Android then hands over nothing readable, the
 * person is told, instead of the app opening and doing nothing. The other triggers (launch, coming back to the app) pass
 * nothing, because for them "nothing waiting" is the normal case.
 */
export function captureNativeShare(options: { announce?: boolean } = {}): number {
  if (Platform.OS !== 'android') return 0;

  const Sharing = loadSharing();
  if (!Sharing) {
    if (options.announce) trace('a share arrived but this build has no sharing module');
    return 0;
  }

  let payloads: unknown;
  try {
    payloads = Sharing.getSharedPayloads();
  } catch {
    trace('reading the shared items failed');
    return 0; // this build has no sharing module
  }
  try {
    Sharing.clearSharedPayloads();
  } catch {
    // Nothing to clear.
  }

  if (!Array.isArray(payloads) || payloads.length === 0) {
    if (options.announce && Date.now() - lastCapturedAt > RECENT_CAPTURE_MS) {
      trace('share link arrived but no items came with it');
      shareCounter += 1;
      dispatch({ type: 'received', shareId: shareCounter, items: [], rejected: { ...noRejections(), empty: 1 } });
    }
    return 0;
  }

  // A shopping app shares a link as text. A share with a link in it is a product to save, not a payment screenshot, so
  // when both arrive together (an app that sends a picture and a caption) the link wins.
  const split = splitSharePayloads(payloads);
  if (split.links.length > 0) {
    lastCapturedAt = Date.now();
    trace(`share read: a link (${split.links.length} found, ${split.rest.length} other item(s) not used)`);
    queueLink(split.links[0]);
    return 0;
  }

  const { accepted, rejected } = classifyPayloads(split.rest, { ownPackage: OWN_PACKAGE });
  if (accepted.length === 0 && split.textWithoutLink > 0) {
    lastCapturedAt = Date.now();
    trace('share read: text with no link in it');
    queueLink(null);
    return 0;
  }
  const items = accepted.map((payload) => ({ id: Crypto.randomUUID(), ...payload }));
  lastCapturedAt = Date.now();
  trace(`share read: ${split.rest.length} item(s), ${items.length} accepted, turned away ${JSON.stringify(rejected)}`);
  shareCounter += 1;
  dispatch({ type: 'received', shareId: shareCounter, items, rejected });
  for (const item of items) enqueueStaging(item.id);
  return items.length;
}

// ── staging: copy each image into the app's own storage, one at a time ───────────────────────────────────────────

let stagingChain: Promise<void> = Promise.resolve();

function enqueueStaging(id: string) {
  stagingChain = stagingChain.then(() => stageOne(id)).catch(() => undefined);
}

async function stageOne(id: string) {
  const item = getItem(id);
  if (!item || item.status !== 'staging') return;
  try {
    const staged = await stageSharedImage(item.sourceUri);
    trace(`copied a shared image (${staged.mimeType}, ${staged.bytes} bytes)`);
    const seenBefore = await lookupHandled(staged.fingerprint);
    if (!getItem(id)) {
      deleteStaged(staged.fileUri); // discarded while it was being copied
      return;
    }
    dispatch({ type: 'staged', id, fileUri: staged.fileUri, mimeType: staged.mimeType, fingerprint: staged.fingerprint, seenBefore });
  } catch (error) {
    const code: ImportErrorCode = error instanceof StageError ? error.code : 'unreadable';
    trace(`could not copy a shared image: ${code}`);
    if (getItem(id)) dispatch({ type: 'failed', id, error: code });
  }
}

// ── what the import screen does to an item ─────────────────────────────────────────────────────────────────────

export const markReading = (id: string) => dispatch({ type: 'reading', id });
export const markFailed = (id: string, error: ImportErrorCode) => dispatch({ type: 'failed', id, error });
export const markReview = (id: string, draft: TransactionDraft) => dispatch({ type: 'review', id, draft });
export const importAgain = (id: string) => dispatch({ type: 'importAgain', id });

/** Try a failed item again: read it again if the copy exists, otherwise copy it again first. */
export function retryItem(id: string) {
  const item = getItem(id);
  if (!item || item.status !== 'failed') return;
  dispatch({ type: 'retry', id });
  if (!item.fileUri) enqueueStaging(id);
}

function finish(id: string, remember: 'saved' | 'skipped' | null) {
  const item = getItem(id);
  if (!item) return;
  if (remember) void rememberHandled(item.fingerprint, remember);
  deleteStaged(item.fileUri);
}

/** The transaction form saved this screenshot's entry. */
export function markSaved(id: string, summary: { amount: number; description: string }) {
  const item = getItem(id);
  if (!item || isFinished(item)) return;
  dispatch({ type: 'saved', id, summary });
  finish(id, 'saved');
}

/** The person chose not to import it. A screenshot that never got read (it failed) is not remembered as handled. */
export function markSkipped(id: string) {
  const item = getItem(id);
  if (!item || isFinished(item)) return;
  dispatch({ type: 'skipped', id });
  finish(id, item.status === 'failed' ? null : 'skipped');
}

/** Drops everything waiting (sign-out, or the import screen was closed) and deletes the copies. */
export function discardAll() {
  for (const item of state.items) deleteStaged(item.fileUri);
  dispatch({ type: 'clear' });
}

// ── the import screen's presence ───────────────────────────────────────────────────────────────────────────────

/**
 * Called by the import screen on mount (true) and unmount (false). Closing the screen discards what was left, but only
 * what was there when it closed and only after a moment: a screenshot that arrives in between, or a screen that
 * remounts at once (a hot reload), keeps its items.
 */
export function setScreenOpen(open: boolean) {
  if (open) {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = null;
    if (!screenOpen) {
      screenOpen = true;
      publish();
    }
    return;
  }
  const leaving = new Set(state.items.map((item) => item.id));
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    closeTimer = null;
    for (const item of state.items) {
      if (leaving.has(item.id)) deleteStaged(item.fileUri);
    }
    const remaining = state.items.filter((item) => !leaving.has(item.id));
    state = remaining.length > 0 ? { ...state, items: remaining } : emptyInbox;
    screenOpen = false;
    publish();
  }, CLOSE_GRACE_MS);
}

/**
 * Preview builds only (`npm run preview:web`, see src/preview/seed-share.ts): puts the inbox in a given state. By default it
 * marks the import screen as already open, so every state of that screen can be photographed without a phone; with
 * `screenOpen: false` the inbox is filled the way a real share fills it, and ShareIntake has to open the screen.
 */
export function seedInboxForPreview(next: InboxState, options: { screenOpen?: boolean } = {}) {
  state = next;
  screenOpen = options.screenOpen ?? true;
  publish();
}

/** True while something has arrived that no import screen is showing yet. */
export const needsScreen = (s: InboxSnapshot) => hasArrivals(s) && !s.screenOpen;
