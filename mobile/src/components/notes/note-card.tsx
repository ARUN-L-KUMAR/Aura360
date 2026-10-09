import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useDeleteNote, usePatchNote } from '@/features/notes/hooks';
import { checklistOf, type Note } from '@/features/notes/types';
import { formatDay } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function openNote(router: ReturnType<typeof useRouter>, note?: Note) {
  router.push({ pathname: '/notes/edit', params: note ? { note: JSON.stringify(note) } : {} });
}

export function NoteCard({ note }: { note: Note }) {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const patch = usePatchNote();
  const remove = useDeleteNote();
  const checklist = checklistOf(note);
  const done = checklist?.filter((item) => item.completed).length ?? 0;

  function toggleItem(itemId: string) {
    if (!checklist) return;
    const updated = checklist.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item));
    patch.mutate({ id: note.id, patch: { metadata: { ...note.metadata, checklist: updated } } });
  }

  function openMenu() {
    Alert.alert(note.title, undefined, [
      { text: note.isPinned ? 'Unpin' : 'Pin to top', onPress: () => patch.mutate({ id: note.id, patch: { isPinned: !note.isPinned } }) },
      { text: note.isArchived ? 'Restore from archive' : 'Archive', onPress: () => patch.mutate({ id: note.id, patch: { isArchived: !note.isArchived } }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete this note?', note.title, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(note.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${note.title}${note.isPinned ? ', pinned' : ''}`}
      onPress={() => openNote(router, note)}
      onLongPress={openMenu}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <GlassCard
        glowColor={note.isPinned ? moduleColors.notes : undefined}
        style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {note.isPinned ? (
                <Ionicons name="pin" size={14} color={moduleColors.notes} />
              ) : null}
              <Text variant="heading" numberOfLines={2} style={{ fontSize: 16 }}>
                {note.title}
              </Text>
            </View>
            <Text variant="caption" muted>
              {[note.category, formatDay(note.updatedAt), checklist ? `${done}/${checklist.length} done` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={note.isPinned ? 'Unpin note' : 'Pin note'}
            onPress={() => patch.mutate({ id: note.id, patch: { isPinned: !note.isPinned } })}
            hitSlop={10}>
            <Ionicons name={note.isPinned ? 'pin' : 'pin-outline'} size={18} color={note.isPinned ? moduleColors.notes : colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={openMenu} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {checklist ? (
          <View style={{ gap: spacing.xs, marginTop: 2 }}>
            {checklist.slice(0, 5).map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                onPress={() => toggleItem(item.id)}
                hitSlop={4}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={18} color={item.completed ? moduleColors.notes : colors.textMuted} />
                <Text style={{ flex: 1, textDecorationLine: item.completed ? 'line-through' : 'none', fontSize: 14 }} muted={item.completed} numberOfLines={1}>
                  {item.text}
                </Text>
              </Pressable>
            ))}
            {checklist.length > 5 ? (
              <Text variant="caption" muted>
                + {checklist.length - 5} more items
              </Text>
            ) : null}
          </View>
        ) : note.content ? (
          <Text muted numberOfLines={4} style={{ fontSize: 14, lineHeight: 20 }}>
            {note.content}
          </Text>
        ) : null}

        {note.tags && note.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.xs }}>
            {note.tags.map((tag) => (
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
      </GlassCard>
    </Pressable>
  );
}

