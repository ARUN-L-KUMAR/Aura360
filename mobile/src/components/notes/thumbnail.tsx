import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { duration, useTheme } from '@/theme';

/**
 * Wide picture for a saved link: a shimmering skeleton while it loads, an opacity-only fade-in once it has (none under reduce-motion), and a quiet icon tile
 * if the picture cannot be fetched. Decorative (the title next to it says what the item is).
 */
export function Thumbnail({ uri, aspectRatio = 16 / 9 }: { uri: string; aspectRatio?: number }) {
  const { colors, reduceMotion } = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [height, setHeight] = useState(0);

  return (
    <View
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={{ aspectRatio, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {state === 'loading' && height > 0 ? <Skeleton rounded={0} height={height} style={StyleSheet.absoluteFill} /> : null}
      {state === 'failed' ? (
        <Ionicons name="image-outline" size={32} color={colors.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
      ) : (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={reduceMotion ? 0 : duration.fast}
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}
