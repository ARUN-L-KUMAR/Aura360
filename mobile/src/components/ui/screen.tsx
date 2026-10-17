import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, View, type ScrollViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_BAR_HEIGHT, LargeTitle, TopAppBar, useCollapsingHeader, type TopAppBarProps } from '@/components/ui/app-bar';
import { useHasHeader } from '@/components/ui/chrome';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { layout, spacing, useTheme } from '@/theme';

/**
 * Standard page padding (safe areas + gutters), shared by scroll screens and FlatList screens.
 * `extraTop` adds room for an overlaid header (see `APP_BAR_HEIGHT`).
 */
export function useScreenPadding(topInset = true, extraTop = 0) {
  const insets = useSafeAreaInsets();
  // Inside the tab navigator the tab bar already sits on the bottom safe area, so don't pad it twice.
  const inTabs = !!useContext(BottomTabBarHeightContext);
  // A persistent header (PremiumHeader) has already taken the status-bar space.
  const hasHeader = useHasHeader();
  return {
    paddingTop: (topInset && !hasHeader ? insets.top : 0) + extraTop + layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: (inTabs ? 0 : insets.bottom) + spacing.xxl,
    gap: layout.sectionGap,
  };
}

type Props = ScrollViewProps & {
  /** Pull-to-refresh handler. May return a promise; if `refreshing` is omitted the spinner follows it. */
  onRefresh?: () => void | Promise<unknown>;
  refreshing?: boolean;
  /** Add the top safe-area padding (screens that sit under a transparent header). */
  topInset?: boolean;
  /** Screen title. Turns on the collapsing large-title app bar; omitted = no bar, content as before. */
  title?: string;
  /** Line under the large title. */
  subtitle?: string;
  /** Extra app bar options: back button, trailing actions, `centerTitle`... (needs `title`). */
  header?: Partial<Omit<TopAppBarProps, 'title' | 'scrollY' | 'large'>>;
  /** Content pinned above the keyboard-aware area, e.g. a composer. Not scrolled. */
  footer?: ReactNode;
};

/**
 * Scrollable page with the app background, safe-area padding, keyboard avoidance and pull-to-refresh.
 * With `title` it also renders a collapsing large-title app bar.
 */
export function Screen({
  children,
  onRefresh,
  refreshing,
  topInset = true,
  title,
  subtitle,
  header,
  footer,
  contentContainerStyle,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = title !== undefined;
  const headerHeight = hasHeader ? (topInset ? insets.top : 0) + APP_BAR_HEIGHT : 0;
  const padding = useScreenPadding(topInset && !hasHeader, hasHeader ? headerHeight : 0);
  const { scrollHandler, scrollY } = useCollapsingHeader();
  const refreshControl = useRefreshControl({
    onRefresh: onRefresh ?? noop,
    refreshing,
    progressViewOffset: headerHeight,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 'padding' works on iOS and on Android edge-to-edge (the window no longer resizes); it measures the overlap. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Animated.ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior={hasHeader ? 'never' : 'automatic'}
          refreshControl={onRefresh ? refreshControl : undefined}
          scrollEventThrottle={16}
          {...rest}
          onScroll={hasHeader ? scrollHandler : rest.onScroll}
          scrollIndicatorInsets={hasHeader ? { top: headerHeight, ...rest.scrollIndicatorInsets } : rest.scrollIndicatorInsets}
          contentContainerStyle={[padding, contentContainerStyle]}>
          {hasHeader ? <LargeTitle title={title} subtitle={subtitle} scrollY={scrollY} /> : null}
          {children}
        </Animated.ScrollView>
        {footer}
      </KeyboardAvoidingView>
      {hasHeader ? <TopAppBar {...header} title={title} scrollY={scrollY} large topInset={topInset} /> : null}
    </View>
  );
}

const noop = () => {};

export function Row({ children, gap = spacing.md, style }: { children: React.ReactNode; gap?: number; style?: object }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}
