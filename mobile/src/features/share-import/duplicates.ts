/**
 * Looks for ledger entries that may be the payment being imported. There is no transaction reference column in the
 * ledger, so a payment's UPI reference is saved in the entry's notes (see draft.ts) and matched there, alongside the
 * usual amount / day / name comparison. Pure, so it runs under plain Node in tests/.
 *
 * The result is a warning for the person to judge, never a reason to refuse: two real payments of the same amount to
 * the same place on the same day are possible.
 */
import type { DuplicateMatch, DuplicateStrength } from './types.ts';

/** The fields of a ledger entry this needs (a `Transaction` from the API has them all). */
export type LedgerEntry = {
  id: string;
  date: string;
  type: string;
  amount: string | number;
  description: string;
  notes: string | null;
};

export type DuplicateQuery = {
  type: 'expense' | 'income';
  amount: number;
  /** YYYY-MM-DD, or null when the screenshot showed no date. */
  date: string | null;
  counterparty: string;
  referenceId: string | null;
};

const DAY_MS = 86_400_000;
export const MAX_DUPLICATES = 3;
/** A reference shorter than this is too easy to hit by accident to prove anything. */
const MIN_REFERENCE_LENGTH = 6;

const dayNumber = (isoDay: string) => {
  const [y, m, d] = isoDay.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The YYYY-MM months that the day before, the day itself and the day after fall in (one or two of them). */
export function monthsToCheck(isoDay: string): string[] {
  const base = dayNumber(isoDay);
  const months = new Set<string>();
  for (const offset of [-1, 0, 1]) {
    const date = new Date((base + offset) * DAY_MS);
    months.add(`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`);
  }
  return [...months];
}

const NOISE = new Set(['paid', 'payment', 'upi', 'the', 'and', 'pvt', 'ltd', 'private', 'limited', 'india', 'store', 'shop', 'to']);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => word.length >= 3 && !NOISE.has(word));
}

/** True when the entry's description or notes share a meaningful word with the counterparty's name. */
function similarName(counterparty: string, entry: LedgerEntry): boolean {
  const mine = words(counterparty);
  if (mine.length === 0) return false;
  const theirs = `${entry.description} ${entry.notes ?? ''}`.toLowerCase();
  return mine.some((word) => theirs.includes(word));
}

const RANK: Record<DuplicateStrength, number> = { certain: 0, likely: 1, possible: 2 };

export function findDuplicates(query: DuplicateQuery, ledger: readonly LedgerEntry[]): DuplicateMatch[] {
  const reference = query.referenceId?.trim().toLowerCase() ?? '';
  const useReference = reference.length >= MIN_REFERENCE_LENGTH;
  const matches: (DuplicateMatch & { distance: number })[] = [];

  for (const entry of ledger) {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) continue;

    const distance = query.date ? Math.abs(dayNumber(entry.date) - dayNumber(query.date)) : 0;
    let strength: DuplicateStrength | null = null;

    if (useReference && `${entry.notes ?? ''} ${entry.description}`.toLowerCase().includes(reference)) {
      // The same transaction ID is the same payment, whatever amount or date was typed.
      strength = 'certain';
    } else if (entry.type === query.type && Math.abs(amount - query.amount) < 0.005 && query.amount > 0) {
      const named = similarName(query.counterparty, entry);
      if (query.date === null) {
        if (named) strength = 'possible';
      } else if (distance === 0) {
        strength = named ? 'likely' : 'possible';
      } else if (distance === 1 && named) {
        strength = 'possible';
      }
    }

    if (strength) {
      matches.push({ id: entry.id, date: entry.date.slice(0, 10), amount, description: entry.description, strength, distance });
    }
  }

  return matches
    .sort((a, b) => RANK[a.strength] - RANK[b.strength] || a.distance - b.distance)
    .slice(0, MAX_DUPLICATES)
    .map(({ distance: _distance, ...match }) => match);
}
