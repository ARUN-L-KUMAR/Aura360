/**
 * Failures that are part of normal daily use rather than bugs: the phone is offline or the request timed out (the app
 * already shows a friendly state and retries), or the server refused the request because of what the user sent or their
 * session (any 4xx). They are not reported as exceptions, otherwise a train tunnel would flood the crash reports.
 *
 * Structural checks on purpose (no import of the API client), so this stays unit-testable under plain Node.
 */
export function isExpectedFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, status } = error as { name?: unknown; status?: unknown };

  // lib/api.ts: status 0 means the server could not be reached (offline, timeout, wrong address).
  if (name === 'ApiError' && typeof status === 'number') return status === 0 || (status >= 400 && status < 500);

  // A raw fetch failure or an aborted request that was not wrapped.
  if (error instanceof Error) return name === 'AbortError' || /network request failed|failed to fetch/i.test(error.message);

  return false;
}
