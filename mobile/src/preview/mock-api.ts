import { buildSeed, type PreviewSeed } from './seed';
import { buildSubscriptions } from './seed-finance';
import { isoDaysAgo } from './seed-util';

/**
 * Answers the app's `/api/...` calls with the sample data, in place of the server. It sits on `fetch`, so the real
 * request code (src/lib/api.ts), the query keys and every screen run exactly as in the app: filters, pages and date
 * ranges all work, and a screen the sample data does not cover simply shows its own error or empty state.
 * Writes answer "ok" and change nothing.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const within = (date: string, from: string | null, to: string | null) => (!from || date >= from) && (!to || date <= to);

function transactionsPage(seed: PreviewSeed, params: URLSearchParams) {
  const type = params.get('type');
  const search = (params.get('search') ?? '').toLowerCase();
  const month = params.get('month');
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const limit = Math.max(1, Number(params.get('limit') ?? 25));

  const matching = seed.transactions.filter(
    (t) =>
      (!type || t.type === type) &&
      (!month || month === 'all' || t.date.startsWith(month)) &&
      (!search || t.description.toLowerCase().includes(search) || t.category.toLowerCase().includes(search)),
  );
  const counts = { income: 0, expense: 0, investment: 0, transfer: 0 };
  for (const t of seed.transactions) counts[t.type] += 1;

  return {
    success: true,
    data: matching.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total: matching.length, totalPages: Math.max(1, Math.ceil(matching.length / limit)) },
    totalAmount: matching.reduce((sum, t) => sum + Number(t.amount), 0),
    counts,
  };
}

function route(seed: PreviewSeed, path: string, params: URLSearchParams): Response {
  switch (path) {
    case '/api/mobile/dashboard':
      return json(seed.dashboard);
    case '/api/finance/transactions':
      return json(transactionsPage(seed, params));
    case '/api/finance/balances':
      return json({ success: true, ...seed.balances });
    case '/api/finance/budgets': {
      const { data, summary } = seed.budgetsFor(params.get('month') ?? seed.currentMonth);
      return json({ success: true, data, summary });
    }
    case '/api/finance/subscriptions':
      return json(buildSubscriptions());
    case '/api/finance/goals':
      return json({ success: true, ...seed.goals });
    case '/api/fitness':
      return json(seed.fitness.filter((e) => within(e.date, params.get('from'), params.get('to'))));
    case '/api/fitness/ai-coach':
      return json({ success: true, readiness: seed.readiness });
    case '/api/food':
      return json(seed.meals.filter((m) => within(m.date, params.get('from'), params.get('to'))));
    case '/api/time':
      return json(seed.timeLogs.filter((l) => within(l.date, params.get('from'), params.get('to'))));
    case '/api/notes':
      return json(seed.notes);
    case '/api/saved':
      return json(seed.saved);
    case '/api/skincare':
      return json(seed.skincare);
    case '/api/fashion': {
      const status = params.get('status');
      return json(status ? seed.fashionItems.filter((i) => i.status === status) : seed.fashionItems);
    }
    case '/api/fashion/outfits':
      return json(seed.fashionOutfits);
    case '/api/fashion/profile':
      return json(seed.fashionProfile);
    case '/api/notifications':
      return json(seed.inbox);
    case '/api/notifications/preferences':
      return json(seed.prefs);
    default:
      return json({ error: 'Not part of the preview data' }, 404);
  }
}

/**
 * Stands in for the vision model when a payment screenshot shared into a preview build is read (the screenshot itself
 * is never looked at). The answer depends on the image type, so every state of the import screen can be tried:
 *  - PNG:  a successful payment that is already in the sample ledger (the duplicate warning and the confirmation),
 *  - JPEG: a failed payment (the failed-payment warning and the confirmation),
 *  - WebP: not a payment at all (the "no payment found" state).
 */
function paymentScan(seed: PreviewSeed, body: unknown): Response {
  const mimeType = typeof (body as { mimeType?: unknown } | null)?.mimeType === 'string' ? (body as { mimeType: string }).mimeType : 'image/png';
  const none = {
    isPayment: false, app: null, status: null, direction: null, amount: null, currency: null, counterparty: null,
    date: null, referenceId: null, note: null, category: null, paymentMethod: null, confidence: 0,
  };
  let data: Record<string, unknown>;
  if (mimeType === 'image/webp') {
    data = none;
  } else if (mimeType === 'image/jpeg') {
    data = { ...none, isPayment: true, app: 'phonepe', status: 'failed', direction: 'paid', amount: 349, currency: 'INR', counterparty: 'Swiggy', date: isoDaysAgo(0), referenceId: 'T2610201234567', category: 'Food', paymentMethod: 'upi', confidence: 0.88 };
  } else {
    const broadband = seed.transactions.find((t) => t.type === 'expense' && t.description === 'Broadband') ?? seed.transactions.find((t) => t.type === 'expense');
    data = { ...none, isPayment: true, app: 'gpay', status: 'success', direction: 'paid', amount: Number(broadband?.amount ?? 999), currency: 'INR', counterparty: broadband?.description ?? 'Broadband', date: broadband?.date ?? isoDaysAgo(8), referenceId: '415678901234', category: broadband?.category ?? 'Bills', paymentMethod: 'upi', confidence: 0.93 };
  }
  return json({ success: true, kind: 'payment', data, message: 'Payment read' });
}

export function installMockApi() {
  const realFetch = globalThis.fetch.bind(globalThis);
  const seed = buildSeed();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let url: URL;
    try {
      url = new URL(raw, globalThis.location?.href);
    } catch {
      return realFetch(input, init);
    }
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init);

    const method = (init?.method ?? 'GET').toUpperCase();
    // The fitness coach is a POST that reads: only its readiness check has an answer here.
    if (method === 'POST' && url.pathname === '/api/fitness/ai-coach') {
      return String(init?.body ?? '').includes('readiness_check') ? route(seed, url.pathname, url.searchParams) : json({ success: false, error: 'Not part of the preview data' });
    }
    if (method === 'POST' && url.pathname === '/api/finance/receipt-scan') {
      let body: unknown = null;
      try {
        body = JSON.parse(String(init?.body ?? 'null'));
      } catch {
        // Not JSON: the screenshot is treated as a PNG.
      }
      if ((body as { kind?: unknown } | null)?.kind !== 'payment') return json({ success: true });
      await new Promise((resolve) => setTimeout(resolve, 1500)); // long enough to see the "reading" state
      return paymentScan(seed, body);
    }
    if (method !== 'GET') return json({ success: true });
    return route(seed, url.pathname, url.searchParams);
  }) as typeof fetch;
}
