import { useSyncExternalStore } from 'react';

import type { SharedLink } from './links';

/**
 * The link another app has just shared (a product from Amazon, Flipkart, Myntra ...), waiting for the Save-a-link screen.
 * A module, not React state, for the same reasons as the screenshot inbox: it lives across screens, and a share that arrives
 * before anything has rendered, or while signed out or locked, is kept until the screen can open.
 *
 * Only the newest share is kept (sharing another product before the first was saved replaces it), and only the screen that
 * opened for it clears it, by calling `acknowledgeLink`; until then the intake keeps asking for the screen.
 */
export type PendingLink = {
  id: number;
  /** null: something was shared but no link was in it (the screen says so). */
  url: string | null;
  hint: string | null;
};

let counter = 0;
let pending: PendingLink | null = null;
const listeners = new Set<() => void>();

const publish = () => listeners.forEach((listener) => listener());

export const subscribeLinks = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getPendingLink = () => pending;

/** Keeps a shared link (or, with `null`, a share that had text but no link) for the Save-a-link screen. */
export function queueLink(link: SharedLink | null): PendingLink {
  counter += 1;
  pending = { id: counter, url: link?.url ?? null, hint: link?.hint ?? null };
  publish();
  return pending;
}

/** The Save-a-link screen has taken the link over. */
export function acknowledgeLink(id: number) {
  if (!pending || pending.id !== id) return;
  pending = null;
  publish();
}

/** Sign-out: a link someone shared is not kept for whoever signs in next. */
export function discardLink() {
  if (!pending) return;
  pending = null;
  publish();
}

export function usePendingLink(): PendingLink | null {
  return useSyncExternalStore(subscribeLinks, getPendingLink, getPendingLink);
}
