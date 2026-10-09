/**
 * Offline queue for logging.
 *
 * When a create (an expense, workout, meal, time log or note) can't reach the server, it is kept here on the phone and
 * sent automatically once the connection is back. Everything is tagged with the signed-in user, so one person's
 * entries are never sent under another account.
 *
 * This file has no native imports (storage and the id generator are passed in by configureQueue), so its logic can be
 * tested on its own.
 */

export interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type QueueEntry = {
  id: string;
  path: string;
  method: 'POST';
  body: unknown;
  userId: string;
  createdAt: number;
  attempts: number;
  label: string;
};
export type FailedEntry = QueueEntry & { error: string; status: number };

export type OfflineItem = { id: string; kind: 'pending' | 'failed'; label: string; createdAt: number; error?: string };

export type OfflineSnapshot = {
  online: boolean;
  pending: number;
  failed: number;
  items: OfflineItem[];
  replaying: boolean;
  /** Short message to flash ("Saved offline"); the banner shows it for a few seconds. */
  notice: { text: string; at: number } | null;
};

export type ReplayResult = { sent: number; failed: number; authRequired: boolean };

const QUEUE_KEY = 'aura.offline.queue.v1';
const FAILED_KEY = 'aura.offline.failed.v1';
export const MAX_ATTEMPTS = 10;
const MAX_QUEUE = 200;

/** Creating one of these offline is queued. Exact paths only. */
const QUEUEABLE = new Set(['/api/finance/transactions', '/api/fitness', '/api/food', '/api/time', '/api/notes', '/api/skincare']);

export function isQueueable(method: string | undefined, path: string): boolean {
  return (method ?? 'GET').toUpperCase() === 'POST' && QUEUEABLE.has(path.split('?')[0]);
}

export function labelFor(path: string, body: unknown): string {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  switch (path.split('?')[0]) {
    case '/api/finance/transactions':
      return `${b.type === 'income' ? 'Income' : 'Expense'} ₹${b.amount ?? ''}${b.category ? ` · ${text(b.category, '')}` : ''}`.trim();
    case '/api/fitness':
      return `Workout${b.workoutType || b.type ? `: ${text(b.workoutType ?? b.type, '')}` : ''}`;
    case '/api/food':
      return `Meal: ${text(b.foodName, 'entry')}`;
    case '/api/time':
      return `Time log: ${text(b.activity, 'entry')}`;
    case '/api/notes':
      return `Note: ${text(b.title, 'untitled')}`;
    case '/api/skincare':
      return `Skincare product: ${text(b.productName, 'entry')}`;
    default:
      return 'Entry';
  }
}

// ── configuration & store ─────────────────────────────────────────────────────

let storage: QueueStorage | null = null;
let makeId: () => string = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let currentUser: string | null = null;
let online = true;
let replaying = false;
let notice: OfflineSnapshot['notice'] = null;

let snapshot: OfflineSnapshot = { online: true, pending: 0, failed: 0, items: [], replaying: false, notice: null };
const listeners = new Set<() => void>();
const resultListeners = new Set<(result: ReplayResult) => void>();

export function configureQueue(options: { storage: QueueStorage; randomId?: () => string }) {
  storage = options.storage;
  if (options.randomId) makeId = options.randomId;
}

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getSnapshot = () => snapshot;
export const onReplayResult = (listener: (result: ReplayResult) => void) => {
  resultListeners.add(listener);
  return () => {
    resultListeners.delete(listener);
  };
};

// Writes are serialised, so an entry added while a replay is running is never lost
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.catch(() => undefined);
  return next;
}

async function read<T>(key: string): Promise<T[]> {
  if (!storage) return [];
  try {
    const raw = await storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
async function write(key: string, value: unknown[]) {
  if (!storage) return;
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: the in-memory snapshot is still correct for this session
  }
}

async function publish() {
  const [queue, failed] = await Promise.all([read<QueueEntry>(QUEUE_KEY), read<FailedEntry>(FAILED_KEY)]);
  const mine = <T extends { userId: string }>(list: T[]) => (currentUser ? list.filter((e) => e.userId === currentUser) : []);
  const pending = mine(queue).sort((a, b) => a.createdAt - b.createdAt);
  const rejected = mine(failed).sort((a, b) => a.createdAt - b.createdAt);
  snapshot = {
    online,
    pending: pending.length,
    failed: rejected.length,
    items: [
      ...pending.map((e) => ({ id: e.id, kind: 'pending' as const, label: e.label, createdAt: e.createdAt })),
      ...rejected.map((e) => ({ id: e.id, kind: 'failed' as const, label: e.label, createdAt: e.createdAt, error: e.error })),
    ],
    replaying,
    notice,
  };
  listeners.forEach((l) => l());
}

export function setCurrentUser(userId: string | null) {
  currentUser = userId;
  return publish();
}

export function setOnline(value: boolean) {
  online = value;
  return publish();
}

export function flashNotice(text: string) {
  notice = { text, at: Date.now() };
  return publish();
}

// ── queueing ──────────────────────────────────────────────────────────────────

/** Where the reply to a queued create looks like the real answer, so screens carry on as if it was saved. */
export function queuedReply(path: string, body: unknown): unknown {
  const now = new Date().toISOString();
  const record = {
    ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
    id: `offline-${makeId()}`,
    createdAt: now,
    updatedAt: now,
    offline: true,
  };
  // Transactions come back wrapped ({ data }); the other create endpoints return the record itself
  return path.split('?')[0] === '/api/finance/transactions' ? { data: record } : record;
}

/** Returns the reply to hand back to the screen, or null when this can't be queued (no signed-in user, queue full...). */
export function enqueue(path: string, body: unknown): Promise<unknown | null> {
  return locked(async () => {
    if (!currentUser || !storage) return null;
    let serialisable: unknown;
    try {
      serialisable = JSON.parse(JSON.stringify(body ?? {}));
    } catch {
      return null;
    }
    const queue = await read<QueueEntry>(QUEUE_KEY);
    if (queue.length >= MAX_QUEUE) return null;

    const entry: QueueEntry = {
      id: makeId(),
      path: path.split('?')[0],
      method: 'POST',
      body: serialisable,
      userId: currentUser,
      createdAt: Date.now(),
      attempts: 0,
      label: labelFor(path, serialisable),
    };
    await write(QUEUE_KEY, [...queue, entry]);
    notice = { text: `Saved offline: ${entry.label}`, at: Date.now() };
    await publish();
    return queuedReply(path, serialisable);
  });
}

export function discard(id: string) {
  return locked(async () => {
    await write(QUEUE_KEY, (await read<QueueEntry>(QUEUE_KEY)).filter((e) => e.id !== id));
    await write(FAILED_KEY, (await read<FailedEntry>(FAILED_KEY)).filter((e) => e.id !== id));
    await publish();
  });
}

/** Moves the rejected entries of the current user back to the queue so they are tried again. */
export function retryFailed() {
  return locked(async () => {
    const failed = await read<FailedEntry>(FAILED_KEY);
    const mine = failed.filter((e) => e.userId === currentUser);
    if (mine.length === 0) return;
    const back: QueueEntry[] = mine.map(({ error: _error, status: _status, ...entry }) => ({ ...entry, attempts: 0 }));
    await write(FAILED_KEY, failed.filter((e) => e.userId !== currentUser));
    await write(QUEUE_KEY, [...(await read<QueueEntry>(QUEUE_KEY)), ...back]);
    await publish();
  });
}

// ── sending ───────────────────────────────────────────────────────────────────

const statusOf = (error: unknown) => (typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 0);
const messageOf = (error: unknown) => (error instanceof Error && error.message ? error.message : 'Rejected by the server').slice(0, 200);

/**
 * Sends the current user's entries in the order they were made. `send` performs one request and throws an error that
 * has a numeric `status` (0 = could not reach the server) when it fails.
 */
export function replay(send: (path: string, body: unknown) => Promise<unknown>): Promise<ReplayResult> {
  if (replaying || !currentUser) return Promise.resolve({ sent: 0, failed: 0, authRequired: false });
  replaying = true;

  return (async () => {
    const result: ReplayResult = { sent: 0, failed: 0, authRequired: false };
    try {
      await publish();
      const user = currentUser;
      const items = (await read<QueueEntry>(QUEUE_KEY)).filter((e) => e.userId === user).sort((a, b) => a.createdAt - b.createdAt);

      for (const item of items) {
        if (currentUser !== user) break; // someone else signed in meanwhile
        try {
          await send(item.path, item.body);
        } catch (error) {
          const status = statusOf(error);

          if (status === 0) break; // still can't reach the server: keep everything, try later
          if (status === 401 || status === 403) {
            result.authRequired = true; // signed out: keep entries until the user signs in again
            break;
          }
          if (status === 408 || status === 429 || status >= 500) {
            await locked(async () => {
              const queue = await read<QueueEntry>(QUEUE_KEY);
              const attempts = item.attempts + 1;
              if (attempts >= MAX_ATTEMPTS) {
                await write(QUEUE_KEY, queue.filter((e) => e.id !== item.id));
                await write(FAILED_KEY, [...(await read<FailedEntry>(FAILED_KEY)), { ...item, attempts, error: messageOf(error), status }]);
                result.failed++;
              } else {
                await write(QUEUE_KEY, queue.map((e) => (e.id === item.id ? { ...e, attempts } : e)));
              }
            });
            break; // the server is struggling: stop here and keep the order
          }

          // Any other 4xx: the server will never accept it as it is, so park it where the user can see it
          await locked(async () => {
            await write(QUEUE_KEY, (await read<QueueEntry>(QUEUE_KEY)).filter((e) => e.id !== item.id));
            await write(FAILED_KEY, [...(await read<FailedEntry>(FAILED_KEY)), { ...item, error: messageOf(error), status }]);
          });
          result.failed++;
          continue;
        }

        await locked(async () => {
          await write(QUEUE_KEY, (await read<QueueEntry>(QUEUE_KEY)).filter((e) => e.id !== item.id));
        });
        result.sent++;
        await publish();
      }
    } finally {
      replaying = false;
      await publish();
    }
    resultListeners.forEach((l) => l(result));
    return result;
  })();
}

/** Test helper: forget everything held in memory. */
export function __resetForTests() {
  storage = null;
  currentUser = null;
  online = true;
  replaying = false;
  notice = null;
  snapshot = { online: true, pending: 0, failed: 0, items: [], replaying: false, notice: null };
  listeners.clear();
  resultListeners.clear();
  chain = Promise.resolve();
}
