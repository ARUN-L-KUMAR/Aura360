import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { storage } from '@/lib/storage';

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

export type BiometricsContextValue = {
  isAvailable: boolean;
  biometricType: BiometricType;
  biometricLabel: string;
  isEnabled: boolean;
  isLocked: boolean;
  toggleBiometrics: (enable: boolean) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
};

const BiometricsContext = createContext<BiometricsContextValue | null>(null);

export function BiometricsProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Aura360',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });

      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLocked(false);
        return true;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } catch {
      return false;
    }
  }, []);

  // Check hardware and enrollment on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const available = hasHardware && isEnrolled;
        if (!mounted) return;
        setIsAvailable(available);

        if (available) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('face');
            setBiometricLabel('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
            setBiometricLabel('Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('iris');
            setBiometricLabel('Iris Scan');
          } else {
            setBiometricType('fingerprint');
            setBiometricLabel('Biometrics');
          }
        }

        const savedEnabled = await storage.getBiometricEnabled();
        if (!mounted) return;
        const active = savedEnabled && available;
        setIsEnabled(active);
        if (active) {
          setIsLocked(true);
          // Prompt authentication asynchronously
          void LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Aura360',
            cancelLabel: 'Cancel',
            fallbackLabel: 'Use Device Passcode',
            disableDeviceFallback: false,
          }).then((res) => {
            if (mounted && res.success) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setIsLocked(false);
            }
          });
        }
      } catch {
        if (!mounted) return;
        setIsAvailable(false);
        setIsEnabled(false);
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  // Lock and prompt when returning from background
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active' && isEnabled) {
        setIsLocked(true);
        void authenticate();
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isEnabled, authenticate]);

  const toggleBiometrics = useCallback(
    async (enable: boolean): Promise<boolean> => {
      if (enable) {
        const ok = await authenticate();
        if (ok) {
          setIsEnabled(true);
          await storage.setBiometricEnabled(true);
          return true;
        }
        return false;
      }

      setIsEnabled(false);
      setIsLocked(false);
      await storage.setBiometricEnabled(false);
      return true;
    },
    [authenticate]
  );

  return (
    <BiometricsContext.Provider
      value={{
        isAvailable,
        biometricType,
        biometricLabel,
        isEnabled,
        isLocked,
        toggleBiometrics,
        authenticate,
      }}>
      {children}
    </BiometricsContext.Provider>
  );
}

export function useBiometrics(): BiometricsContextValue {
  const context = useContext(BiometricsContext);
  if (!context) {
    return {
      isAvailable: false,
      biometricType: 'none',
      biometricLabel: 'Biometrics',
      isEnabled: false,
      isLocked: false,
      toggleBiometrics: async () => false,
      authenticate: async () => false,
    };
  }
  return context;
}
