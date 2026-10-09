import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import type { ModuleInfo } from '@/features/modules';
import { radius, spacing } from '@/theme';

/** Stand-in for modules whose mobile screens are still being built. */
export function ComingSoon({ module }: { module: ModuleInfo }) {
  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: `${module.color}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name={module.icon} size={30} color={module.color} />
        </View>
        <Text variant="heading">{module.label}</Text>
        <Text muted style={{ textAlign: 'center' }}>
          {module.blurb}
        </Text>
        <Text variant="caption" muted>
          This screen is coming soon in the mobile app.
        </Text>
      </Card>
    </Screen>
  );
}
