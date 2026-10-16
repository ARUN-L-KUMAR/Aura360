import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import type { ModuleInfo } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

/** Stand-in for modules whose mobile screens are still being built. */
export function ComingSoon({ module }: { module: ModuleInfo }) {
  const { accent } = useTheme();
  const a = accent(module.key);

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card
        variant="tinted"
        accent={module.key}
        accessible
        accessibilityLabel={`${module.label}. ${module.blurb} Coming soon to the mobile app.`}
        padding="lg"
        style={{ alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: a.solid,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={module.icon} size={30} color={a.onSolid} />
        </View>
        <Text variant="title" accessibilityRole="header">
          {module.label}
        </Text>
        <Text color="textSecondary" style={{ textAlign: 'center' }}>
          {module.blurb}
        </Text>
        <Badge label="Coming soon" severity="info" icon="time-outline" />
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          This screen is on its way to the mobile app.
        </Text>
      </Card>
    </Screen>
  );
}
