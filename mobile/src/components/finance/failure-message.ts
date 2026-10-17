import { i18n } from '@/i18n';
import { ApiError } from '@/lib/api';

/**
 * The message to show when a request fails, telling the common cases apart: offline, timed out, signed out, and a
 * rejection the server explained (4xx, its own words are safe to show). Everything else gets `fallback`.
 * Shared by the Finance, Time and Fashion screens, so the wording stays the same everywhere.
 */
export function failureMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return (error.data as { timeout?: boolean } | undefined)?.timeout ? i18n.t('finance:errors.timeout') : i18n.t('finance:errors.network');
    }
    if (error.status === 401) return i18n.t('finance:errors.session');
    if (error.status === 408 || error.status === 504) return i18n.t('finance:errors.timeout');
    const explained = error.status >= 400 && error.status < 500 && error.message.trim() && !/^Request failed \(\d+\)$/.test(error.message);
    if (explained) return error.message.trim();
  }
  return fallback;
}
