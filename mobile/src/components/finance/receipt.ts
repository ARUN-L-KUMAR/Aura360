/**
 * Turns what the server read from a receipt photo into a transaction draft. Pure (no React, no app imports beyond
 * types), so it runs under plain Node (tests/finance-receipt.test.ts).
 */
import type { PaymentMethod, ScannedReceipt } from '../../features/finance/types.ts';
import type { ShareDraftInfo } from '../../features/share-import/types.ts';

/**
 * What the transaction form opens with after a scan. A receipt is always an expense; a shared payment screenshot can
 * also be money received. Fields the scan could not find are left empty (amount 0, category '', date null) rather than
 * made up; the form shows them as missing.
 */
export type TransactionDraft = {
  type: 'expense' | 'income';
  amount: number;
  category: string;
  description: string;
  /** YYYY-MM-DD, or null when the scan found no date (the form then starts on today and says so). */
  date: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
  /** Only on a draft that came from a shared screenshot (features/share-import). */
  share?: ShareDraftInfo;
};

/** The vision model names categories its own way; map them onto the ones the app stores. Unknown ones become "Other". */
const CATEGORY_MAP: Record<string, string> = {
  'food & dining': 'Food',
  groceries: 'Groceries',
  shopping: 'Shopping',
  transportation: 'Transport',
  healthcare: 'Health',
  'utilities & bills': 'Bills',
  entertainment: 'Entertainment',
  'personal care': 'Health',
  travel: 'Transport',
};

export function mapReceiptCategory(raw: string | null | undefined): string {
  return CATEGORY_MAP[(raw ?? '').trim().toLowerCase()] ?? 'Other';
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'upi', 'bank_transfer', 'other'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads one scan result into a draft. A date that is missing or malformed falls back to `today`; a bad amount to 0. */
export function draftFromReceipt(scan: ScannedReceipt, today: string): TransactionDraft {
  const amount = Number(scan.amount);
  return {
    type: 'expense',
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0,
    category: mapReceiptCategory(scan.category),
    description: (scan.merchant ?? '').trim(),
    date: ISO_DAY.test(scan.date ?? '') ? scan.date : today,
    paymentMethod: PAYMENT_METHODS.includes(scan.paymentMethod) ? scan.paymentMethod : 'upi',
    notes: scan.notes?.trim() || null,
  };
}

/** Below this the model was unsure, so the form asks the person to check the details. */
export const LOW_CONFIDENCE = 0.6;
