import { ApiError } from '@/lib/api';

/**
 * The message for a failed action: the "you're offline" copy when the server could not be reached, otherwise the
 * friendly `fallback` for the action. Raw server text is never shown. Both strings come from the caller's catalog.
 */
export function friendlyError(error: unknown, fallback: string, offline: string): string {
  return error instanceof ApiError && error.isNetwork ? offline : fallback;
}
