import { captureNativeShare } from '@/features/share-import/inbox';

/**
 * Expo Router calls this for every link the app is opened with: the launch link (`initial: true`) and each link that
 * arrives while the app is already running (`initial: false`).
 *
 * When another app shares a screenshot (a payment) or a link (a product from a shopping app) with Aura360, Android sends a
 * SEND intent, which carries no link of its own. expo-sharing
 * turns it into `<scheme>://expo-sharing` so that navigation hears about it. That link is not a screen: here the shared
 * items are taken into the inbox (once; the native copy is cleared as they are read) and navigation is left alone.
 * The import screen is opened by features/share-import/share-intake.tsx when the person is signed in and unlocked,
 * which is the same for a cold start and for an app that was already open.
 */
const SHARE_LINK = /^[a-z][a-z0-9+.-]*:\/\/expo-sharing(?:[/?#]|$)/i;

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  try {
    if (typeof path === 'string' && SHARE_LINK.test(path)) {
      // Android has just told us something was shared: if nothing readable comes with it, say so rather than stay silent.
      captureNativeShare({ announce: true });
      // A launch needs some screen: the normal start screen. An empty path while running means "stay where you are".
      return initial ? '/' : '';
    }
  } catch {
    // A failure here must never stop the app from opening.
  }
  return path;
}
