import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/notes/action-sheet';
import { CollapsingList } from '@/components/notes/collapsing-list';
import { EmptyHero } from '@/components/notes/empty-hero';
import { friendlyError } from '@/components/notes/friendly-error';
import { NoteCard, openNote, type NoteLayout } from '@/components/notes/note-card';
import { useUndoableRemove } from '@/components/notes/use-undoable-remove';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FloatingAction } from '@/components/ui/floating-action';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDeleteNote, useNotes, usePatchNote } from '@/features/notes/hooks';
import { checklistOf, type Note } from '@/features/notes/types';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';

const LAYOUT_KEY = 'aura.notes.layout.v1';

type Filter = { kind: 'all' } | { kind: 'pinned' } | { kind: 'archived' } | { kind: 'category'; value: string } | { kind: 'tag'; value: string };

const ALL: Filter = { kind: 'all' };

const byName = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]);
const keyOf = (note: Note) => note.id;

export default function NotesScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('notes');
  const { data, isPending, isError, error, refetch, isRefetching } = useNotes();
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

  /** A friendly toast for a failed action: offline copy when the server was unreachable, never raw server text. */
  const fail = useCallback((e: unknown, message: string) => notify.error(friendlyError(e, message, t('errors.offline'))), [notify, t]);

  const { hiddenIds, remove } = useUndoableRemove({
    commit: async (id) => {
      await deleteNote(id);
      analytics.track('note_deleted');
    },
    message: t('toast.deleted'),
    undoLabel: t('toast.undo'),
    onError: (e) => fail(e, t('errors.delete')),
  });

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
    (note: Note) => patchNote({ id: note.id, patch: { isPinned: !note.isPinned } }, { onError: (e) => fail(e, t('errors.update')) }),
    [patchNote, fail, t],
  );

  const toggleArchive = useCallback(
    (note: Note) => {
      const archiving = !note.isArchived;
      patchNote(
        { id: note.id, patch: { isArchived: archiving } },
        {
          onSuccess: () => {
            if (archiving) analytics.track('note_archived');
          },
          onError: (e) => fail(e, t('errors.update')),
        },
      );
      notify.toast({
        message: archiving ? t('toast.archived') : t('toast.restored'),
        severity: 'success',
        action: { label: t('toast.undo'), onPress: () => patchNote({ id: note.id, patch: { isArchived: !archiving } }, { onError: (e) => fail(e, t('errors.update')) }) },
      });
    },
    [patchNote, notify, fail, t],
  );

  const deleteWithUndo = useCallback((note: Note) => remove(note.id), [remove]);

  const toggleItem = useCallback(
    (note: Note, itemId: string) => {
      const items = checklistOf(note);
      if (!items) return;
      const checklist = items.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
      patchNote({ id: note.id, patch: { metadata: { ...note.metadata, checklist } } }, { onError: (e) => fail(e, t('errors.update')) });
    },
    [patchNote, fail, t],
  );

  const menuActions = useMemo<SheetAction[]>(() => {
    if (!menuNote) return [];
    return [
      { key: 'open', label: t('action.open'), icon: 'create-outline', onPress: () => openNote(router, menuNote) },
      { key: 'pin', label: menuNote.isPinned ? t('action.unpin') : t('action.pin'), icon: menuNote.isPinned ? 'pin-outline' : 'pin', onPress: () => togglePin(menuNote) },
      {
        key: 'archive',
        label: menuNote.isArchived ? t('action.restore') : t('action.archive'),
        icon: menuNote.isArchived ? directional('arrow-undo-outline', 'arrow-redo-outline') : 'archive-outline',
        onPress: () => toggleArchive(menuNote),
      },
      { key: 'delete', label: t('action.delete'), icon: 'trash-outline', destructive: true, onPress: () => deleteWithUndo(menuNote) },
    ];
  }, [menuNote, router, t, togglePin, toggleArchive, deleteWithUndo]);

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

  // Refreshing failed but there is something to show: say so in a row above the list instead of replacing it.
  const refreshFailed = isError && !!data;

  const header = (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder={t('search.placeholder')} accessibilityLabel={t('search.placeholder')} value={search} onChangeText={setSearch} debounceMs={200} />
        </View>
        <IconButton icon="list" accessibilityLabel={t('layout.list')} selected={mode === 'list'} onPress={() => changeMode('list')} haptic="select" />
        <IconButton icon="grid" accessibilityLabel={t('layout.grid')} selected={mode === 'grid'} onPress={() => changeMode('grid')} haptic="select" />
      </View>

      <ChipRow>
        <Chip label={t('filter.all')} accent="notes" count={summary.all} selected={isSelected('all')} onPress={() => setFilter(ALL)} />
        <Chip label={t('filter.pinned')} accent="notes" count={summary.pinned} selected={isSelected('pinned')} onPress={() => setFilter({ kind: 'pinned' })} />
        <Chip label={t('filter.archived')} accent="notes" count={summary.archived} selected={isSelected('archived')} onPress={() => setFilter({ kind: 'archived' })} />
        {summary.categories.map(([value, count]) => (
          <Chip key={`c-${value}`} label={value} accent="notes" count={count} selected={isSelected('category', value)} onPress={() => setFilter({ kind: 'category', value })} />
        ))}
        {summary.tags.map(([value, count]) => (
          <Chip key={`t-${value}`} label={`#${value}`} accent="notes" count={count} selected={isSelected('tag', value)} onPress={() => setFilter({ kind: 'tag', value })} />
        ))}
      </ChipRow>

      {refreshFailed ? (
        <ErrorState size="inline" error={error} title={t('refreshError.title')} message={t('refreshError.message')} retrying={isRefetching} onRetry={() => refetch()} />
      ) : null}

      {/* Announces how many notes match when a search or filter changes. */}
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
    empty = <ErrorState error={error} retrying={isRefetching} onRetry={() => refetch()} />;
  } else if (filtering) {
    empty = <EmptyState variant="noResults" accent="notes" title={t('empty.noMatchTitle')} description={t('empty.noMatchDescription')} onClearFilters={clearFilters} />;
  } else {
    empty = (
      <EmptyHero
        accent="notes"
        icon="document-text-outline"
        title={t('empty.title')}
        description={t('empty.description')}
        actionTitle={t('empty.action')}
        onAction={() => openNote(router)}
      />
    );
  }

  return (
    <>
      <CollapsingList<Note>
        // a new column count needs a new list
        key={mode}
        title={t('title')}
        data={visible}
        numColumns={mode === 'grid' ? 2 : 1}
        renderItem={renderItem}
        keyExtractor={keyOf}
        header={header}
        empty={empty}
        onRefresh={() => refetch()}
        // a grid row holds two tiles, so it needs fewer rows on the first pass
        initialNumToRender={mode === 'grid' ? 5 : 8}
        windowSize={mode === 'grid' ? 7 : 9}
        fab={<FloatingAction accent="notes" accessibilityLabel={t('fab')} onPress={() => openNote(router)} />}
      />
      <ActionSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={menuNote?.title} actions={menuActions} />
    </>
  );
}
