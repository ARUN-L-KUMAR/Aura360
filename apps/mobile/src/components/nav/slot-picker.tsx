import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { PINNABLE_MODULES, type PinnableModule, type SlotIndex, type TabSlots } from '@/features/nav/slots';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

type Props = {
  slots: TabSlots;
  /** The slot being edited. */
  editing: SlotIndex;
  onEditingChange: (index: SlotIndex) => void;
  onAssign: (index: SlotIndex, module: PinnableModule) => void;
};

/**
 * Pick which two modules sit in the bottom bar: two slot buttons (the one being edited is highlighted) over the list of
 * every module. Used by the More sheet and by Settings, so the choice is made the same way in both.
 */
export function SlotPicker({ slots, editing, onEditingChange, onAssign }: Props) {
  const { t } = useTranslation('common');
  const { colors, accent } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: spacing.md }}>
        {([0, 1] as const).map((index) => {
          const selected = editing === index;
          const module = modules[slots[index]];
          return (
            <PressableScale
              key={index}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t('nav.hub.slotValue', { slot: index + 1, module: module.short })}
              haptic="select"
              ringRadius={radius.lg}
              onPress={() => onEditingChange(index)}
              style={{
                flex: 1,
                minHeight: layout.minTouchTarget + spacing.md,
                gap: 2,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.lg,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primaryAccent : colors.border,
                backgroundColor: colors.card,
              }}>
              <Text variant="overline" color="textMuted">
                {t('nav.hub.slot', { slot: index + 1 })}
              </Text>
              <Text variant="label" weight="semiBold" numberOfLines={1}>
                {module.short}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ gap: spacing.xs }}>
        {PINNABLE_MODULES.map((key) => {
          const module = modules[key];
          const pinnedHere = slots[editing] === key;
          const a = accent(key);
          return (
            <PressableScale
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: pinnedHere }}
              accessibilityLabel={t('nav.hub.pickFor', { module: module.label, slot: editing + 1 })}
              ringRadius={radius.md}
              scaleTo={1}
              onPress={() => {
                haptics.select();
                onAssign(editing, key);
              }}
              style={{ minHeight: layout.minTouchTarget + spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm }}>
              <Ionicons name={module.icon} size={22} color={a.text} />
              <Text variant="body" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                {module.label}
              </Text>
              {pinnedHere ? <Ionicons name="checkmark-circle" size={22} color={colors.primaryAccent} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
