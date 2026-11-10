import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import type { TransactionDraft } from '@/components/finance/receipt';
import { scanPayment } from '@/features/finance/hooks';
import { CATEGORY_OPTIONS } from '@/features/finance/types';
import { ApiError } from '@/lib/api';

import { buildDraft, hasAnyDetail, normalizeScan } from './draft';
import { ImportFailure, codeForApiFailure } from './error-code';
import { getItem, markFailed, markReading, markReview, markSkipped } from './inbox';
import { findLedgerDuplicates } from './ledger-check';
import { StageError, readStagedBase64 } from './stage';
import type { ImportErrorCode, ShareItem } from './types';

function importErrorFor(error: unknown): ImportErrorCode {
  if (error instanceof ImportFailure || error instanceof StageError) return error.code;
  if (error instanceof ApiError) return codeForApiFailure(error.status, (error.data as { timeout?: boolean } | undefined)?.timeout === true);
  return 'server';
}

/**
 * Reads the screenshot being worked on and, when that works, opens the existing transaction form with the result.
 * Reading starts by itself once an item is ready, unless the app is locked or the person still has to decide about a
 * screenshot they handled before. Everything the form shows (and the save itself) is the Finance module's own.
 */
export function useImportRunner(item: ShareItem | null, paused: boolean) {
  const router = useRouter();
  const inFlight = useRef<AbortController | null>(null);

  const openForm = useCallback(
    (draft: TransactionDraft) => {
      router.push({ pathname: '/finance/transaction', params: { draft: JSON.stringify(draft) } });
    },
    [router],
  );

  const read = useCallback(
    async (id: string) => {
      const target = getItem(id);
      if (!target || target.status !== 'ready' || !target.fileUri) return;

      const controller = new AbortController();
      inFlight.current = controller;
      markReading(id);
      try {
        const base64 = await readStagedBase64(target.fileUri);
        const response = await scanPayment({ base64, mimeType: target.mimeType, signal: controller.signal });
        const payment = normalizeScan(response?.data);
        if (!payment || !payment.isPayment || !hasAnyDetail(payment)) throw new ImportFailure('notPayment');

        const duplicates = await findLedgerDuplicates(payment, controller.signal);
        // Skipped or discarded while the server was working: drop the result.
        if (getItem(id)?.status !== 'reading') return;

        const draft = buildDraft(payment, {
          itemId: id,
          categories: { expense: CATEGORY_OPTIONS.expense, income: CATEGORY_OPTIONS.income },
          duplicates,
        });
        markReview(id, draft);
        openForm(draft);
      } catch (error) {
        if (controller.signal.aborted || getItem(id)?.status !== 'reading') return;
        markFailed(id, importErrorFor(error));
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
      }
    },
    [openForm],
  );

  const waitingForPerson = !!item?.seenBefore && !item.importAgain;
  const readyId = item && item.status === 'ready' && !paused && !waitingForPerson ? item.id : null;
  useEffect(() => {
    if (readyId) void read(readyId);
  }, [readyId, read]);

  // Leaving the screen stops a read that is still going.
  useEffect(() => () => inFlight.current?.abort(), []);

  const cancel = useCallback((id: string) => {
    inFlight.current?.abort();
    markSkipped(id);
  }, []);

  return { openForm, cancel };
}
