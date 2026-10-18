import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HighlightedText } from '@/components/search/highlighted-text';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { GROUP_ICON, GROUP_MODULE, type SearchHit } from '@/features/search/types';
import { layout, radius, spacing, useTheme } from '@/theme';

const TILE = layout.minTouchTarget - spacing.xs; // 40, the same icon tile ListItem draws

type Props = {
  hit: SearchHit;
  tokens: string[];
  /** Position in the list, for the staggered entrance of the first rows. */
  index: number;
  onOpen: (hit: SearchHit) => void;
};

/**
 * One search result. Looks like a `ListItem` (accent icon tile, title, subtitle, value, chevron) but draws the title and
 * subtitle through `HighlightedText`, which `ListItem` (plain strings only) cannot do.
 */
export const SearchResultRow = memo(function SearchResultRow({ hit, tokens, index, onOpen }: Props) {
  const { t } = useTranslation('search');
  const { colors, accent } = useTheme();
  const { entering, exiting } = useListMotion(index);
  const { entry } = hit;
  const a = accent(GROUP_MODULE[entry.group]);
  const section = t(`groups.${entry.group}`);

  const label = useMemo(
    () => [t('resultLabel', { title: entry.title, section }), hit.subtitle, entry.meta].filter(Boolean).join(', '),
    [t, entry.title, section, hit.subtitle, entry.meta],
  );

  return (
    <Animated.View entering={entering} exiting={exiting}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('openHint')}
        onPress={() => onOpen(hit)}
        haptic={false}
        scaleTo={1}
        hitSlop={0}
        ringRadius={radius.sm}>
        {({ pressed }) => (
          <View style={[styles.row, { backgroundColor: pressed ? colors.cardMuted : 'transparent' }]}>
            <View style={[styles.tile, { backgroundColor: a.soft }]}>
              <Ionicons name={GROUP_ICON[entry.group]} size={22} color={a.text} />
            </View>
            <View style={styles.text}>
              <HighlightedText text={entry.title} tokens={tokens} weight="medium" numberOfLines={1} />
              {hit.subtitle ? <HighlightedText text={hit.subtitle} tokens={tokens} variant="caption" color="textSecondary" numberOfLines={2} /> : null}
            </View>
            {entry.meta ? (
              <Text variant="label" numeric color="textSecondary" numberOfLines={1}>
                {entry.meta}
              </Text>
            ) : null}
            <Ionicons name={directional('chevron-forward', 'chevron-back')} size={18} color={colors.textMuted} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  tile: { width: TILE, height: TILE, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
