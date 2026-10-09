import { REQUEST_TIMEOUT_MS, defaultApiUrl } from '@/lib/config';
import { storage, type StoredUser } from '@/lib/storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the server could not be reached at all (offline, server down, wrong address). */
  get isNetwork() {
    return this.status === 0;
  }
}

export type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: StoredUser;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Skip the bearer token (login, refresh...). */
  anonymous?: boolean;
  signal?: AbortSignal;
};

// Session state lives here (not in React) so every request, from any hook, sees the same tokens.
let baseUrl = defaultApiUrl();
let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionLost: (() => void) | null = null;
let onSessionRefreshed: ((user: StoredUser) => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const apiSession = {
  getBaseUrl: () => baseUrl,
  setBaseUrl(url: string) {
    baseUrl = url.replace(/\/+$/, '');
  },
  setTokens(tokens: { accessToken: string | null; refreshToken: string | null }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  },
  getRefreshToken: () => refreshToken,
  onSessionLost(handler: () => void) {
    onSessionLost = handler;
  },
  onSessionRefreshed(handler: (user: StoredUser) => void) {
    onSessionRefreshed = handler;
  },
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawFetch(path: string, options: RequestOptions, token: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  options.signal?.addEventListener('abort', () => controller.abort());

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token && !options.anonymous ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

async function parse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Exchanges the refresh token for a new pair. Refresh tokens rotate (each works once), so
 * concurrent 401s must share a single refresh call.
 * Returns false when the session could not be renewed; the user is signed out only if the
 * server actually rejected the token, not when we merely failed to reach it.
 */
function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    if (!refreshToken) return false;
    try {
      const response = await rawFetch('/api/mobile/auth/refresh', { method: 'POST', body: { refreshToken }, anonymous: true }, null);
      if (response.status === 401) {
        onSessionLost?.();
        return false;
      }
      if (!response.ok) return false;

      const session = (await parse(response)) as SessionResponse;
      accessToken = session.accessToken;
      refreshToken = session.refreshToken;
      await storage.saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      await storage.saveUser(session.user);
      onSessionRefreshed?.(session.user);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawFetch(path, options, accessToken);

  if (response.status === 401 && !options.anonymous && refreshToken) {
    if (await refreshSession()) {
      response = await rawFetch(path, options, accessToken);
    }
  }

  const data = await parse(response);
  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

/**
 * Like api(), but returns the raw Response so the caller can read a streaming body (server-sent
 * events). Signs in / refreshes the token the same way and throws ApiError for non-2xx answers.
 */
export async function apiStream(path: string, options: RequestOptions = {}): Promise<Response> {
  let response = await rawFetch(path, options, accessToken);

  if (response.status === 401 && !options.anonymous && refreshToken) {
    if (await refreshSession()) {
      response = await rawFetch(path, options, accessToken);
    }
  }

  if (!response.ok) {
    const data = await parse(response);
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return response;
}

api.get = <T = unknown>(path: string, options?: Omit<RequestOptions, 'method'>) =>
  api<T>(path, { ...options, method: 'GET' });

api.post = <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  api<T>(path, { ...options, method: 'POST', body });

api.patch = <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
  api<T>(path, { ...options, method: 'PATCH', body });

api.delete = <T = unknown>(path: string, options?: Omit<RequestOptions, 'method'>) =>
  api<T>(path, { ...options, method: 'DELETE' });

