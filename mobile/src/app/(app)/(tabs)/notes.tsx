import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/notes/action-sheet';
import { CollapsingList } from '@/components/notes/collapsing-list';
import { EmptyHero } from '@/components/notes/empty-hero';
import { NoteCard, openNote, type NoteLayout } from '@/components/notes/note-card';
import { useUndoableRemove } from '@/components/notes/use-undoable-remove';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FloatingAction } from '@/components/ui/floating-action';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useDeleteNote, useNotes, usePatchNote } from '@/features/notes/hooks';
import { checklistOf, type Note } from '@/features/notes/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';

const LAYOUT_KEY = 'aura.notes.layout.v1';

type Filter = { kind: 'all' } | { kind: 'pinned' } | { kind: 'archived' } | { kind: 'category'; value: string } | { kind: 'tag'; value: string };

const ALL: Filter = { kind: 'all' };

const byName = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]);

export default function NotesScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { data, isPending, isError, error, refetch } = useNotes();
  const { mutate: patchNote } = usePatchNote();
  const { mutateAsync: deleteNote } = useDeleteNote();

  const [filter, setFilter] = useState<Filter>(ALL);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<NoteLayout>('list');
  const [menuNote, setMenuNote] = useState<Note | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Remember the list / grid choice between launches.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(LAYOUT_KEY)
      .then((saved) => {
        if (alive && (saved === 'list' || saved === 'grid')) setMode(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const changeMode = useCallback((next: NoteLayout) => {
    setMode(next);
    AsyncStorage.setItem(LAYOUT_KEY, next).catch(() => {});
  }, []);

  const { hiddenIds, remove } = useUndoableRemove({ commit: deleteNote, message: 'Note deleted' });

  const notes = useMemo(() => (data ?? []).filter((note) => !hiddenIds.has(note.id)), [data, hiddenIds]);

  const summary = useMemo(() => {
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    let active = 0;
    let pinned = 0;
    for (const note of notes) {
      if (note.isArchived) continue;
      active += 1;
      if (note.isPinned) pinned += 1;
      if (note.category) categories.set(note.category, (categories.get(note.category) ?? 0) + 1);
      for (const tag of new Set(note.tags ?? [])) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
    return {
      all: active,
      pinned,
      archived: notes.length - active,
      categories: [...categories].sort(byName),
      tags: [...tags].sort(byName),
    };
  }, [notes]);

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

  const filtering = search.trim().length > 0 || filter.kind !== 'all';
  const isSelected = (kind: Filter['kind'], value?: string) => filter.kind === kind && (filter.kind === 'category' || filter.kind === 'tag' ? filter.value === value : true);

  const togglePin = useCallback(
    (note: Note) => patchNote({ id: note.id, patch: { isPinned: !note.isPinned } }, { onError: (e) => notify.error(e) }),
    [patchNote, notify],
  );

  const toggleArchive = useCallback(
    (note: Note) => {
      const archiving = !note.isArchived;
      patchNote({ id: note.id, patch: { isArchived: archiving } }, { onError: (e) => notify.error(e) });
      notify.toast({
        message: archiving ? 'Note archived' : 'Note restored',
        severity: 'success',
        action: { label: 'Undo', onPress: () => patchNote({ id: note.id, patch: { isArchived: !archiving } }, { onError: (e) => notify.error(e) }) },
      });
    },
    [patchNote, notify],
  );

  const deleteWithUndo = useCallback((note: Note) => remove(note.id), [remove]);

  const toggleItem = useCallback(
    (note: Note, itemId: string) => {
      const items = checklistOf(note);
      if (!items) return;
      const checklist = items.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
      patchNote({ id: note.id, patch: { metadata: { ...note.metadata, checklist } } }, { onError: (e) => notify.error(e) });
    },
    [patchNote, notify],
  );

  const menuActions = useMemo<SheetAction[]>(() => {
    if (!menuNote) return [];
    return [
      { key: 'open', label: 'Open note', icon: 'create-outline', onPress: () => openNote(router, menuNote) },
      { key: 'pin', label: menuNote.isPinned ? 'Unpin' : 'Pin to top', icon: menuNote.isPinned ? 'pin-outline' : 'pin', onPress: () => togglePin(menuNote) },
      { key: 'archive', label: menuNote.isArchived ? 'Restore from archive' : 'Archive', icon: menuNote.isArchived ? 'arrow-undo-outline' : 'archive-outline', onPress: () => toggleArchive(menuNote) },
      { key: 'delete', label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => deleteWithUndo(menuNote) },
    ];
  }, [menuNote, router, togglePin, toggleArchive, deleteWithUndo]);

  const openMenu = useCallback((note: Note) => {
    haptics.impact();
    setMenuNote(note);
    setMenuOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Note; index: number }) => (
      <NoteCard
        note={item}
        layout={mode}
        index={index}
        onTogglePin={togglePin}
        onToggleArchive={toggleArchive}
        onDelete={deleteWithUndo}
        onMenu={openMenu}
        onToggleItem={toggleItem}
      />
    ),
    [mode, togglePin, toggleArchive, deleteWithUndo, openMenu, toggleItem],
  );

  const clearFilters = () => {
    setFilter(ALL);
    setSearch('');
  };

  const header = (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder="Search notes" value={search} onChangeText={setSearch} debounceMs={200} />
        </View>
        <IconButton icon="list" accessibilityLabel="List view" selected={mode === 'list'} onPress={() => changeMode('list')} haptic="select" />
        <IconButton icon="grid" accessibilityLabel="Grid view" selected={mode === 'grid'} onPress={() => changeMode('grid')} haptic="select" />
      </View>

      <ChipRow>
        <Chip label="All" accent="notes" count={summary.all} selected={isSelected('all')} onPress={() => setFilter(ALL)} />
        <Chip label="Pinned" accent="notes" count={summary.pinned} selected={isSelected('pinned')} onPress={() => setFilter({ kind: 'pinned' })} />
        <Chip label="Archived" accent="notes" count={summary.archived} selected={isSelected('archived')} onPress={() => setFilter({ kind: 'archived' })} />
        {summary.categories.map(([value, count]) => (
          <Chip key={`c-${value}`} label={value} accent="notes" count={count} selected={isSelected('category', value)} onPress={() => setFilter({ kind: 'category', value })} />
        ))}
        {summary.tags.map(([value, count]) => (
          <Chip key={`t-${value}`} label={`#${value}`} accent="notes" count={count} selected={isSelected('tag', value)} onPress={() => setFilter({ kind: 'tag', value })} />
        ))}
      </ChipRow>
    </View>
  );

  let empty;
  if (isPending) {
    empty =
      mode === 'grid' ? (
        <View style={{ flexDirection: 'row', gap: layout.itemGap }}>
          <View style={{ flex: 1 }}>
            <SkeletonCard lines={3} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonCard lines={3} />
          </View>
        </View>
      ) : (
        <View style={{ gap: layout.itemGap }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </View>
      );
  } else if (isError && !data) {
    empty = <ErrorState error={error} onRetry={() => refetch()} />;
  } else if (filtering) {
    empty = <EmptyState variant="noResults" accent="notes" title="No matching notes" description="Try a different search or another filter." onClearFilters={clearFilters} />;
  } else {
    empty = (
      <EmptyHero
        accent="notes"
        icon="document-text-outline"
        title="No notes yet"
        description="Capture thoughts, lists and ideas. They stay on your phone when you are offline."
        actionTitle="Write a note"
        onAction={() => openNote(router)}
      />
    );
  }

  return (
    <>
      <CollapsingList<Note>
        // a new column count needs a new list
        key={mode}
        title="Notes"
        data={visible}
        numColumns={mode === 'grid' ? 2 : 1}
        renderItem={renderItem}
        keyExtractor={(note) => note.id}
        header={header}
        empty={empty}
        onRefresh={() => refetch()}
        fab={<FloatingAction accent="notes" accessibilityLabel="New note" onPress={() => openNote(router)} />}
      />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={menuNote?.title} actions={menuActions} />
    </>
  );
}
