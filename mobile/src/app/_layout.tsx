import '@/i18n';

import { Stack, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// One import per weight: the package's top-level entry would bundle every weight (about 3 MB of unused fonts).
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';

import { AnimatedSplash } from '@/components/animated-splash';
import { ErrorBoundary } from '@/components/error-boundary';
import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import { addNotificationResponseListener, notificationService } from '@/lib/notifications';
import { installGlobalErrorHandler } from '@/lib/global-errors';
import { isNotificationPermissionGranted } from '@/lib/notification-permission';
import { registerForServerPush } from '@/lib/push';
import { PREVIEW } from '@/preview/flag';
import { analytics } from '@/lib/telemetry';
import { AuthProvider, useAuth } from '@/providers/auth';
import { NotifyProvider } from '@/providers/notify';
import { OfflineProvider } from '@/providers/offline';
import { BiometricsProvider, useBiometrics } from '@/providers/biometrics';
import { QueryProvider } from '@/providers/query';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();
// Preview builds (npm run preview:web) answer the API with sample data. PREVIEW is a build-time constant, so this
// branch and the preview code are dropped from real builds.
if (PREVIEW) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('@/preview/install') as typeof import('@/preview/install')).installPreview();
}

function RootStack() {
  const { status } = useAuth();
  const { reduceMotion } = useTheme();

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/** Reports each screen the user opens (route path only: no params, no content). */
function useScreenTracking() {
  const pathname = usePathname();
  useEffect(() => {
    analytics.screen(pathname);
  }, [pathname]);
}

function RootContent() {
  useScreenTracking();
  const router = useRouter();
  const { scheme } = useTheme();
  const { status } = useAuth();
  const { isLocked } = useBiometrics();
  const signedIn = status === 'signedIn';
  const [splashDone, setSplashDone] = useState(PREVIEW); // preview builds skip the animated splash
  const finishSplash = useCallback(() => setSplashDone(true), []);

  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
  });

  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || !!fontError || fontTimeout;

  // The animated splash hides the native one once it is drawn. This is only a safety net in case it never mounts.
  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keep reminders and push registration in sync at launch, but never trigger the system permission prompt from here:
  // the first request is made by the permissions screen (after sign-in) or from Settings, with an explanation.
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void isNotificationPermissionGranted().then((granted) => {
      if (cancelled || !granted) return;
      void notificationService.rescheduleAll();
      void registerForServerPush();
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const route = response?.notification?.request?.content?.data?.route;
      if (typeof route === 'string') {
        router.push(route as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootStack />
      {!splashDone && <AnimatedSplash ready={status !== 'loading' && fontsReady} onFinish={finishSplash} />}
      {signedIn && isLocked ? <BiometricLockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <QueryProvider>
          <AuthProvider>
            <OfflineProvider>
              <ThemeProvider>
                <NotifyProvider>
                  <BiometricsProvider>
                    <RootContent />
                  </BiometricsProvider>
                </NotifyProvider>
              </ThemeProvider>
            </OfflineProvider>
          </AuthProvider>
        </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
