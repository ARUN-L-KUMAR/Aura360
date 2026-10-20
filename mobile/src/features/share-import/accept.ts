/**
 * Decides which of the things another app shared with us are worth opening. Pure: it only looks at the descriptions
 * Android gives (address and type), never at the file, so it runs under plain Node in tests/.
 *
 * The rules are deliberately strict, because anything can be shared to us by any app on the phone:
 * - only content:// addresses (what Android hands out for a share); file:// and anything else are refused;
 * - never an address that belongs to Aura360's own file providers (a crafted share could otherwise make the app read
 *   its own private files);
 * - only JPEG, PNG and WebP. The real file type is checked again from the file's first bytes once it is copied.
 */
import type { RejectionCounts } from './types.ts';

/** One share can carry several screenshots; past this we ignore the rest rather than queue an endless review. */
export const MAX_ITEMS_PER_SHARE = 10;

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export type AcceptedPayload = { sourceUri: string; mimeType: string };

export const noRejections = (): RejectionCounts => ({ unsupported: 0, unsafe: 0, tooMany: 0 });

/** "content://com.example.provider/path" -> "com.example.provider". Per-user addresses ("content://10@media/...") lose the "10@". */
function authorityOf(uri: string): string | null {
  const match = /^content:\/\/([^/?#]*)/i.exec(uri);
  if (!match) return null;
  return match[1].replace(/^\d+@/, '').toLowerCase();
}

/** True for addresses served by this app itself (its package name is the prefix of every provider authority it declares). */
export function isOwnProvider(uri: string, ownPackage: string): boolean {
  const authority = authorityOf(uri);
  if (!authority) return false;
  const own = ownPackage.toLowerCase();
  return authority === own || authority.startsWith(`${own}.`);
}

function declaredType(raw: unknown): string {
  return typeof raw === 'string' ? raw.split(';')[0].trim().toLowerCase() : '';
}

/**
 * Sorts the payloads of one share into the ones to open and a count of those turned away, by reason. Never throws:
 * a malformed list, a missing address or a payload of the wrong shape is simply counted as unsupported.
 */
export function classifyPayloads(
  payloads: unknown,
  options: { ownPackage: string; max?: number },
): { accepted: AcceptedPayload[]; rejected: RejectionCounts } {
  const max = options.max ?? MAX_ITEMS_PER_SHARE;
  const accepted: AcceptedPayload[] = [];
  const rejected = noRejections();
  const seen = new Set<string>();

  const list = Array.isArray(payloads) ? (payloads as unknown[]) : [];
  // Nothing shared is not a rejection; a list that is not a list is.
  if (payloads != null && !Array.isArray(payloads)) rejected.unsupported += 1;

  for (const entry of list) {
    const payload = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
    const uri = typeof payload?.value === 'string' ? payload.value.trim() : '';
    if (!payload || !uri) {
      rejected.unsupported += 1;
      continue;
    }

    if (!/^content:\/\//i.test(uri) || isOwnProvider(uri, options.ownPackage)) {
      rejected.unsafe += 1;
      continue;
    }

    const type = declaredType(payload.mimeType);
    const kind = typeof payload.shareType === 'string' ? payload.shareType : 'image';
    if (kind !== 'image' || !SUPPORTED_TYPES.has(type)) {
      rejected.unsupported += 1;
      continue;
    }

    if (seen.has(uri)) continue; // the same address twice in one share is one screenshot
    seen.add(uri);

    if (accepted.length >= max) {
      rejected.tooMany += 1;
      continue;
    }
    accepted.push({ sourceUri: uri, mimeType: type === 'image/jpg' ? 'image/jpeg' : type });
  }

  return { accepted, rejected };
}

export const totalRejected = (counts: RejectionCounts) => counts.unsupported + counts.unsafe + counts.tooMany;
