import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import { addNotificationResponseListener, notificationService } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/providers/auth';
import { BiometricsProvider, useBiometrics } from '@/providers/biometrics';
import { QueryProvider } from '@/providers/query';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootContent() {
  const router = useRouter();
  const { scheme } = useTheme();
  const { status } = useAuth();
  const { isLocked } = useBiometrics();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (signedIn) {
      void notificationService.rescheduleAll();
    }
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
      {signedIn && isLocked ? <BiometricLockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <BiometricsProvider>
                <RootContent />
              </BiometricsProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
