import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { GlassCard } from '@/components/home/glass-card';
import { Section, SectionHead } from '@/components/home/section';
import { latestSaved, savedSummary } from '@/components/home/widgets/saved-logic';
import { OfflineNote, StatPanel, TILE } from '@/components/home/widgets/widget-parts';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { isWaitingForNetwork, LoadError, RefreshError } from '@/components/ui/load-states';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { IconName } from '@/features/modules';
import { useSavedItems } from '@/features/saved/hooks';
import { hostOf, isSavedType, type SavedItem, type SavedType } from '@/features/saved/types';
import { useTranslation } from '@/i18n';
import { useNotify } from '@/providers/notify';
import { layout, spacing, useTheme } from '@/theme';

/** How many of the newest items the card lists. */
const LATEST_COUNT = 3;
/** Stands in for a picture on every item, so a row reads at a glance. */
const TYPE_ICON: Record<SavedType, IconName> = {
  article: 'newspaper-outline',
  video: 'play-circle-outline',
  product: 'bag-handle-outline',
  recipe: 'restaurant-outline',
  other: 'bookmark-outline',
};

/** One of the newest items: its type as an icon, the title, and the site it came from (or its type when it has no link). */
function LatestRow({ item, last, onOpen }: { item: SavedItem; last: boolean; onOpen: (item: SavedItem) => void }) {
  const { t } = useTranslation('home');
  const { t: ts } = useTranslation('saved');
  const { colors, accent } = useTheme();
  const host = hostOf(item.url);
  const kind: SavedType = isSavedType(item.type) ? item.type : 'other';
  const type = ts(`type.${kind}`);
  const favourite = !!item.isFavorite;
  const title = item.title.trim() || host || type;
  const labelKind = host ? (favourite ? 'hostFavourite' : 'host') : favourite ? 'favourite' : 'plain';

  return (
    <ListItem
      icon={TYPE_ICON[kind]}
      accent="saved"
      title={title}
      titleLines={2}
      subtitle={host ?? type}
      trailing={
        favourite || item.url ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {favourite ? <Ionicons name="heart" size={16} color={accent('saved').text} /> : null}
            {item.url ? <Ionicons name="open-outline" size={18} color={colors.textMuted} /> : null}
          </View>
        ) : undefined
      }
      chevron={!item.url}
      divider={!last}
      onPress={() => onOpen(item)}
      accessibilityLabel={ts(`card.label.${labelKind}`, { title, type, host: host ?? '' })}
      accessibilityHint={item.url ? t('widgets.saved.openLinkHint') : t('widgets.saved.openDetailsHint')}
    />
  );
}

/** Same blocks as the loaded card (figures panel, three rows), announced as one "Loading". */
function SavedSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={{ gap: spacing.lg }}>
      <Skeleton height={layout.minTouchTarget * 2} rounded="lg" />
      {Array.from({ length: LATEST_COUNT }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Skeleton width={TILE} height={TILE} rounded="md" />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton shape="line" width="70%" />
            <Skeleton shape="line" width="40%" height={spacing.md} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/**
 * Saved on Home: how much is saved (with the favourites and what was added this week), the three newest items and a
 * button to save another link. A row opens the link in the browser, or the item's details when it has no link; the
 * header opens the whole list. Everything is counted from the saved list, nothing is made up.
 */
export const SavedHomeCard = memo(function SavedHomeCard({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const { t: ts } = useTranslation('saved');
  const router = useRouter();
  const notify = useNotify();
  const query = useSavedItems();
  const { data, error, isError, isPending, isRefetching, refetch } = query;
  // "This week" is counted from when the card appeared (the clock is not read while rendering).
  const [openedAt] = useState(() => Date.now());

  const items = useMemo(() => data ?? [], [data]);
  const summary = useMemo(() => savedSummary(items, openedAt), [items, openedAt]);
  const latest = useMemo(() => latestSaved(items, LATEST_COUNT), [items]);
  const savedSpoken = t('widgets.saved.stats.spoken', {
    total: t('widgets.saved.stats.totalSpoken', { count: summary.total }),
    favourites: t('widgets.saved.stats.favourites', { count: summary.favourites }),
    thisWeek: t('widgets.saved.stats.thisWeek', { count: summary.thisWeek }),
  });

  const offline = isWaitingForNetwork(query);
  const loading = isPending && !offline;
  const failed = isError && data === undefined;
  const refreshFailed = isError && data !== undefined;
  const empty = !isPending && !failed && items.length === 0;
  const ready = !isPending && !failed && items.length > 0;

  const retry = () => {
    void refetch();
  };
  const save = () => router.push('/saved/add');
  const open = (item: SavedItem) => {
    if (!item.url) {
      router.push({ pathname: '/saved/item', params: { item: JSON.stringify(item) } });
      return;
    }
    Linking.openURL(item.url).catch(() => notify.error(ts('errors.openLink')));
  };

  return (
    <Section index={index}>
      <SectionHead
        title={t('widgets.saved.title')}
        description={t('widgets.saved.description')}
        actionLabel={t('widgets.saved.seeAll')}
        actionAccessibilityLabel={t('widgets.saved.seeAllLabel')}
        onActionPress={() => router.push('/saved')}
      />
      <GlassCard padding={ready || empty ? 0 : spacing.lg} style={{ overflow: 'hidden' }}>
        {offline ? <OfflineNote message={t('widgets.saved.offline')} retryLabel={t('offline.retry')} onRetry={retry} /> : null}
        {loading ? <SavedSkeleton label={t('widgets.saved.loading')} /> : null}
        {failed ? <LoadError size="inline" error={error} title={t('widgets.saved.error')} retrying={isRefetching} onRetry={retry} /> : null}
        {empty ? (
          <EmptyState
            accent="saved"
            icon="bookmark-outline"
            title={t('widgets.saved.empty.title')}
            description={t('widgets.saved.empty.description')}
            actionTitle={t('widgets.saved.add')}
            onAction={save}
          />
        ) : null}
        {ready ? (
          <>
            {refreshFailed ? (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
                <RefreshError error={error} retrying={isRefetching} onRetry={retry} />
              </View>
            ) : null}
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
              <StatPanel
                module="saved"
                value={summary.total}
                unit={t('widgets.saved.stats.total', { count: summary.total })}
                lines={[
                  { icon: 'heart', text: t('widgets.saved.stats.favourites', { count: summary.favourites }), emphasis: true },
                  { icon: 'calendar-outline', text: t('widgets.saved.stats.thisWeek', { count: summary.thisWeek }) },
                ]}
                label={savedSpoken}
              />
            </View>
            <Text
              variant="overline"
              color="textMuted"
              accessibilityRole="header"
              style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
              {t('widgets.saved.latest')}
            </Text>
            {latest.map((item, i) => (
              <LatestRow key={item.id} item={item} last={i === latest.length - 1} onOpen={open} />
            ))}
            <Divider />
            <View style={{ padding: spacing.lg }}>
              <Button title={t('widgets.saved.add')} variant="tertiary" leftIcon="add" accessibilityHint={t('widgets.saved.addHint')} onPress={save} />
            </View>
          </>
        ) : null}
      </GlassCard>
    </Section>
  );
});
