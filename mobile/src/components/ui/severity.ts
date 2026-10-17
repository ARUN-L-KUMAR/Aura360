import { useTranslation } from '@/i18n';
import { describeSeverity, type Severity } from '@/lib/notify';

/**
 * Icon, translated spoken label and tone for a severity. `describeSeverity` (in `lib/notify`) supplies the icon and
 * tone; the words come from the `common:severity.*` catalog so they follow the app language.
 */
export function useSeverity(severity: Severity) {
  const { t } = useTranslation('common');
  const { icon, tone } = describeSeverity(severity);
  return { icon, tone, label: t(`severity.${severity}`) };
}
