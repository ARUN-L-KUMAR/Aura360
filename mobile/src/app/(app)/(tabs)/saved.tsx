import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, TextInput, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteSavedItem, useSavedItems, useToggleFavorite } from '@/features/saved/hooks';
import { SAVED_TYPES, hostOf, type SavedItem } from '@/features/saved/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Filter = 'all' | 'favorites' | SavedItem['type'];

export default function SavedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = useSavedItems();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter((item) => {
      if (filter === 'favorites' && !item.isFavorite) return false;
      if (filter !== 'all' && filter !== 'favorites' && item.type !== filter) return false;
      if (!query) return true;
      return [item.title, item.description, item.url, ...(item.tags ?? [])].join(' ').toLowerCase().includes(query);
    });
  }, [data, filter, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
        <Text variant="title">Saved Items</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            paddingHorizontal: spacing.md,
          }}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search saved items"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 44, color: colors.text, fontSize: 15 }}
          />
        </View>

        <ChipRow>
          <Chip label="All" selected={filter === 'all'} color={moduleColors.saved} onPress={() => setFilter('all')} />
          <Chip label="Favourites" selected={filter === 'favorites'} color={moduleColors.saved} onPress={() => setFilter('favorites')} />
          {SAVED_TYPES.map((type) => (
            <Chip key={type.value} label={type.label} selected={filter === type.value} color={moduleColors.saved} onPress={() => setFilter(type.value)} />
          ))}
        </ChipRow>

        {isPending ? <Text muted>Loading…</Text> : null}
        {isError ? <Text muted>{error instanceof Error ? error.message : "Couldn't load saved items."}</Text> : null}
        {!isPending && !isError && visible.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title={search || filter !== 'all' ? 'No Saved Items Match' : 'Nothing Saved Yet'}
            description={search || filter !== 'all' ? 'Try adjusting your search query or filters.' : 'Save bookmarks, articles, recipes, and videos to revisit later.'}
            actionTitle={!search && filter === 'all' ? '+ Save a Link' : undefined}
            onAction={!search && filter === 'all' ? () => router.push('/saved/add') : undefined}
          />
        ) : null}

        {visible.map((item) => (
          <SavedCard key={item.id} item={item} />
        ))}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save a link"
        onPress={() => router.push('/saved/add')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: moduleColors.saved,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        })}>
        <Ionicons name="add" size={30} color="#ffffff" />
      </Pressable>
    </View>
  );
}

function SavedCard({ item }: { item: SavedItem }) {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const favorite = useToggleFavorite();
  const remove = useDeleteSavedItem();
  const host = hostOf(item.url);

  function edit() {
    router.push({ pathname: '/saved/item', params: { item: JSON.stringify(item) } });
  }

  function open() {
    if (!item.url) return edit();
    Linking.openURL(item.url).catch(() => Alert.alert("Can't open this link", item.url ?? undefined));
  }

  function openMenu() {
    Alert.alert(item.title, host ?? undefined, [
      ...(item.url ? [{ text: 'Open link', onPress: open }] : []),
      { text: 'Edit', onPress: edit },
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert('Delete this item?', item.title, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={open} onLongPress={openMenu} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <GlassCard
        glowColor={item.isFavorite ? '#ef4444' : undefined}
        style={{ padding: 0, overflow: 'hidden' }}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: 160, backgroundColor: colors.cardMuted }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ padding: spacing.lg, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading" numberOfLines={2} style={{ fontSize: 16 }}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {host ? (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: radius.sm,
                      backgroundColor: `${moduleColors.saved}20`,
                    }}>
                    <Text variant="caption" style={{ color: moduleColors.saved, fontWeight: '700', fontSize: 10 }}>
                      {host}
                    </Text>
                  </View>
                ) : null}
                <Text variant="caption" muted numberOfLines={1}>
                  {SAVED_TYPES.find((t) => t.value === item.type)?.label}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              onPress={() => favorite.mutate({ id: item.id, isFavorite: !item.isFavorite })}
              hitSlop={10}>
              <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={22} color={item.isFavorite ? '#ef4444' : colors.textMuted} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={openMenu} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {item.description ? (
            <Text muted numberOfLines={3} style={{ fontSize: 14, lineHeight: 20 }}>
              {item.description}
            </Text>
          ) : null}
          {item.tags && item.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.xs }}>
              {item.tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: radius.sm,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  }}>
                  <Text variant="caption" muted style={{ fontSize: 11 }}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}
