/**
 * Remembers which screenshots were already saved or skipped, by a hash of the file's bytes, so the same screenshot
 * arriving a second time is recognised. That happens for real on Android: when the system restarts Aura360 from the
 * recent-apps list after it was closed, it replays the original share. Pure (storage is passed in by handled.ts), so it
 * runs under plain Node in tests/.
 *
 * The hash is of the picture, not of its address, because a payment app may reuse one file name for every share.
 */
export type HandledOutcome = 'saved' | 'skipped';
export type HandledEntry = { fp: string; at: number; outcome: HandledOutcome };

export const HANDLED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const HANDLED_MAX = 50;

/** Reads the stored list back. Anything malformed is dropped; a broken value yields an empty list, never an error. */
export function parseHandled(raw: string | null | undefined): HandledEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is HandledEntry =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as HandledEntry).fp === 'string' &&
        typeof (entry as HandledEntry).at === 'number' &&
        ((entry as HandledEntry).outcome === 'saved' || (entry as HandledEntry).outcome === 'skipped'),
    );
  } catch {
    return [];
  }
}

export function pruneHandled(entries: readonly HandledEntry[], now: number): HandledEntry[] {
  return entries.filter((entry) => now - entry.at < HANDLED_TTL_MS).slice(0, HANDLED_MAX);
}

/** Adds (or refreshes) an entry, newest first, within the age and size limits. */
export function recordHandled(entries: readonly HandledEntry[], entry: HandledEntry, now: number): HandledEntry[] {
  return pruneHandled([entry, ...entries.filter((existing) => existing.fp !== entry.fp)], now);
}

export function findHandled(entries: readonly HandledEntry[], fp: string | null, now: number): HandledEntry | null {
  if (!fp) return null;
  return entries.find((entry) => entry.fp === fp && now - entry.at < HANDLED_TTL_MS) ?? null;
}
