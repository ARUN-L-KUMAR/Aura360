import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { MASCOTS } from '@/features/ai/mascot/characters';
import { useMascot } from '@/features/ai/mascot/selection';
import { MASCOT_THUMBNAILS } from '@/features/ai/mascot/thumbnails';
import { haptics } from '@/lib/haptics';
import { layout, spacing, useTheme } from '@/theme';

import { Text } from '@/components/ui/text';

/** Settings > Aura Assistant: pick which mascot shows in the floating bubble and chat sheet. */
export function MascotPicker() {
  const { colors, accent } = useTheme();
  const [selected, setMascot] = useMascot();
  const ai = accent('ai');

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: layout.cardPadding }}>
      {MASCOTS.map((m) => {
        const active = m.id === selected;
        return (
          <Pressable
            key={m.id}
            onPress={() => {
              haptics.tap();
              setMascot(m.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m.name}
            style={{ alignItems: 'center', gap: spacing.xs, width: 68 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: 'hidden',
                borderWidth: active ? 2 : 1,
                borderColor: active ? ai.solid : colors.border,
                backgroundColor: colors.card,
              }}>
              <Image source={MASCOT_THUMBNAILS[m.id]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              {active ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: ai.solid,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="checkmark" size={13} color={ai.onSolid} />
                </View>
              ) : null}
            </View>
            <Text variant="caption" weight={active ? 'bold' : 'regular'} color={active ? undefined : 'textSecondary'}>
              {m.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
