import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';

/** YYYY-MM-DD in the phone's local timezone (toISOString would shift the day for evening entries). */
export function toIsoDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDay(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

type Props = {
  label?: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (isoDay: string) => void;
  clearable?: boolean;
  /** Shown while no date is set. Default "Select a date". */
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

export function DateField({ label, value, onChange, clearable, placeholder, maximumDate, minimumDate }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const date = value ? fromIsoDay(value) : new Date();
  const shown = value ? formatDay(value) : (placeholder ?? t('dateField.placeholder'));

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      maximumDate,
      minimumDate,
      onChange: (event, selected) => {
        if (event.type === 'set' && selected) onChange(toIsoDay(selected));
      },
    });
  }

  const clear =
    clearable && value ? (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label ? `${t('actions.clear')} ${label}` : t('actions.clear')}
        scaleTo={1}
        ringRadius={radius.sm}
        onPress={() => onChange('')}
        style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="label" muted>
          {t('actions.clear')}
        </Text>
      </PressableScale>
    ) : null;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="label" muted>
          {label}
        </Text>
      ) : null}
      {Platform.OS === 'ios' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_, selected) => selected && onChange(toIsoDay(selected))}
          />
          {clear}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={label ? t('dateField.value', { label, value: shown }) : shown}
            scaleTo={1}
            onPress={openAndroid}
            style={{
              flex: 1,
              minHeight: layout.minTouchTarget + spacing.xs,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.card,
            }}>
            <Text style={value ? undefined : { color: colors.textMuted }}>{shown}</Text>
          </PressableScale>
          {clear}
        </View>
      )}
    </View>
  );
}
