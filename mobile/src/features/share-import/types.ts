/**
 * Shared types for "share a payment screenshot into Aura360". Pure (type-only imports), so the logic modules in this
 * folder run under plain Node in tests/.
 */
import type { TransactionDraft } from '../../components/finance/receipt.ts';
import type { PaymentMethod } from '../finance/types.ts';

/** Why an import stopped. The screen words each one (finance:shareImport.errors.*). */
export type ImportErrorCode =
  | 'unsupportedType' // not a JPEG, PNG or WebP image
  | 'unreadable' // the file could not be opened or copied
  | 'tooLarge'
  | 'notPayment' // read fine, but it is not a payment screen
  | 'network'
  | 'timeout'
  | 'session'
  | 'server';

/** Apps a screenshot can come from, as far as the model could tell. */
export type PaymentApp = 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'bank' | 'other';
export type PaymentStatus = 'success' | 'failed' | 'pending';

/** Things the person should look at before saving. Shown on the transaction form. */
export type ImportWarning =
  | 'statusFailed'
  | 'statusPending'
  | 'directionUnknown'
  | 'amountMissing'
  | 'dateMissing'
  | 'currencyOther'
  | 'lowConfidence'
  | 'duplicateCheckSkipped';

export type DuplicateStrength = 'certain' | 'likely' | 'possible';

/** An entry already in the ledger that looks like the payment being imported. */
export type DuplicateMatch = {
  id: string;
  date: string;
  amount: number;
  description: string;
  strength: DuplicateStrength;
};

/** Rides along on the transaction draft so the form can show warnings and tell the inbox when it saved. */
export type ShareDraftInfo = {
  itemId: string;
  /** An empty form opened from the import screen ("add it by hand"): nothing was read, so nothing is claimed as read. */
  manual?: boolean;
  app: PaymentApp | null;
  status: PaymentStatus | null;
  warnings: ImportWarning[];
  duplicates: DuplicateMatch[];
};

/** What the model read from a screenshot, after checking it. `null` means "not on the screenshot". */
export type PaymentRead = {
  isPayment: boolean;
  app: PaymentApp | null;
  status: PaymentStatus | null;
  direction: 'paid' | 'received' | null;
  amount: number | null;
  currency: string | null;
  counterparty: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  referenceId: string | null;
  note: string | null;
  category: string | null;
  paymentMethod: PaymentMethod | null;
  /** 0..1 */
  confidence: number;
};

export type ItemStatus =
  | 'staging' // being copied into the app's own storage
  | 'ready' // copied and checked, waiting to be read
  | 'reading' // being uploaded and read
  | 'review' // handed to the transaction form
  | 'saved'
  | 'skipped'
  | 'failed';

export type ShareItem = {
  id: string;
  /** Which share it arrived in (a single share can carry several images). */
  shareId: number;
  /** The content:// address the sender gave. Never logged. */
  sourceUri: string;
  /** Declared by the sender at first; replaced by what the file really is once it is staged. */
  mimeType: string;
  status: ItemStatus;
  /** The app's own copy (file://), once staged. */
  fileUri: string | null;
  /** Hash of the copy, used to notice the same screenshot arriving again. */
  fingerprint: string | null;
  /** This exact screenshot was already saved or skipped earlier. */
  seenBefore: 'saved' | 'skipped' | null;
  /** The person asked to import a screenshot they had handled before. */
  importAgain: boolean;
  error: ImportErrorCode | null;
  /** What was read, kept so the form can be opened again without reading the screenshot twice. */
  draft: TransactionDraft | null;
  saved: { amount: number; description: string } | null;
};

/**
 * Why shared files were turned away, for the import screen to say so. `empty` is different from the rest: Android told the
 * app something was shared, but handed over nothing it could read (no file at all), so there was no file to turn away.
 */
export type RejectionCounts = { unsupported: number; unsafe: number; tooMany: number; empty: number };
