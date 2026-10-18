import type { ReactNode } from 'react';
import { View, type ListRenderItem } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_BAR_HEIGHT, LargeTitle, TopAppBar, useCollapsingHeader } from '@/components/ui/app-bar';
import { useHasHeader } from '@/components/ui/chrome';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { layout, spacing, useTheme } from '@/theme';

/** Room under the last row so the floating action button never covers it. */
const FAB_CLEARANCE = spacing.xxxl + spacing.xl;

type Props<T> = {
  title: string;
  subtitle?: string;
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  /** Search, filters and other controls under the large title. Pass an element (not a component) so inputs keep focus. */
  header?: ReactNode;
  /** Loading, error or empty content shown when `data` is empty. */
  empty?: ReactNode;
  onRefresh: () => void | Promise<unknown>;
  refreshing?: boolean;
  /** Changing the column count needs a new list: give the component a new `key` when it changes. */
  numColumns?: number;
  /** Floating action button. */
  fab?: ReactNode;
  extraData?: unknown;
  /** Rows rendered on the first pass (default 8; a grid needs fewer because each row holds several tiles). */
  initialNumToRender?: number;
  /** Viewport multiples kept rendered (default 9). */
  windowSize?: number;
};

/**
 * `Screen` with a title, for a long virtualized list: the same collapsing large-title app bar, safe-area padding and
 * pull-to-refresh, but the content is a FlatList instead of a ScrollView. In a single column the rows reflow smoothly
 * when one leaves; rows add their own enter / exit motion with `useListMotion`.
 */
export function CollapsingList<T>({ title, subtitle, data, renderItem, keyExtractor, header, empty, onRefresh, refreshing, numColumns = 1, fab, extraData, initialNumToRender = 8, windowSize = 9 }: Props<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Inside the tabs a persistent header already shows the page and the status-bar space, so no second app bar here.
  const hasHeader = useHasHeader();
  const headerHeight = hasHeader ? 0 : insets.top + APP_BAR_HEIGHT;
  const padding = useScreenPadding(false, headerHeight);
  const { scrollHandler, scrollY } = useCollapsingHeader();
  const refreshControl = useRefreshControl({ onRefresh, refreshing, progressViewOffset: headerHeight });
  // Rows below a removed (or moved) row slide to close the gap. The animation has to sit on the FlatList's cell, not on
  // the row inside it, because it is the cell that moves. Reanimated supports it for a single column only; it is
  // undefined under reduce-motion.
  const { layout: reflow } = useListMotion();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList<T>
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={extraData}
        numColumns={numColumns}
        itemLayoutAnimation={numColumns === 1 ? reflow : undefined}
        columnWrapperStyle={numColumns > 1 ? { gap: layout.itemGap } : undefined}
        ListHeaderComponent={
          <View style={{ gap: layout.itemGap, marginBottom: spacing.xs }}>
            <LargeTitle title={title} subtitle={subtitle} scrollY={hasHeader ? undefined : scrollY} />
            {header}
          </View>
        }
        ListEmptyComponent={<View>{empty}</View>}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        scrollIndicatorInsets={{ top: headerHeight }}
        contentContainerStyle={[padding, { gap: layout.itemGap, paddingBottom: padding.paddingBottom + FAB_CLEARANCE }]}
        initialNumToRender={initialNumToRender}
        windowSize={windowSize}
        maxToRenderPerBatch={initialNumToRender}
      />
      {fab}
      {hasHeader ? null : <TopAppBar title={title} scrollY={scrollY} large />}
    </View>
  );
}
