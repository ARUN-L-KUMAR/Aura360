import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { OfflineState, RefreshError } from '@/components/finance/load-error';
import { Card } from '@/components/ui/card';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { useScreenPadding } from '@/components/ui/screen';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { layout, spacing, useTheme } from '@/theme';

/** Gap between grid cells and rows. */
export const GRID_GAP = spacing.md;
export const GRID_COLUMNS = 2;
/** Room under the last row so the floating add button never covers content. */
const FAB_CLEARANCE = spacing.xxxl * 2;

export const EMPTY_ITEMS: FashionItem[] = [];

/** What the sections need to know about the shared wardrobe query. */
export type ItemsState = {
  /** First load, no data yet. */
  loading: boolean;
  /** No data and the request is waiting for a connection. */
  offline: boolean;
  /** The request failed and there is nothing cached to show. Cached data stays visible instead. */
  error: unknown;
  /** A refresh failed while cached items are still on screen (shown as a compact row, never instead of the items). */
  staleError: unknown;
  /** A refetch is running (pull to refresh). */
  refreshing: boolean;
  refetch: () => void;
};

/** Page padding for a section's list: safe areas, gutters and clearance for the floating add button. */
export function useListPadding() {
  const { paddingTop, paddingHorizontal, paddingBottom } = useScreenPadding();
  return { paddingTop, paddingHorizontal, paddingBottom: paddingBottom + FAB_CLEARANCE };
}

/** Stacks the header and top blocks of a list with the screen's section gap. */
export function HeaderStack({ children }: { children: ReactNode }) {
  return <View style={{ gap: layout.sectionGap, marginBottom: layout.sectionGap }}>{children}</View>;
}

export function RowSeparator() {
  return <View style={{ height: GRID_GAP }} />;
}

export const gridColumnStyle = { gap: GRID_GAP } as const;

/** Keeps the last cell of an odd-length grid at column width instead of stretching it. */
export type GridSpacer = { id: string; spacer: true };
export type GridEntry = FashionItem | GridSpacer;
const SPACER: GridSpacer = { id: '__spacer__', spacer: true };

export function withSpacer(items: FashionItem[]): GridEntry[] {
  return items.length % GRID_COLUMNS === 1 ? [...items, SPACER] : items;
}

export function isSpacer(entry: GridEntry): entry is GridSpacer {
  return 'spacer' in entry;
}

export function SpacerCell() {
  return <View style={{ flex: 1 }} />;
}

/**
 * Item picture: skeleton while it loads, a quiet icon tile when there is no picture or it fails to load.
 * Fills its parent; give the parent (or `style`) a size.
 */
export function FashionImage({
  uri,
  style,
  iconSize = 32,
  accessibilityLabel,
}: {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  /** Set when the picture is the content (the detail view); leave off when the parent already names the piece. */
  accessibilityLabel?: string;
}) {
  const { colors, accent, reduceMotion } = useTheme();
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const failed = !uri || failedUri === uri;
  const loading = !failed && loadedUri !== uri;

  return (
    <View
      accessible={accessibilityLabel ? true : undefined}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[{ overflow: 'hidden', backgroundColor: colors.cardMuted }, style]}>
      {!failed && uri ? (
        <Image
          source={{ uri }}
          recyclingKey={uri}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={reduceMotion ? 0 : 150}
          accessible={false}
          onLoad={() => setLoadedUri(uri)}
          onError={() => setFailedUri(uri)}
        />
      ) : null}
      {loading ? <Skeleton rounded={0} style={StyleSheet.absoluteFill} /> : null}
      {failed ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="shirt-outline" size={iconSize} color={accent('fashion').text} />
        </View>
      ) : null}
    </View>
  );
}

/** Placeholder shaped like a two-column grid of item cards. */
export function SkeletonGrid({ rows = 2 }: { rows?: number }) {
  const { t } = useTranslation('fashion');
  return (
    <SkeletonGroup label={t('loading.items')} style={{ gap: GRID_GAP }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: GRID_GAP }}>
          {Array.from({ length: GRID_COLUMNS }, (_, col) => (
            <Card key={col} padding="none" style={{ flex: 1, overflow: 'hidden' }}>
              <Skeleton rounded={0} height={layout.minTouchTarget * 3} />
              <View style={{ padding: spacing.md, gap: spacing.sm }}>
                <Skeleton shape="line" width="70%" />
                <Skeleton shape="line" width="40%" height={spacing.md} />
              </View>
            </Card>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** The first-load failure for a list: network, timeout and signed-out keep their own wording. */
function ItemsLoadError({ state }: { state: ItemsState }) {
  const { t } = useTranslation('fashion');
  const generic = errorKindFromError(state.error) === 'generic';
  return <ErrorState error={state.error} title={generic ? t('errors.loadItems') : undefined} onRetry={state.refetch} retrying={state.refreshing} />;
}

function ItemsOffline({ state }: { state: ItemsState }) {
  const { t } = useTranslation('fashion');
  return <OfflineState description={t('offline.wardrobe')} onRetry={state.refetch} />;
}

/** The loading, error or offline stand-in for list content, or null when the data can be shown. */
export function itemsGate(state: ItemsState): ReactElement | null {
  if (state.loading) return <SkeletonGrid />;
  if (state.error) return <ItemsLoadError state={state} />;
  if (state.offline) return <ItemsOffline state={state} />;
  return null;
}

/** A refresh failed but the items on screen are still good: one compact row with a retry, above the content. */
export function StaleNotice({ state }: { state: ItemsState }) {
  if (!state.staleError) return null;
  return <RefreshError error={state.staleError} onRetry={state.refetch} retrying={state.refreshing} />;
}

/** Number from a text field. Empty is a valid "no value"; commas count as decimal points. */
export function parseAmount(text: string): { value: number | null; valid: boolean } {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return { value: null, valid: true };
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? { value, valid: true } : { value: null, valid: false };
}
