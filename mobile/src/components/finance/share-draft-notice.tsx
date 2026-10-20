import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { NO_DESCRIPTION } from '@/components/finance/transaction-row';
import { Text } from '@/components/ui/text';
import type { ShareDraftInfo } from '@/features/share-import/types';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

/**
 * What the transaction form says about a draft that came from a shared payment screenshot: that it is only a reading
 * of a picture, what to double check, and entries already in the ledger that look like the same payment. Nothing here
 * blocks saving; the form asks for a confirmation on the serious ones (see confirmReasons in features/share-import).
 */
export function ShareDraftNotice({ info }: { info: ShareDraftInfo }) {
  const { t } = useTranslation('finance');
  const { colors } = useTheme();
  const failed = info.status === 'failed';
  const tone = failed
    ? { bg: colors.errorContainer, border: colors.errorBorder, fg: colors.onErrorContainer }
    : { bg: colors.warningContainer, border: colors.warningBorder, fg: colors.onWarningContainer };

  const box = {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tone.border,
    backgroundColor: tone.bg,
  } as const;

  return (
    <View style={{ gap: spacing.md }}>
      {info.manual ? null : (
        <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
          {t('shareImport.form.prefilled')}
        </Text>
      )}

      {info.warnings.length > 0 ? (
        <View accessibilityRole="alert" style={box}>
          <Text variant="label" weight="semiBold" style={{ color: tone.fg }}>
            {t('shareImport.form.warningsTitle')}
          </Text>
          {info.warnings.map((warning) => (
            <View key={warning} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Ionicons name="alert-circle-outline" size={18} color={tone.fg} />
              <Text variant="caption" style={{ flex: 1, color: tone.fg }}>
                {t(`shareImport.form.warnings.${warning}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {info.duplicates.length > 0 ? (
        <View accessibilityRole="alert" style={{ ...box, borderColor: colors.warningBorder, backgroundColor: colors.warningContainer }}>
          <Text variant="label" weight="semiBold" style={{ color: colors.onWarningContainer }}>
            {t('shareImport.form.duplicatesTitle')}
          </Text>
          {info.duplicates.map((match) => {
            const hasName = match.description.trim() !== '' && match.description !== NO_DESCRIPTION;
            const values = { description: match.description, amount: formatMoney(match.amount), date: formatDay(match.date) };
            return (
              <View key={match.id} style={{ gap: spacing.xs }}>
                <Text variant="caption" weight="medium" numeric style={{ color: colors.onWarningContainer }}>
                  {hasName ? t('shareImport.form.duplicate', values) : t('shareImport.form.duplicateNoDescription', values)}
                </Text>
                <Text variant="caption" style={{ color: colors.onWarningContainer }}>
                  {t(`shareImport.form.match.${match.strength}`)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
