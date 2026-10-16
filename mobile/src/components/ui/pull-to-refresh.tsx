import { useCallback, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type RefreshControlOptions = {
  /** Called when the user pulls down. May return a promise: when `refreshing` is omitted the spinner follows it. */
  onRefresh: () => void | Promise<unknown>;
  /** Controlled spinner state (e.g. react-query `isRefetching`). Omit to let the hook track the returned promise. */
  refreshing?: boolean;
  /** Android only: push the spinner below an overlaid header. */
  progressViewOffset?: number;
};

/**
 * Themed pull-to-refresh. Pass the result to any ScrollView / FlatList `refreshControl` prop:
 *
 *   <FlatList refreshControl={useRefreshControl({ onRefresh: refetch, refreshing: isRefetching })} />
 *
 * Tint / progress colours come from tokens and a light haptic marks the moment the refresh fires.
 */
export function useRefreshControl({ onRefresh, refreshing, progressViewOffset }: RefreshControlOptions): ReactElement<RefreshControlProps> {
  const [pending, setPending] = useState(false);
  const controlled = refreshing !== undefined;

  const handleRefresh = useCallback(() => {
    haptics.tap();
    if (controlled) {
      void Promise.resolve(onRefresh()).catch(() => {});
      return;
    }
    setPending(true);
    void Promise.resolve(onRefresh())
      .catch(() => {})
      .finally(() => setPending(false));
  }, [controlled, onRefresh]);

  return <PullToRefresh refreshing={controlled ? refreshing : pending} onRefresh={handleRefresh} progressViewOffset={progressViewOffset} />;
}

/** A RefreshControl with theme colours. Use directly as `refreshControl={<PullToRefresh refreshing onRefresh />}`. */
export function PullToRefresh({ refreshing, onRefresh, ...rest }: RefreshControlProps) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      tintColor={colors.primaryAccent}
      titleColor={colors.textSecondary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
      {...rest}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
