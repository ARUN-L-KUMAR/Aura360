import { errorKindFromError } from '@/components/ui/error-state';
import { useTranslation } from '@/i18n';
import { ApiError } from '@/lib/api';

/**
 * Turns a failed save/delete into the sentence for the error toast: a lost connection, a timeout and an expired
 * session each get their own message; a validation message from the server is passed on; anything else uses
 * the caller's `fallback`.
 */
export function useErrorMessage() {
  const { t } = useTranslation('food');
  return (error: unknown, fallback: string): string => {
    const kind = errorKindFromError(error);
    if (kind === 'network') return t('errors.network');
    if (kind === 'timeout') return t('errors.timeout');
    if (kind === 'sessionExpired') return t('errors.sessionExpired');
    if (error instanceof ApiError && (error.status === 400 || error.status === 422) && error.message) return error.message;
    return fallback;
  };
}
