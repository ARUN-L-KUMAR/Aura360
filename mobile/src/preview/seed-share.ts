import { seedInboxForPreview } from '../features/share-import/inbox';
import { emptyInbox, type InboxState } from '../features/share-import/queue';
import type { ShareItem } from '../features/share-import/types';

/**
 * `?share=<state>` in a preview address fills the share inbox, so each state of the import screen
 * (/finance/share-import) can be looked at: reading, receiving, multi, seen-before, failed-network, failed-large,
 * not-payment, review, done and rejected. The screenshot is a small drawing, not a real payment.
 */
const SCREENSHOT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">' +
    '<rect width="360" height="640" fill="white"/><rect width="360" height="170" fill="seagreen"/>' +
    '<circle cx="180" cy="70" r="30" fill="white"/><path d="M165 70 l11 11 l21 -24" stroke="seagreen" stroke-width="7" fill="none"/>' +
    '<text x="180" y="140" font-family="Arial" font-size="20" fill="white" text-anchor="middle">Payment successful</text>' +
    '<text x="180" y="270" font-family="Arial" font-size="52" font-weight="bold" fill="black" text-anchor="middle">999</text>' +
    '<text x="180" y="320" font-family="Arial" font-size="22" fill="dimgray" text-anchor="middle">Paid to Broadband</text>' +
    '<text x="180" y="350" font-family="Arial" font-size="16" fill="gray" text-anchor="middle">Sample drawing</text></svg>',
)}`;

const draft = {
  type: 'expense' as const,
  amount: 999,
  category: 'Bills',
  description: 'Broadband',
  date: '2026-10-12',
  paymentMethod: 'upi' as const,
  notes: 'Google Pay · Ref 415678901234',
};

const item = (over: Partial<ShareItem> & Pick<ShareItem, 'id' | 'status'>): ShareItem => ({
  shareId: 1,
  sourceUri: 'content://preview/shared',
  mimeType: 'image/png',
  fileUri: SCREENSHOT,
  fingerprint: null,
  seenBefore: null,
  importAgain: false,
  error: null,
  draft: null,
  saved: null,
  ...over,
});

const inbox = (items: ShareItem[], rejected = emptyInbox.rejected): InboxState => ({ items, rejected });

const STATES: Record<string, () => InboxState> = {
  receiving: () => inbox([item({ id: 'a', status: 'staging', fileUri: null })]),
  reading: () => inbox([item({ id: 'a', status: 'reading' })]),
  multi: () => inbox([item({ id: 'a', status: 'saved', saved: { amount: 349, description: 'Swiggy' } }), item({ id: 'b', status: 'reading' }), item({ id: 'c', status: 'ready' })]),
  'seen-before': () => inbox([item({ id: 'a', status: 'ready', seenBefore: 'saved' })]),
  'failed-network': () => inbox([item({ id: 'a', status: 'failed', error: 'network' })]),
  'failed-large': () => inbox([item({ id: 'a', status: 'failed', error: 'tooLarge', fileUri: null })]),
  'not-payment': () => inbox([item({ id: 'a', status: 'failed', error: 'notPayment' })]),
  review: () => inbox([item({ id: 'a', status: 'review', draft })]),
  done: () =>
    inbox([
      item({ id: 'a', status: 'saved', saved: { amount: 999, description: 'Broadband' } }),
      item({ id: 'b', status: 'saved', saved: { amount: 349, description: '' } }),
      item({ id: 'c', status: 'skipped' }),
    ]),
  rejected: () => inbox([], { unsupported: 2, unsafe: 1, tooMany: 0 }),
};

/**
 * The transaction form as a shared screenshot would open it, by name: failed (a failed payment with a certain and a possible
 * duplicate), unknown (nothing but the warnings was found) or income (money received). Used by the developer-only route
 * /dev/share-draft?name=<name>, which hands it to the real form as the `draft` route param.
 */
const DRAFTS: Record<string, object> = {
  failed: {
    ...draft,
    share: {
      itemId: 'a',
      app: 'gpay',
      status: 'failed',
      warnings: ['statusFailed', 'lowConfidence'],
      duplicates: [
        { id: 'x1', date: '2026-10-12', amount: 999, description: 'Broadband', strength: 'certain' },
        { id: 'x2', date: '2026-10-11', amount: 999, description: 'No description', strength: 'possible' },
      ],
    },
  },
  unknown: {
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    date: null,
    paymentMethod: 'upi',
    notes: null,
    share: { itemId: 'b', app: null, status: null, warnings: ['directionUnknown', 'amountMissing', 'dateMissing', 'duplicateCheckSkipped'], duplicates: [] },
  },
  income: {
    type: 'income',
    amount: 1500,
    category: 'Refund',
    description: 'Amazon Pay',
    date: '2026-10-15',
    paymentMethod: 'upi',
    notes: 'PhonePe · Ref T2610151122ABCD',
    share: { itemId: 'c', app: 'phonepe', status: 'success', warnings: [], duplicates: [] },
  },
};

export const shareDraftFor = (name: string | undefined): object | null => (name ? (DRAFTS[name] ?? null) : null);

export function seedShareInbox() {
  try {
    const wanted = new URLSearchParams(globalThis.location?.search ?? '').get('share');
    const build = wanted ? STATES[wanted] : undefined;
    if (build) seedInboxForPreview(build());
  } catch {
    // The inbox stays empty.
  }
}
