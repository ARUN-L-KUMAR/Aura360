import { TextInput, View, type TextInputProps } from 'react-native';

import { FieldError, cleanAmount, parseAmount } from '@/components/finance/form-parts';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { MAX_FONT_SCALE, fontWeightFamily, spacing, tabularNums, typeScale, useTheme, type ThemeColors } from '@/theme';

type Props = {
  /** Shown above the field and spoken as its name, e.g. "Amount (expense)". */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Theme colour name for the currency symbol. */
  tone?: keyof ThemeColors;
  error?: string | null;
  autoFocus?: boolean;
  /** Quick amounts shown as chips. */
  presets?: number[];
  onPreset?: (amount: number) => void;
  /** Prefix preset chips with "+" (when they add to the current value). */
  presetsAdd?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  /** `card` (default) sits in a bordered card; `plain` is the transaction sheet's look: large centred digits straight on the page. */
  variant?: 'card' | 'plain';
};

/** Large amount entry with currency symbol, tabular digits, a formatted preview, inline error and quick-amount chips. */
export function AmountField({
  label,
  value,
  onChangeText,
  tone = 'text',
  error,
  autoFocus,
  presets,
  onPreset,
  presetsAdd,
  returnKeyType = 'done',
  onSubmitEditing,
  variant = 'card',
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation('finance');
  const parsed = parseAmount(value);
  const hasValue = Number.isFinite(parsed) && parsed > 0;
  const plain = variant === 'plain';
  const digits = plain ? typeScale.hero : typeScale.display;

  const body = (
    <>
      <Text variant="overline" color="textMuted" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        <Text variant={plain ? 'headline' : 'display'} color={tone} accessibilityElementsHidden importantForAccessibility="no">
          {CURRENCY_SYMBOL}
        </Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(cleanAmount(text))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectTextOnFocus
          autoFocus={autoFocus}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.primaryAccent}
          selectionColor={colors.primaryAccent}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          style={{
            minWidth: spacing.xxxl * 2,
            minHeight: digits.lineHeight,
            paddingVertical: 0,
            textAlign: 'center',
            color: colors.text,
            fontSize: digits.fontSize,
            fontFamily: fontWeightFamily.bold,
            fontVariant: tabularNums,
          }}
        />
      </View>
      {hasValue ? (
        <Text variant="caption" numeric color="textSecondary">
          {formatMoney(parsed)}
        </Text>
      ) : null}
      <FieldError message={error} />
      {presets && onPreset ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
          {presets.map((amount) => (
            <Chip
              key={amount}
              label={`${presetsAdd ? '+' : ''}${formatMoney(amount)}`}
              selectable={false}
              accent="finance"
              onPress={() => onPreset(amount)}
              accessibilityHint={presetsAdd ? t('amount.presetAdds') : t('amount.presetSets')}
            />
          ))}
        </View>
      ) : null}
    </>
  );

  return plain ? (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>{body}</View>
  ) : (
    <Card padding="lg" style={{ alignItems: 'center', gap: spacing.md, ...(error ? { borderColor: colors.error, borderWidth: 2 } : null) }}>
      {body}
    </Card>
  );
}
