import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

type Props = ScrollViewProps & {
  /** Pull-to-refresh handler; shows the spinner while `refreshing` is true. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Add the top safe-area padding (screens that sit under a transparent header). */
  topInset?: boolean;
};

/** Scrollable page with the app background, safe-area padding, keyboard handling and pull-to-refresh. */
export function Screen({ children, onRefresh, refreshing = false, topInset = true, contentContainerStyle, ...rest }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} /> : undefined}
        {...rest}
        contentContainerStyle={[
          {
            paddingTop: (topInset ? insets.top : 0) + spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
            gap: spacing.lg,
          },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Row({ children, gap = spacing.md, style }: { children: React.ReactNode; gap?: number; style?: object }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}
