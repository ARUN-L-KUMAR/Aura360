import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { modules, type ModuleKey } from '@/features/modules';
import { useAuth } from '@/providers/auth';
import { radius, spacing, useTheme } from '@/theme';

const ITEMS: ModuleKey[] = ['ai', 'notes', 'saved', 'fashion', 'skincare', 'time'];

export default function MoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  return (
    <Screen>
      <Text variant="title">More</Text>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {ITEMS.map((key, index) => {
          const info = modules[key];
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => router.push(info.href as Href)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: `${info.color}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={info.icon} size={20} color={info.color} />
              </View>
              <Text style={{ flex: 1 }}>{info.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
          <View style={{ flex: 1 }}>
            <Text>Settings</Text>
            <Text variant="caption" muted>
              {user?.email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>
    </Screen>
  );
}
