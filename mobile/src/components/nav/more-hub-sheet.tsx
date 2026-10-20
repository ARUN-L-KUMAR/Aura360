import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SlotPicker } from '@/components/nav/slot-picker';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { modules, type IconName, type ModuleKey } from '@/features/modules';
import { PINNABLE_MODULES, slotOf, type SlotIndex } from '@/features/nav/slots';
import { useTabSlots } from '@/features/nav/use-tab-slots';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { duration, layout, radius, spacing, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Open straight into "customize" for this slot (long press on a pinned tab). */
  customizeSlot?: SlotIndex | null;
};

type Shortcut = { key: string; icon: IconName; label: string; href: Href };

/**
 * Everything that has no room in the bar: every module as a tile (with how many items it holds), shortcuts to search,
 * notifications and settings, and "Customize bar" to choose the two pinned modules.
 */
export function MoreHubSheet({ visible, onClose, customizeSlot = null }: Props) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { colors, accent } = useTheme();
  const { slots, setSlot, reset } = useTabSlots();
  const { data } = useDashboard();
  const [customizing, setCustomizing] = useState(false);
  const [editing, setEditing] = useState<SlotIndex>(0);

  // Each time the sheet opens, start from where the opener asked: plain browse, or customizing a given slot.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setCustomizing(customizeSlot !== null);
      if (customizeSlot !== null) setEditing(customizeSlot);
    }
  }

  const go = (href: Href) => {
    onClose();
    setTimeout(() => router.navigate(href), duration.base);
  };

  const shortcuts: Shortcut[] = [
    { key: 'search', icon: 'search-outline', label: t('nav.hub.search'), href: '/search' as Href },
    { key: 'notifications', icon: 'notifications-outline', label: t('nav.hub.notifications'), href: '/notifications' as Href },
    { key: 'settings', icon: 'settings-outline', label: t('nav.hub.settings'), href: '/settings' as Href },
  ];

  const count = (key: ModuleKey) => (key === 'ai' ? undefined : data?.counts[key]);

  return (
    <BottomSheet glass visible={visible} onClose={onClose} title={customizing ? t('nav.hub.customizeTitle') : t('nav.hub.title')} scrollable>
      {customizing ? (
        <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
          <Text variant="caption" color="textSecondary">
            {t('nav.hub.customizeHint', { slot: editing + 1 })}
          </Text>
          <SlotPicker slots={slots} editing={editing} onEditingChange={setEditing} onAssign={setSlot} />
          <Text variant="caption" color="textMuted">
            {t('nav.hub.deviceOnly')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title={t('nav.hub.reset')} variant="tertiary" onPress={reset} style={{ flex: 1 }} />
            <Button title={t('nav.hub.customizeDone')} onPress={() => setCustomizing(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.xl, paddingBottom: spacing.lg }}>
          <Text variant="caption" color="textSecondary">
            {t('nav.hub.subtitle')}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {PINNABLE_MODULES.map((key) => {
              const module = modules[key];
              const pinned = slotOf(slots, key) !== -1;
              const n = count(key);
              const a = accent(key);
              return (
                <PressableScale
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={[module.label, pinned ? t('nav.hub.pinned') : null, typeof n === 'number' ? t('nav.hub.itemsCount', { count: n }) : null].filter(Boolean).join(', ')}
                  haptic="tap"
                  ringRadius={radius.xl}
                  onPress={() => go(module.href as Href)}
                  style={{
                    flexGrow: 1,
                    flexBasis: layout.minTouchTarget * 3,
                    gap: spacing.md,
                    padding: spacing.lg,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: pinned ? a.border : colors.border,
                    backgroundColor: colors.card,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconTile icon={module.icon} accent={key} />
                    {pinned ? <Ionicons name="pin" size={14} color={colors.textMuted} /> : null}
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="label" weight="semiBold" numberOfLines={1}>
                      {module.label}
                    </Text>
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                      {typeof n === 'number' ? t('nav.hub.itemsCount', { count: n }) : module.description}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text variant="overline" color="textMuted">
              {t('nav.hub.shortcuts')}
            </Text>
            {shortcuts.map((shortcut) => (
              <PressableScale
                key={shortcut.key}
                accessibilityRole="button"
                accessibilityLabel={shortcut.label}
                scaleTo={1}
                ringRadius={radius.md}
                onPress={() => go(shortcut.href)}
                style={{ minHeight: layout.minTouchTarget + spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs }}>
                <Ionicons name={shortcut.icon} size={22} color={colors.textSecondary} />
                <Text variant="body" weight="medium" style={{ flex: 1 }}>
                  {shortcut.label}
                </Text>
                <Ionicons name={directional('chevron-forward', 'chevron-back')} size={18} color={colors.textMuted} />
              </PressableScale>
            ))}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('nav.hub.customize')}
              scaleTo={1}
              ringRadius={radius.md}
              onPress={() => {
                setEditing(0);
                setCustomizing(true);
              }}
              style={{ minHeight: layout.minTouchTarget + spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs }}>
              <Ionicons name="options-outline" size={22} color={colors.textSecondary} />
              <Text variant="body" weight="medium" style={{ flex: 1 }}>
                {t('nav.hub.customize')}
              </Text>
            </PressableScale>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
