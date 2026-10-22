import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Linking, View, type AccessibilityActionEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { ActionSheet, type SheetAction } from '@/components/notes/action-sheet';
import { CollapsingList } from '@/components/notes/collapsing-list';
import { EmptyHero } from '@/components/notes/empty-hero';
import { friendlyError } from '@/components/notes/friendly-error';
import { Thumbnail } from '@/components/notes/thumbnail';
import { useUndoableRemove } from '@/components/notes/use-undoable-remove';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow, Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CategoryFab, CategoryHeader } from '@/components/ui/category-template';
import { IconButton } from '@/components/ui/icon-button';
import { isWaitingForNetwork, OfflineState } from '@/components/ui/load-states';
import { SummaryStrip } from '@/components/ui/summary-strip';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SearchBar } from '@/components/ui/search-bar';
import { IconTile } from '@/components/ui/stat-parts';
import type { IconName } from '@/features/modules';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteSavedItem, useSavedItems, useToggleFavorite } from '@/features/saved/hooks';
import { SAVED_TYPES, hostOf, productFacts, type SavedItem } from '@/features/saved/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing } from '@/theme';

type Filter = 'all' | 'favorites' | SavedItem['type'];

/** Stands in for a picture on items that have none, so every card has something to anchor on. */
const TYPE_ICON: Record<SavedItem['type'], IconName> = {
  article: 'newspaper-outline',
  video: 'play-circle-outline',
  product: 'bag-handle-outline',
  recipe: 'restaurant-outline',
  other: 'bookmark-outline',
};

const keyOf = (item: SavedItem) => item.id;

export default function SavedScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('saved');
  const query = useSavedItems();
  const { data, isPending, isError, error, refetch, isRefetching } = query;
  const { mutate: setFavorite } = useToggleFavorite();
  const { mutateAsync: deleteItem } = useDeleteSavedItem();
  // "This week" is counted from when the screen opened (the clock is not read while rendering).
  const [openedAt] = useState(() => Date.now());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [menuItem, setMenuItem] = useState<SavedItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /** A friendly toast for a failed action: offline copy when the server was unreachable, never raw server text. */
  const fail = useCallback((e: unknown, message: string) => notify.error(friendlyError(e, message, t('errors.offline'))), [notify, t]);

  const { hiddenIds, remove } = useUndoableRemove({
    commit: async (id) => {
      await deleteItem(id);
      analytics.track('link_removed');
    },
    message: t('toast.removed'),
    undoLabel: t('toast.undo'),
    onError: (e) => fail(e, t('errors.remove')),
  });

  const items = useMemo(() => (data ?? []).filter((item) => !hiddenIds.has(item.id)), [data, hiddenIds]);

  const counts = useMemo(() => {
    const byType = new Map<string, number>();
    let favorites = 0;
    for (const item of items) {
      byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
      if (item.isFavorite) favorites += 1;
    }
    const weekAgo = openedAt - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = items.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
    return { all: items.length, favorites, thisWeek, byType };
  }, [items, openedAt]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'favorites' && !item.isFavorite) return false;
      if (filter !== 'all' && filter !== 'favorites' && item.type !== filter) return false;
      if (!query) return true;
      return [item.title, item.description, item.url, ...(item.tags ?? [])].join(' ').toLowerCase().includes(query);
    });
  }, [items, filter, search]);

  const filtering = search.trim().length > 0 || filter !== 'all';

  const edit = useCallback((item: SavedItem) => router.push({ pathname: '/saved/item', params: { item: JSON.stringify(item) } }), [router]);

  const open = useCallback(
    (item: SavedItem) => {
      if (!item.url) return edit(item);
      Linking.openURL(item.url).catch(() => notify.error(t('errors.openLink')));
    },
    [edit, notify, t],
  );

  const toggleFavorite = useCallback(
    (item: SavedItem) => setFavorite({ id: item.id, isFavorite: !item.isFavorite }, { onError: (e) => fail(e, t('errors.favourite')) }),
    [setFavorite, fail, t],
  );

  const removeWithUndo = useCallback((item: SavedItem) => remove(item.id), [remove]);

  const openMenu = useCallback((item: SavedItem) => {
    haptics.impact();
    setMenuItem(item);
    setMenuOpen(true);
  }, []);

  const menuActions = useMemo<SheetAction[]>(() => {
    if (!menuItem) return [];
    return [
      ...(menuItem.url ? [{ key: 'open', label: t('action.open'), icon: 'open-outline' as const, onPress: () => open(menuItem) }] : []),
      { key: 'edit', label: t('action.edit'), icon: 'create-outline', onPress: () => edit(menuItem) },
      {
        key: 'favorite',
        label: menuItem.isFavorite ? t('action.unfavourite') : t('action.favourite'),
        icon: menuItem.isFavorite ? 'heart-dislike-outline' : 'heart-outline',
        onPress: () => toggleFavorite(menuItem),
      },
      { key: 'remove', label: t('action.remove'), icon: 'trash-outline', destructive: true, onPress: () => removeWithUndo(menuItem) },
    ];
  }, [menuItem, t, open, edit, toggleFavorite, removeWithUndo]);

  const renderItem = useCallback(
    ({ item, index }: { item: SavedItem; index: number }) => (
      <SavedCard item={item} index={index} onOpen={open} onToggleFavorite={toggleFavorite} onMenu={openMenu} onRemove={removeWithUndo} onEdit={edit} />
    ),
    [open, toggleFavorite, openMenu, removeWithUndo, edit],
  );

  const clearFilters = () => {
    setFilter('all');
    setSearch('');
  };

  // Refreshing failed but there is something to show: say so in a row above the list instead of replacing it.
  const refreshFailed = isError && !!data;

  const header = (
    <View style={{ gap: spacing.md }}>
      <CategoryHeader module="saved" title={t('title')} />
      {counts.all > 0 ? (
        <SummaryStrip
          accent="saved"
          figures={[
            { key: 'all', label: t('summary.saved'), value: counts.all },
            { key: 'fav', label: t('summary.favourites'), value: counts.favorites },
            { key: 'week', label: t('summary.thisWeek'), value: counts.thisWeek },
          ]}
        />
      ) : null}
      <SearchBar placeholder={t('search.placeholder')} accessibilityLabel={t('search.placeholder')} value={search} onChangeText={setSearch} debounceMs={200} />
      <ChipRow>
        <Chip label={t('filter.all')} accent="saved" count={counts.all} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('filter.favourites')} accent="saved" count={counts.favorites} selected={filter === 'favorites'} onPress={() => setFilter('favorites')} />
        {SAVED_TYPES.map((type) => (
          <Chip key={type} label={t(`type.${type}`)} accent="saved" count={counts.byType.get(type) ?? 0} selected={filter === type} onPress={() => setFilter(type)} />
        ))}
      </ChipRow>

      {refreshFailed ? (
        <ErrorState size="inline" error={error} title={t('refreshError.title')} message={t('refreshError.message')} retrying={isRefetching} onRetry={() => refetch()} />
      ) : null}

      {/* Announces how many items match when a search or filter changes. */}
      {filtering && visible.length > 0 ? (
        <View accessible accessibilityLiveRegion="polite">
          <Text variant="caption" color="textSecondary">
            {t('results', { count: visible.length })}
          </Text>
        </View>
      ) : null}
    </View>
  );

  let empty;
  if (isWaitingForNetwork(query)) {
    empty = <OfflineState description={t('offline.description')} onRetry={() => refetch()} />;
  } else if (isPending) {
    empty = (
      <View style={{ gap: layout.itemGap }}>
        <SkeletonCard media lines={2} />
        <SkeletonCard lines={3} />
      </View>
    );
  } else if (isError && !data) {
    empty = <ErrorState error={error} retrying={isRefetching} onRetry={() => refetch()} />;
  } else if (filtering) {
    empty = <EmptyState variant="noResults" accent="saved" title={t('empty.noMatchTitle')} description={t('empty.noMatchDescription')} onClearFilters={clearFilters} />;
  } else {
    empty = (
      <EmptyHero
        accent="saved"
        icon="bookmark-outline"
        title={t('empty.title')}
        description={t('empty.description')}
        actionTitle={t('empty.action')}
        onAction={() => router.push('/saved/add')}
      />
    );
  }

  return (
    <>
      <CollapsingList<SavedItem>
        title={t('title')}
        hideTitle
        data={visible}
        renderItem={renderItem}
        keyExtractor={keyOf}
        header={header}
        empty={empty}
        onRefresh={() => refetch()}
        fab={<CategoryFab module="saved" label={t('fab')} onPress={() => router.push('/saved/add')} />}
      />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={menuItem?.title} actions={menuActions} />
    </>
  );
}

type CardProps = {
  item: SavedItem;
  index: number;
  onOpen: (item: SavedItem) => void;
  onToggleFavorite: (item: SavedItem) => void;
  onMenu: (item: SavedItem) => void;
  onRemove: (item: SavedItem) => void;
  onEdit: (item: SavedItem) => void;
};

const SavedCard = memo(function SavedCard({ item, index, onOpen, onToggleFavorite, onMenu, onRemove, onEdit }: CardProps) {
  const { t } = useTranslation('saved');
  // Enter + exit live on the row; the list animates the reflow on the FlatList cell.
  const { entering, exiting } = useListMotion(index);
  const host = hostOf(item.url);
  const favorite = !!item.isFavorite;
  // A product saved from a shopping app carries its category (Electronics ...) and price; the category is also a tag, shown once.
  const facts = productFacts(item.metadata);
  const tags = (item.tags ?? []).filter((tag) => tag !== facts.category);
  const shownTags = tags.slice(0, 4);
  const type = t(`type.${item.type}`);
  const labelKind = host ? (favorite ? 'hostFavourite' : 'host') : favorite ? 'favourite' : 'plain';

  const accessibilityActions = [
    { name: 'favorite', label: favorite ? t('action.unfavourite') : t('action.favourite') },
    { name: 'edit', label: t('action.edit') },
    { name: 'remove', label: t('action.remove') },
    { name: 'more', label: t('action.more') },
  ];
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'favorite':
        return onToggleFavorite(item);
      case 'edit':
        return onEdit(item);
      case 'remove':
        return onRemove(item);
      case 'more':
        return onMenu(item);
    }
  };

  return (
    <Animated.View entering={entering} exiting={exiting}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {item.imageUrl ? (
          <PressableScale accessible={false} scaleTo={1} focusRing={false} hitSlop={0} onPress={() => onOpen(item)} onLongPress={() => onMenu(item)}>
            <Thumbnail uri={item.imageUrl} />
          </PressableScale>
        ) : null}
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
            {item.imageUrl ? null : (
              <View style={{ paddingTop: spacing.xs, paddingEnd: spacing.xs }}>
                <IconTile icon={TYPE_ICON[item.type] ?? 'bookmark-outline'} accent="saved" />
              </View>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t(`card.label.${labelKind}`, { title: item.title, type, host: host ?? '' })}
              accessibilityHint={item.url ? t('card.hintLink') : t('card.hintDetails')}
              accessibilityActions={accessibilityActions}
              onAccessibilityAction={onAccessibilityAction}
              scaleTo={1}
              ringRadius={radius.sm}
              onPress={() => onOpen(item)}
              onLongPress={() => onMenu(item)}
              style={{ flex: 1, gap: spacing.sm, paddingVertical: spacing.xs }}>
              <Text variant="title" numberOfLines={2}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                {host ? <Tag label={host} accent="saved" icon="link-outline" /> : null}
                <Tag label={type} tone="neutral" />
                {facts.category ? <Tag label={facts.category} accent="saved" icon="grid-outline" /> : null}
                {facts.price ? <Tag label={formatMoney(facts.price)} tone="neutral" icon="pricetag-outline" /> : null}
              </View>
            </PressableScale>
            <IconButton
              size="sm"
              icon={favorite ? 'heart' : 'heart-outline'}
              accessibilityLabel={favorite ? t('card.unfavouriteItem', { title: item.title }) : t('card.favouriteItem', { title: item.title })}
              selected={favorite}
              onPress={() => onToggleFavorite(item)}
            />
            <IconButton size="sm" icon="ellipsis-horizontal" accessibilityLabel={t('card.moreOptions', { title: item.title })} onPress={() => onMenu(item)} />
          </View>
          {item.description ? (
            <Text variant="body" color="textSecondary" numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          {shownTags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {shownTags.map((tag) => (
                <Tag key={tag} label={`#${tag}`} tone="neutral" />
              ))}
              {tags.length > shownTags.length ? <Tag label={t('card.moreTags', { count: tags.length - shownTags.length })} tone="neutral" /> : null}
            </View>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
});
