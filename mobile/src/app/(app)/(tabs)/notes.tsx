import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { NoteCard, openNote } from '@/components/notes/note-card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useNotes } from '@/features/notes/hooks';
import { checklistOf } from '@/features/notes/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Filter = { kind: 'all' } | { kind: 'pinned' } | { kind: 'archived' } | { kind: 'category'; value: string } | { kind: 'tag'; value: string };

export default function NotesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = useNotes();
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [search, setSearch] = useState('');

  const notes = useMemo(() => data ?? [], [data]);
  const active = useMemo(() => notes.filter((note) => !note.isArchived), [notes]);

  const categories = useMemo(() => [...new Set(active.map((note) => note.category).filter((c): c is string => !!c))].sort(), [active]);
  const tags = useMemo(() => [...new Set(active.flatMap((note) => note.tags ?? []))].sort(), [active]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (filter.kind === 'archived') {
        if (!note.isArchived) return false;
      } else if (note.isArchived) {
        return false;
      }
      if (filter.kind === 'pinned' && !note.isPinned) return false;
      if (filter.kind === 'category' && note.category !== filter.value) return false;
      if (filter.kind === 'tag' && !(note.tags ?? []).includes(filter.value)) return false;
      if (!query) return true;
      const haystack = [note.title, note.content, note.category, ...(note.tags ?? []), ...(checklistOf(note)?.map((item) => item.text) ?? [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [notes, filter, search]);

  const isSelected = (kind: Filter['kind'], value?: string) => filter.kind === kind && (filter.kind === 'category' || filter.kind === 'tag' ? filter.value === value : true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
        <Text variant="title">Notes</Text>

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
            placeholder="Search notes"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 44, color: colors.text, fontSize: 15 }}
          />
        </View>

        <ChipRow>
          <Chip label="All" selected={isSelected('all')} color={moduleColors.notes} onPress={() => setFilter({ kind: 'all' })} />
          <Chip label="Pinned" selected={isSelected('pinned')} color={moduleColors.notes} onPress={() => setFilter({ kind: 'pinned' })} />
          <Chip label="Archived" selected={isSelected('archived')} color={moduleColors.notes} onPress={() => setFilter({ kind: 'archived' })} />
          {categories.map((value) => (
            <Chip key={`c-${value}`} label={value} selected={isSelected('category', value)} color={moduleColors.notes} onPress={() => setFilter({ kind: 'category', value })} />
          ))}
          {tags.map((value) => (
            <Chip key={`t-${value}`} label={`#${value}`} selected={isSelected('tag', value)} color={moduleColors.notes} onPress={() => setFilter({ kind: 'tag', value })} />
          ))}
        </ChipRow>

        {isPending ? <Text muted>Loading…</Text> : null}
        {isError ? <Text muted>{error instanceof Error ? error.message : "Couldn't load notes."}</Text> : null}
        {!isPending && !isError && visible.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={search || filter.kind !== 'all' ? 'No Notes Match' : 'No Notes Yet'}
            description={search || filter.kind !== 'all' ? 'Try adjusting your search or active filter tags.' : 'Capture thoughts, lists, and ideas. Tap + to write your first note.'}
            actionTitle={!search && filter.kind === 'all' ? '+ Create Note' : undefined}
            onAction={!search && filter.kind === 'all' ? () => openNote(router) : undefined}
          />
        ) : null}

        {visible.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New note"
        onPress={() => openNote(router)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.lg,
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: moduleColors.notes,
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
