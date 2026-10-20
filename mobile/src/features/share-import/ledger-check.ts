import { fetchLedgerMonth } from '@/features/finance/hooks';
import { monthKey } from '@/lib/format';

import { findDuplicates, monthsToCheck } from './duplicates';
import type { DuplicateMatch, PaymentRead } from './types';

/**
 * Looks in the person's own ledger (through the same transactions API the Ledger screen uses) for entries that may be
 * the payment just read. Returns `null` when the ledger could not be checked, so the form can say the check was skipped;
 * an empty list means "checked, nothing similar".
 */
export async function findLedgerDuplicates(read: PaymentRead, signal: AbortSignal): Promise<DuplicateMatch[] | null> {
  const type = read.direction === 'received' ? 'income' : 'expense';
  // With no amount and no transaction ID there is nothing to compare.
  if (read.amount === null && read.referenceId === null) return [];

  try {
    const months = read.date ? monthsToCheck(read.date) : [monthKey()];
    const pages = await Promise.all(months.map((month) => fetchLedgerMonth(month, type, signal)));
    return findDuplicates(
      { type, amount: read.amount ?? 0, date: read.date, counterparty: read.counterparty ?? '', referenceId: read.referenceId },
      pages.flat(),
    );
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}
