import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { formatDay, greeting, todayIso } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { radius, spacing, useTheme } from '@/theme';

const NO_BREAK_SPACE = ' ';

type Props = {
  /** First name; empty falls back to a neutral word. */
  name: string;
  /** Consecutive active days. Hidden at 0. */
  streak: number;
};

/**
 * The top of Home: the person's picture, a greeting with today's date, the Customize Home button and the running streak
 * as a small pill (flame and number, so the greeting keeps its room). Compact on purpose: the day's numbers are the
 * headline, not the welcome.
 */
export const GreetingBar = memo(function GreetingBar({ name, streak }: Props) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { accent } = useTheme();
  const { user } = useAuth();
  const fitness = accent('fitness');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('bar.account')} haptic="tap" ringRadius={radius.pill} onPress={() => router.push('/settings')}>
        <Avatar name={user?.name || user?.email || name} uri={user?.image} size="lg" />
      </PressableScale>
      <View style={{ flex: 1, gap: 2 }}>
        {/* The date keeps its words together, so a narrow screen breaks the line after the dot, never inside it. */}
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {greeting()} · {formatDay(todayIso()).replace(/ /g, NO_BREAK_SPACE)}
        </Text>
        <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {name || t('hero.fallbackName')}
        </Text>
      </View>
      <IconButton icon="options-outline" accessibilityLabel={t('customize.linkLabel')} onPress={() => router.push('/home/customize' as never)} />
      {streak > 0 ? (
        <View
          accessible
          accessibilityLabel={t('bar.streakLabel', { count: streak })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, minHeight: spacing.xxl + spacing.xs, borderRadius: radius.pill, backgroundColor: fitness.soft }}>
          <Ionicons name="flame" size={16} color={fitness.text} />
          <Text variant="label" weight="bold" numeric style={{ color: fitness.text }}>
            {streak}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
