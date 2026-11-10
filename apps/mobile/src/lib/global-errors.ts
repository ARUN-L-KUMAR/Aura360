import { analytics } from '@/lib/telemetry';

type Handler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = { getGlobalHandler: () => Handler; setGlobalHandler: (handler: Handler) => void };

let installed = false;

/**
 * Reports uncaught JS errors (outside React rendering) to telemetry, then hands them to the original handler so
 * React Native's red box / crash behaviour is unchanged. Safe to call more than once.
 */
export function installGlobalErrorHandler() {
  if (installed) return;
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!utils) return;
  installed = true;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    analytics.captureException(error, { where: 'global', fatal: !!isFatal });
    previous(error, isFatal);
  });
}
