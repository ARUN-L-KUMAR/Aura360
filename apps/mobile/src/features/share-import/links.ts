/**
 * Picks product links out of what another app shared with Aura360. Pure: it only reads the descriptions Android gives
 * (the text and its type), so it runs under plain Node in tests/.
 *
 * Shopping apps (Amazon, Flipkart, Myntra, Ajio, Meesho ...) share text, not a picture: a short message with the link in it,
 * for example "Check out Roadster Men T-shirt at ₹499 on Flipkart https://fkrt.it/abc123". The link is what gets saved; the
 * words around it are kept as a hint for the product's name, for the times a shop refuses to be read.
 */

/** Past this, a shared text is cut before looking for a link: a link sits near the start or the end of a share message. */
const MAX_TEXT = 4000;
const MAX_URL = 2048;
const MAX_HINT = 160;

export type SharedLink = {
  url: string;
  /** The words shared next to the link, tidied up; null when there were none worth keeping. */
  hint: string | null;
};

export type SplitShare = {
  links: SharedLink[];
  /** Text payloads that held no link at all. */
  textWithoutLink: number;
  /** Everything that is not text (the screenshots), for the payment-screenshot path to look at. */
  rest: unknown[];
};

const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;
const OPENERS = /^(?:hey[,!]?\s*)?(?:please\s+)?(?:check(?:\s+this)?(?:\s+out)?|take\s+a\s+look\s+at|have\s+a\s+look\s+at|look\s+at|see\s+this)\s*(?:this|the|my)?\s*:?\s*/i;

function isTextPayload(payload: Record<string, unknown>): boolean {
  const kind = typeof payload.shareType === 'string' ? payload.shareType : '';
  if (kind === 'text' || kind === 'url') return true;
  const type = typeof payload.mimeType === 'string' ? payload.mimeType.split(';')[0].trim().toLowerCase() : '';
  return !kind && type.startsWith('text/');
}

/** A web address worth saving: http or https, a real host, not absurdly long. Returns it cleaned of trailing punctuation. */
export function cleanUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[)\]}>.,;:!?'"]+$/, '');
  if (!trimmed || trimmed.length > MAX_URL) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    if (parsed.username || parsed.password) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** The words around a link, as a possible product name: the link removed, the "Check out" opener and stray punctuation trimmed. */
export function hintFromText(text: string, url: string): string | null {
  const withoutLink = text.replace(url, ' ').replace(URL_IN_TEXT, ' ');
  const tidy = withoutLink
    .replace(/\s+/g, ' ')
    .trim()
    .replace(OPENERS, '')
    .replace(/^[\s:,\-–|]+|[\s:,\-–|]+$/g, '')
    .trim();
  if (tidy.length < 3 || !/[\p{L}\p{N}]/u.test(tidy)) return null;
  return tidy.length > MAX_HINT ? `${tidy.slice(0, MAX_HINT - 1).trimEnd()}…` : tidy;
}

/** The first web address in a text, or null. */
export function firstLink(text: string): string | null {
  const found = URL_IN_TEXT.exec(text.slice(0, MAX_TEXT));
  return found ? cleanUrl(found[0]) : null;
}

/**
 * Splits one share into the links in it and everything else. Never throws: an entry of the wrong shape is simply left in
 * `rest`, where the screenshot rules will count it as unsupported.
 */
export function splitSharePayloads(payloads: unknown): SplitShare {
  const links: SharedLink[] = [];
  const rest: unknown[] = [];
  let textWithoutLink = 0;
  const seen = new Set<string>();

  for (const entry of Array.isArray(payloads) ? (payloads as unknown[]) : []) {
    const payload = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
    if (!payload || !isTextPayload(payload)) {
      rest.push(entry);
      continue;
    }
    const text = typeof payload.value === 'string' ? payload.value.slice(0, MAX_TEXT) : '';
    const url = firstLink(text);
    if (!url) {
      if (text.trim()) textWithoutLink += 1;
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({ url, hint: hintFromText(text, url) });
  }

  return { links, textWithoutLink, rest };
}
