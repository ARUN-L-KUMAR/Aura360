import { i18n } from '@/i18n';
import { ApiError } from '@/lib/api';

/** Longest server message that is shown as-is. Anything longer is probably a stack trace or an HTML error page. */
const MAX_SERVER_MESSAGE = 160;

/**
 * A friendly, localised message for anything a request threw, for toasts and inline form errors.
 *
 * - no connection, timeout and an expired session each get their own wording;
 * - a 4xx answer shows the server's own message (it is written for people, e.g. "Email not verified");
 * - a 5xx answer and unknown errors show `fallback` (what failed, e.g. "Couldn't save your settings") so internals
 *   never leak into the UI.
 *
 * `options.unauthorized` replaces the "session expired" wording for a 401.
 *
 * The shared wording lives in `settings.json` under `errors`.
 */
export function userErrorMessage(error: unknown, fallback?: string, options: { unauthorized?: string } = {}): string {
  const generic = fallback ?? i18n.t('settings:errors.generic');

  if (error instanceof ApiError) {
    if (error.status === 0) {
      const timedOut = (error.data as { timeout?: boolean } | undefined)?.timeout;
      return timedOut ? i18n.t('settings:errors.timeout') : i18n.t('settings:errors.network');
    }
    // On a sign-in screen a 401 means wrong details, not an expired session: callers pass their own wording.
    if (error.status === 401) return options.unauthorized ?? i18n.t('settings:errors.sessionExpired');
    if (error.status === 408 || error.status === 504) return i18n.t('settings:errors.timeout');
    if (error.status >= 500) return generic;
    const message = error.message.trim();
    return message && message.length <= MAX_SERVER_MESSAGE ? message : generic;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') return i18n.t('settings:errors.timeout');
    if (/network request failed|failed to fetch|network error|offline/i.test(error.message)) return i18n.t('settings:errors.network');
  }
  return generic;
}
