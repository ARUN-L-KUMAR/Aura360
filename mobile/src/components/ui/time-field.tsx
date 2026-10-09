import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');

/** "07:30" -> a Date today at that time. */
function toDate(hhmm: string | null | undefined): Date {
  const date = new Date();
  const [h, m] = (hhmm ?? '').split(':').map(Number);
  date.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

const toHhmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** "21:30" -> "9:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

type Props = {
  label?: string;
  /** HH:MM (24 hour), or null when no time is set */
  value: string | null;
  onChange: (hhmm: string | null) => void;
  /** Show a "Clear" link (for optional times) */
  clearable?: boolean;
  placeholder?: string;
};

/** A time of day picker, in the same style as DateField. */
export function TimeField({ label, value, onChange, clearable, placeholder = 'Set a time' }: Props) {
  const { colors } = useTheme();
  const date = toDate(value);

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'time',
      is24Hour: false,
      onChange: (event, selected) => {
        if (event.type === 'set' && selected) onChange(toHhmm(selected));
      },
    });
  }

  const clear =
    clearable && value ? (
      <Pressable onPress={() => onChange(null)} hitSlop={8}>
        <Text variant="label" muted>
          Clear
        </Text>
      </Pressable>
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
          <DateTimePicker value={date} mode="time" display="compact" onChange={(_, selected) => selected && onChange(toHhmm(selected))} />
          {clear}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label ? `${label}: ${value ? formatTime(value) : 'not set'}` : undefined}
            onPress={openAndroid}
            style={{
              minWidth: 120,
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}>
            <Text style={value ? undefined : { color: colors.textMuted }}>{value ? formatTime(value) : placeholder}</Text>
          </Pressable>
          {clear}
        </View>
      )}
    </View>
  );
}
