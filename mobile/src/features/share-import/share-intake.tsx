import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';

import { captureNativeShare, discardAll, needsScreen } from './inbox';
import { discardLink, usePendingLink } from './link-inbox';
import { sweepStaleStaged } from './stage';
import { trace } from './trace';
import { useShareInbox } from './use-share-inbox';

const SHARE_IMPORT = '/finance/share-import' as Href;
const SAVE_LINK = '/saved/add' as Href;
/** If the import screen has not reported that it opened this long after the request, the request is made again. */
const RETRY_AFTER_MS = 1500;
const MAX_ATTEMPTS = 10;

/**
 * Mounted once, in the root layout. It has no UI of its own; it decides *when* the import screen may open, and makes sure
 * it does:
 *  - only for a signed-in person, once the biometric lock has made its first decision and is open, and once the signed-in
 *    part of the app is the active one (right after sign-in or launch the navigator is not ready for requests yet, and a
 *    request made then is dropped without any error);
 *  - the request is repeated until the screen itself reports that it opened (it marks the inbox when it mounts), so a
 *    dropped request cannot leave a share waiting forever. `navigate` is used, not `push`, so a repeat can never stack a
 *    second import screen.
 * Until then a share simply waits in the inbox, which is how a share that arrives while signed out survives the sign-in.
 *
 * A shared link (a product from a shopping app) is handled the same way, but it opens Save a link (`/saved/add`) instead,
 * which takes the link over, reads it and files it under Fashion or Saved.
 */
export function ShareIntake() {
  const router = useRouter();
  const segments = useSegments();
  const { status } = useAuth();
  const { isLocked, isReady } = useBiometrics();
  const snapshot = useShareInbox();
  const link = usePendingLink();
  const signedIn = status === 'signedIn';
  const inApp = (segments as readonly string[])[0] === '(app)';
  const wasSignedIn = useRef(false);
  const attempts = useRef(0);
  const linkAttempts = useRef(0);
  const [retry, setRetry] = useState(0);
  const [linkRetry, setLinkRetry] = useState(0);

  // Once per launch: remove copies a past session left behind, and pick up a share the launch link did not carry (the
  // router only waits a moment for that link). Capturing is harmless when there is nothing: the native copy is cleared as
  // soon as it is read, so a share can never be read twice.
  useEffect(() => {
    sweepStaleStaged();
    captureNativeShare();
  }, []);

  // Coming back to the app: the share link is the main signal that something arrived, but it can be missed, so look
  // again. (expo-sharing's own hook does the same.)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') captureNativeShare();
    });
    return () => subscription.remove();
  }, []);

  // Signing out ends the session: screenshots of someone's payments must not wait around for whoever signs in next.
  useEffect(() => {
    if (wasSignedIn.current && status === 'signedOut') {
      discardAll();
      discardLink();
    }
    wasSignedIn.current = signedIn;
  }, [status, signedIn]);

  const waiting = needsScreen(snapshot);
  useEffect(() => {
    if (!waiting) {
      attempts.current = 0;
      return;
    }
    if (!signedIn || !isReady || isLocked || !inApp || attempts.current >= MAX_ATTEMPTS) return;

    attempts.current += 1;
    trace(`opening the import screen (try ${attempts.current})`);
    try {
      router.navigate(SHARE_IMPORT);
    } catch {
      trace('the router was not ready to open the import screen');
    }
    // The screen ends this wait by opening. If it has not by the time this fires, ask again.
    const timer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [waiting, signedIn, isReady, isLocked, inApp, router, retry]);

  // A shared link: same conditions, same repeat-until-it-opened rule. The Save-a-link screen ends the wait by taking the link.
  const linkId = link?.id ?? null;
  useEffect(() => {
    if (linkId === null) {
      linkAttempts.current = 0;
      return;
    }
    if (!signedIn || !isReady || isLocked || !inApp || linkAttempts.current >= MAX_ATTEMPTS) return;

    linkAttempts.current += 1;
    trace(`opening the save-a-link screen (try ${linkAttempts.current})`);
    try {
      router.navigate(SAVE_LINK);
    } catch {
      trace('the router was not ready to open the save-a-link screen');
    }
    const timer = setTimeout(() => setLinkRetry((n) => n + 1), RETRY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [linkId, signedIn, isReady, isLocked, inApp, router, linkRetry]);

  return null;
}
