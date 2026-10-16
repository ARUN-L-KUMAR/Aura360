import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Linking, View, type AccessibilityActionEvent } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActionSheet, type SheetAction } from '@/components/notes/action-sheet';
import { CollapsingList } from '@/components/notes/collapsing-list';
import { Thumbnail } from '@/components/notes/thumbnail';
import { useUndoableRemove } from '@/components/notes/use-undoable-remove';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow, Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FloatingAction } from '@/components/ui/floating-action';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteSavedItem, useSavedItems, useToggleFavorite } from '@/features/saved/hooks';
import { SAVED_TYPES, hostOf, type SavedItem } from '@/features/saved/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { duration, layout, radius, spacing, useTheme } from '@/theme';

type Filter = 'all' | 'favorites' | SavedItem['type'];

const MAX_ANIMATED_ROWS = 8;
const typeLabel = (type: SavedItem['type']) => SAVED_TYPES.find((t) => t.value === type)?.label ?? 'Other';

export default function SavedScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { data, isPending, isError, error, refetch } = useSavedItems();
  const { mutate: setFavorite } = useToggleFavorite();
  const { mutateAsync: deleteItem } = useDeleteSavedItem();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [menuItem, setMenuItem] = useState<SavedItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { hiddenIds, remove } = useUndoableRemove({ commit: deleteItem, message: 'Removed from saved' });

  const items = useMemo(() => (data ?? []).filter((item) => !hiddenIds.has(item.id)), [data, hiddenIds]);

  const counts = useMemo(() => {
    const byType = new Map<string, number>();
    let favorites = 0;
    for (const item of items) {
      byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
      if (item.isFavorite) favorites += 1;
    }
    return { all: items.length, favorites, byType };
  }, [items]);

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
      Linking.openURL(item.url).catch(() => notify.error("Can't open this link."));
    },
    [edit, notify],
  );

  const toggleFavorite = useCallback(
    (item: SavedItem) => setFavorite({ id: item.id, isFavorite: !item.isFavorite }, { onError: (e) => notify.error(e) }),
    [setFavorite, notify],
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
      ...(menuItem.url ? [{ key: 'open', label: 'Open link', icon: 'open-outline' as const, onPress: () => open(menuItem) }] : []),
      { key: 'edit', label: 'Edit details', icon: 'create-outline', onPress: () => edit(menuItem) },
      { key: 'favorite', label: menuItem.isFavorite ? 'Remove from favourites' : 'Add to favourites', icon: menuItem.isFavorite ? 'heart-dislike-outline' : 'heart-outline', onPress: () => toggleFavorite(menuItem) },
      { key: 'remove', label: 'Remove', icon: 'trash-outline', destructive: true, onPress: () => removeWithUndo(menuItem) },
    ];
  }, [menuItem, open, edit, toggleFavorite, removeWithUndo]);

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

  const header = (
    <View style={{ gap: spacing.md }}>
      <SearchBar placeholder="Search saved items" value={search} onChangeText={setSearch} debounceMs={200} />
      <ChipRow>
        <Chip label="All" accent="saved" count={counts.all} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Favourites" accent="saved" count={counts.favorites} selected={filter === 'favorites'} onPress={() => setFilter('favorites')} />
        {SAVED_TYPES.map((type) => (
          <Chip key={type.value} label={type.label} accent="saved" count={counts.byType.get(type.value) ?? 0} selected={filter === type.value} onPress={() => setFilter(type.value)} />
        ))}
      </ChipRow>
    </View>
  );

  let empty;
  if (isPending) {
    empty = (
      <View style={{ gap: layout.itemGap }}>
        <SkeletonCard media lines={2} />
        <SkeletonCard lines={3} />
      </View>
    );
  } else if (isError && !data) {
    empty = <ErrorState error={error} onRetry={() => refetch()} />;
  } else if (filtering) {
    empty = <EmptyState variant="noResults" accent="saved" title="No matching items" description="Try a different search or another filter." onClearFilters={clearFilters} />;
  } else {
    empty = (
      <EmptyState
        accent="saved"
        icon="bookmark-outline"
        title="Nothing saved yet"
        description="Keep articles, videos, recipes and products to come back to later."
        actionTitle="Save a link"
        onAction={() => router.push('/saved/add')}
      />
    );
  }

  return (
    <>
      <CollapsingList<SavedItem>
        title="Saved items"
        data={visible}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        header={header}
        empty={empty}
        onRefresh={() => refetch()}
        fab={<FloatingAction accent="saved" accessibilityLabel="Save a link" onPress={() => router.push('/saved/add')} />}
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
  const { reduceMotion } = useTheme();
  const host = hostOf(item.url);
  const favorite = !!item.isFavorite;
  const tags = item.tags ?? [];
  const shownTags = tags.slice(0, 4);

  const accessibilityActions = [
    { name: 'favorite', label: favorite ? 'Remove from favourites' : 'Add to favourites' },
    { name: 'edit', label: 'Edit details' },
    { name: 'remove', label: 'Remove' },
    { name: 'more', label: 'More options' },
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

  const entering = reduceMotion || index >= MAX_ANIMATED_ROWS ? undefined : FadeInDown.delay(index * 40).duration(duration.base);

  return (
    <Animated.View entering={entering}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {item.imageUrl ? (
          <PressableScale accessible={false} scaleTo={1} focusRing={false} hitSlop={0} onPress={() => onOpen(item)} onLongPress={() => onMenu(item)}>
            <Thumbnail uri={item.imageUrl} />
          </PressableScale>
        ) : null}
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={[item.title, typeLabel(item.type), host, favorite ? 'favourite' : null].filter(Boolean).join(', ')}
              accessibilityHint={item.url ? 'Opens the link. More actions are available.' : 'Opens the details. More actions are available.'}
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
                <Tag label={typeLabel(item.type)} tone="neutral" />
              </View>
            </PressableScale>
            <IconButton
              size="sm"
              icon={favorite ? 'heart' : 'heart-outline'}
              accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
              selected={favorite}
              onPress={() => onToggleFavorite(item)}
            />
            <IconButton size="sm" icon="ellipsis-horizontal" accessibilityLabel="More options" onPress={() => onMenu(item)} />
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
              {tags.length > shownTags.length ? <Tag label={`+${tags.length - shownTags.length}`} tone="neutral" /> : null}
            </View>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
});
