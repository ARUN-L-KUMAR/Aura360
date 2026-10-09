import { Alert, View } from 'react-native';
import Constants from 'expo-constants';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/providers/auth';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const { user, signOut, serverUrl } = useAuth();

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen topInset={false}>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="heading">{user?.name ?? 'Your account'}</Text>
        <Text muted>{user?.email}</Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <View>
          <Text variant="caption" muted>
            Server
          </Text>
          <Text>{serverUrl}</Text>
        </View>
        <View>
          <Text variant="caption" muted>
            Version
          </Text>
          <Text>{Constants.expoConfig?.version ?? '—'}</Text>
        </View>
      </Card>

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}
