import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

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
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

export function DateField({ label, value, onChange, clearable, placeholder = 'Select a date', maximumDate, minimumDate }: Props) {
  const { colors } = useTheme();
  const date = value ? fromIsoDay(value) : new Date();

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
          {clearable && value ? (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <Text variant="label" muted>
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            accessibilityRole="button"
            onPress={openAndroid}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}>
            <Text style={value ? undefined : { color: colors.textMuted }}>{value ? formatDay(value) : placeholder}</Text>
          </Pressable>
          {clearable && value ? (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <Text variant="label" muted>
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
