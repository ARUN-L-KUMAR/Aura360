/**
 * Maps whatever went wrong to one of the few reasons the import screen words for the person. Pure (no imports of the
 * API client), so it runs under plain Node in tests/.
 */
import type { ImportErrorCode, ShareItem } from './types.ts';

export class ImportFailure extends Error {
  code: ImportErrorCode;

  // No `public code` parameter property: Node's type stripping (used by the tests) cannot run those.
  constructor(code: ImportErrorCode) {
    super(code);
    this.name = 'ImportFailure';
    this.code = code;
  }
}

/** `status` 0 means the server could not be reached at all (see ApiError.isNetwork); `timedOut` then tells slow from offline. */
export function codeForApiFailure(status: number, timedOut: boolean): ImportErrorCode {
  if (status === 0) return timedOut ? 'timeout' : 'network';
  if (status === 401) return 'session';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 413) return 'tooLarge';
  if (status === 415) return 'unsupportedType';
  return 'server';
}

/**
 * Whether "Try again" can change the outcome. A file that is the wrong type, too large or not a payment will fail the
 * same way again; a copy that could not be made may work now; the network and the server may recover.
 */
export function canRetry(item: Pick<ShareItem, 'error' | 'fileUri'>): boolean {
  switch (item.error) {
    case 'network':
    case 'timeout':
    case 'server':
      return true;
    case 'unreadable':
      return item.fileUri === null;
    default:
      return false;
  }
}
