import { analytics } from '@/lib/telemetry';
import { syncNow } from '@/providers/offline';

/**
 * "Sync now" / "Retry" pressed by the user. Same as `syncNow()`, and reports the outcome (counts only) when something was
 * actually sent or rejected. Background syncs go through `syncNow()` directly and are not reported here.
 */
export async function runManualSync() {
  const result = await syncNow();
  if (result.sent > 0 || result.failed > 0) analytics.track('sync_completed', { sent: result.sent, failed: result.failed });
  return result;
}
