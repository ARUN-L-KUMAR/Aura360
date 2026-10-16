import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/** Bottom padding for scroll content that has a floating action button (56pt button + 16pt inset + breathing room). */
export const FAB_CLEARANCE = spacing.xxxl + spacing.xxl;

type StepperProps = {
  /** Current period ("Today", "October 2026"). */
  label: string;
  accent: ModuleKey;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  /** Makes the label a button (e.g. "jump to today"). */
  onLabelPress?: () => void;
  labelHint?: string;
};

/** Previous / current / next control for a day or month. */
export function PeriodStepper({ label, accent, previousLabel, nextLabel, onPrevious, onNext, nextDisabled, onLabelPress, labelHint }: StepperProps) {
  const { accent: accentFor } = useTheme();
  const a = accentFor(accent);
  return (
    <Card padding="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingHorizontal: spacing.xs }}>
      <IconButton icon="chevron-back" accessibilityLabel={previousLabel} onPress={onPrevious} haptic="select" />
      {onLabelPress ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={labelHint}
          onPress={onLabelPress}
          haptic="select"
          ringRadius={radius.md}
          style={{ minHeight: layout.minTouchTarget, flexShrink: 1, justifyContent: 'center', paddingHorizontal: spacing.md }}>
          <Text variant="title" numberOfLines={1} style={{ color: a.text, textAlign: 'center' }}>
            {label}
          </Text>
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite" style={{ flexShrink: 1, paddingHorizontal: spacing.md }}>
          <Text variant="title" numberOfLines={1} style={{ textAlign: 'center' }}>
            {label}
          </Text>
        </View>
      )}
      <IconButton icon="chevron-forward" accessibilityLabel={nextLabel} onPress={onNext} disabled={nextDisabled} haptic="select" />
    </Card>
  );
}

type QueryErrorProps = {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
  /** True when cached data is on screen: the error shows as a compact strip above it instead of replacing it. */
  hasData: boolean;
};

/** Error for a failed query: full-size when there is nothing to show, an inline strip when cached data is visible. */
export function QueryError({ error, onRetry, retrying, hasData }: QueryErrorProps) {
  return <ErrorState error={error} onRetry={onRetry} retrying={retrying} size={hasData ? 'inline' : 'full'} />;
}
