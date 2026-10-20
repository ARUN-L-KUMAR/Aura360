import { useRootNavigationState, useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';

import { captureNativeShare, discardAll, needsScreen, setScreenOpen } from './inbox';
import { sweepStaleStaged } from './stage';
import { useShareInbox } from './use-share-inbox';

const SHARE_IMPORT = '/finance/share-import' as Href;

/**
 * Mounted once, in the root layout. It has no UI of its own; it decides *when* the import screen may open:
 * only for a signed-in person, once the biometric lock has made its first decision and is open, and once the router has
 * a navigator to push onto. Until then a share simply waits in the inbox, which is how a share that arrives while
 * signed out survives the sign-in.
 */
export function ShareIntake() {
  const router = useRouter();
  const { status } = useAuth();
  const { isLocked, isReady } = useBiometrics();
  const snapshot = useShareInbox();
  const rootState = useRootNavigationState();
  const signedIn = status === 'signedIn';
  const wasSignedIn = useRef(false);

  // Once per launch: remove copies a past session left behind, and pick up a share the launch link did not carry (the
  // router only waits a moment for that link). Capturing is harmless when there is nothing: the native copy is cleared
  // as soon as it is read, so a share can never be read twice.
  useEffect(() => {
    sweepStaleStaged();
    captureNativeShare();
  }, []);

  // Signing out ends the session: screenshots of someone's payments must not wait around for whoever signs in next.
  useEffect(() => {
    if (wasSignedIn.current && status === 'signedOut') discardAll();
    wasSignedIn.current = signedIn;
  }, [status, signedIn]);

  const waiting = needsScreen(snapshot);
  const routerReady = !!rootState?.key;
  useEffect(() => {
    if (!waiting || !signedIn || !isReady || isLocked || !routerReady) return;
    // Claimed before the screen exists, so a second share arriving meanwhile cannot open a second screen.
    setScreenOpen(true);
    try {
      router.push(SHARE_IMPORT);
    } catch {
      setScreenOpen(false);
    }
  }, [waiting, signedIn, isReady, isLocked, routerReady, router]);

  return null;
}
