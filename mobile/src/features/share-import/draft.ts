/**
 * Turns what the server read from a shared screenshot into a transaction draft for the existing form. Pure (type-only
 * imports besides sibling pure modules), so it runs under plain Node in tests/.
 *
 * Two rules drive everything here:
 * - What the screenshot did not show stays unknown (amount 0, category '', date null) and is flagged, never invented.
 * - A screenshot is a claim, not proof. The draft carries warnings (failed or pending status, unclear direction, a
 *   possible duplicate...) and the form asks for confirmation where it matters.
 */
import { mapReceiptCategory, type TransactionDraft } from '../../components/finance/receipt.ts';
import type { PaymentMethod } from '../finance/types.ts';
import type { DuplicateMatch, ImportWarning, PaymentApp, PaymentRead, PaymentStatus, ShareDraftInfo } from './types.ts';

/** Below this the model said it could barely read the screen. */
export const LOW_CONFIDENCE = 0.6;

const APPS: readonly PaymentApp[] = ['gpay', 'phonepe', 'paytm', 'bhim', 'bank', 'other'];
const STATUSES: readonly PaymentStatus[] = ['success', 'failed', 'pending'];
const METHODS: readonly PaymentMethod[] = ['cash', 'card', 'upi', 'bank_transfer', 'other'];

/** Brand names are not translated. `other` has no label: an unknown app is simply not named. */
const APP_LABEL: Record<PaymentApp, string | null> = {
  gpay: 'Google Pay',
  phonepe: 'PhonePe',
  paytm: 'Paytm',
  bhim: 'BHIM',
  bank: 'Bank app',
  other: null,
};

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

/** A real calendar day in YYYY-MM-DD form, or null. */
export function validDay(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? value : null;
}

function positiveAmount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** The server reports 0..1 for payments and 10..100 for the older receipt reader; both end up as 0..1. */
function unitConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(1, value > 1 ? value / 100 : value);
}

/**
 * Checks a scan response and returns it in one shape. Handles the payment answer and, for a server that has not been
 * updated to read payment screenshots yet, the older receipt answer (which cannot say direction, status or time).
 * Returns null when the response is neither.
 */
export function normalizeScan(data: unknown): PaymentRead | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;

  if (typeof o.isPayment === 'boolean') {
    return {
      isPayment: o.isPayment,
      app: oneOf(o.app, APPS),
      status: oneOf(o.status, STATUSES),
      direction: o.direction === 'paid' || o.direction === 'received' ? o.direction : null,
      amount: positiveAmount(o.amount),
      currency: typeof o.currency === 'string' && /^[A-Za-z]{3}$/.test(o.currency) ? o.currency.toUpperCase() : null,
      counterparty: cleanText(o.counterparty, 80),
      date: validDay(o.date),
      referenceId: cleanText(o.referenceId, 40),
      note: cleanText(o.note, 100),
      category: cleanText(o.category, 40),
      paymentMethod: oneOf(o.paymentMethod, METHODS),
      confidence: unitConfidence(o.confidence),
    };
  }

  if (typeof o.merchant === 'string' && 'amount' in o) {
    const amount = positiveAmount(o.amount);
    const merchant = cleanText(o.merchant, 80);
    return {
      isPayment: amount !== null,
      app: null,
      status: null,
      direction: null,
      amount,
      currency: null,
      // "Store Receipt" is the older reader's stand-in when it found no name.
      counterparty: merchant === 'Store Receipt' ? null : merchant,
      date: validDay(o.date),
      referenceId: cleanText(o.receiptNumber, 40),
      note: cleanText(o.notes, 100),
      category: mapReceiptCategory(typeof o.category === 'string' ? o.category : null),
      paymentMethod: oneOf(o.paymentMethod, METHODS),
      confidence: unitConfidence(o.confidence),
    };
  }

  return null;
}

/** False when the model called it a payment but found nothing in it: an empty form would only mislead. */
export const hasAnyDetail = (read: PaymentRead) =>
  read.amount !== null || read.counterparty !== null || read.date !== null || read.referenceId !== null;

/** The blank form for "add it by hand", still tied to the screenshot so saving it settles that screenshot. */
export function manualDraft(itemId: string): TransactionDraft {
  return {
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    date: null,
    paymentMethod: 'upi',
    notes: null,
    share: { itemId, manual: true, app: null, status: null, warnings: [], duplicates: [] },
  };
}

export type DraftContext = {
  itemId: string;
  /** The categories the form offers per type; a category outside them is dropped, not guessed at. */
  categories: { expense: readonly string[]; income: readonly string[] };
  /** Ledger entries that look like this payment. `null` means the ledger could not be checked. */
  duplicates: DuplicateMatch[] | null;
};

/** What is written into the entry's notes: the app, the reference (so a later import can recognise it) and the payer's note. */
export function buildNotes(read: PaymentRead): string | null {
  const app = read.app ? APP_LABEL[read.app] : null;
  const parts = [app, read.referenceId ? `Ref ${read.referenceId}` : null, read.note];
  const notes = parts.filter(Boolean).join(' · ');
  return notes || null;
}

export function buildWarnings(read: PaymentRead, duplicates: DuplicateMatch[] | null): ImportWarning[] {
  const warnings: ImportWarning[] = [];
  if (read.status === 'failed') warnings.push('statusFailed');
  if (read.status === 'pending') warnings.push('statusPending');
  if (read.direction === null) warnings.push('directionUnknown');
  if (read.amount === null) warnings.push('amountMissing');
  if (read.date === null) warnings.push('dateMissing');
  if (read.currency !== null && read.currency !== 'INR') warnings.push('currencyOther');
  if (read.confidence < LOW_CONFIDENCE) warnings.push('lowConfidence');
  if (duplicates === null) warnings.push('duplicateCheckSkipped');
  return warnings;
}

export function buildDraft(read: PaymentRead, context: DraftContext): TransactionDraft {
  const type = read.direction === 'received' ? 'income' : 'expense';
  const info: ShareDraftInfo = {
    itemId: context.itemId,
    app: read.app,
    status: read.status,
    warnings: buildWarnings(read, context.duplicates),
    duplicates: context.duplicates ?? [],
  };

  return {
    type,
    amount: read.amount ?? 0,
    category: read.category && context.categories[type].includes(read.category) ? read.category : '',
    description: read.counterparty ?? '',
    date: read.date,
    paymentMethod: read.paymentMethod ?? 'upi',
    notes: buildNotes(read),
    share: info,
  };
}

export type ConfirmReason = 'duplicate' | 'statusFailed' | 'statusPending';

/**
 * What the person must agree to before the entry is saved. A failed or pending status, or a duplicate that is
 * (probably) the same payment, each need an explicit yes; a weaker "same amount that day" match is only shown.
 *
 * `unchanged` says the amount and date are still what was read. A match found by amount and day no longer applies once
 * the person has edited either, but a matching transaction ID is the same payment whatever they type.
 */
export function confirmReasons(info: ShareDraftInfo, unchanged = true): ConfirmReason[] {
  const reasons: ConfirmReason[] = [];
  if (info.status === 'failed') reasons.push('statusFailed');
  if (info.status === 'pending') reasons.push('statusPending');
  const standing = info.duplicates.filter((match) => match.strength === 'certain' || (unchanged && match.strength === 'likely'));
  if (standing.length > 0) reasons.push('duplicate');
  return reasons;
}
