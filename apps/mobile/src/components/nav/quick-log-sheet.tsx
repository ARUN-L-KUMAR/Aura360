import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { openMeal } from '@/components/food/meal-row';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { modules, type IconName, type ModuleKey } from '@/features/modules';
import { suggestMealType } from '@/features/food/types';
import { useTranslation } from '@/i18n';
import { duration, layout, radius, spacing, useTheme } from '@/theme';

type LogItem = { key: string; module: ModuleKey; icon: IconName; label: string; hint: string; run: () => void };

type Props = { visible: boolean; onClose: () => void };

/**
 * The centre "+" of the bar: one grid of every "create" flow in the app. Each tile opens the same modal the module's own
 * add button opens, with the module accent, so it is the shortest way to log anything from anywhere.
 */
export function QuickLogSheet({ visible, onClose }: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { colors } = useTheme();

  const items = useMemo<LogItem[]>(
    () => [
      { key: 'transaction', module: 'finance', icon: 'cash-outline', label: t('nav.log_items.transaction.label'), hint: t('nav.log_items.transaction.hint'), run: () => router.push('/finance/transaction') },
      { key: 'meal', module: 'food', icon: 'restaurant-outline', label: t('nav.log_items.meal.label'), hint: t('nav.log_items.meal.hint'), run: () => openMeal(router, { mealType: suggestMealType() }) },
      { key: 'workout', module: 'fitness', icon: 'barbell-outline', label: t('nav.log_items.workout.label'), hint: t('nav.log_items.workout.hint'), run: () => router.push('/fitness/workout') },
      { key: 'activity', module: 'fitness', icon: 'pulse-outline', label: t('nav.log_items.activity.label'), hint: t('nav.log_items.activity.hint'), run: () => router.push('/fitness/entry') },
      { key: 'note', module: 'notes', icon: 'document-text-outline', label: t('nav.log_items.note.label'), hint: t('nav.log_items.note.hint'), run: () => router.push('/notes/edit') },
      { key: 'time', module: 'time', icon: 'time-outline', label: t('nav.log_items.time.label'), hint: t('nav.log_items.time.hint'), run: () => router.push('/time/log') },
      { key: 'link', module: 'saved', icon: 'bookmark-outline', label: t('nav.log_items.link.label'), hint: t('nav.log_items.link.hint'), run: () => router.push('/saved/add') },
      { key: 'fashion', module: 'fashion', icon: 'shirt-outline', label: t('nav.log_items.fashion.label'), hint: t('nav.log_items.fashion.hint'), run: () => router.push('/fashion/add') },
    ],
    [router, t],
  );

  return (
    <BottomSheet glass visible={visible} onClose={onClose} title={t('nav.logTitle')} scrollable>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
        <Text variant="caption" color="textSecondary">
          {t('nav.logSubtitle')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {items.map((item) => (
            <PressableScale
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.hint}`}
              haptic="tap"
              ringRadius={radius.xl}
              onPress={() => {
                onClose();
                // Let the sheet leave first so the modal route does not open underneath it.
                setTimeout(item.run, duration.base);
              }}
              style={{
                flexGrow: 1,
                flexBasis: layout.minTouchTarget * 3,
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}>
              <IconTile icon={item.icon} accent={modules[item.module].key} />
              <View style={{ gap: 2 }}>
                <Text variant="label" weight="semiBold" numberOfLines={1}>
                  {item.label}
                </Text>
                <Text variant="caption" color="textMuted" numberOfLines={2}>
                  {item.hint}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
