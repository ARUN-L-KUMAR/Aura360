import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { IconName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { checklistOf, type Note } from '@/features/notes/types';
import { formatDay } from '@/lib/format';
import { duration, radius, spacing, useTheme } from '@/theme';

export function openNote(router: ReturnType<typeof useRouter>, note?: Note) {
  router.push({ pathname: '/notes/edit', params: note ? { note: JSON.stringify(note) } : {} });
}

export type NoteLayout = 'list' | 'grid';

type Props = {
  note: Note;
  layout: NoteLayout;
  /** Position in the list: the first few rows fade in. */
  index: number;
  onTogglePin: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onDelete: (note: Note) => void;
  /** Opens the "more options" sheet (also what a long press does). */
  onMenu: (note: Note) => void;
  onToggleItem: (note: Note, itemId: string) => void;
};

const ACTION_WIDTH = spacing.xxxl + spacing.xl; // 72
const MAX_ANIMATED_ROWS = 8;

function SwipeAction({ label, icon, background, foreground, onPress }: { label: string; icon: IconName; background: string; foreground: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      haptic="tap"
      scaleTo={1}
      focusRing={false}
      hitSlop={0}
      onPress={onPress}
      style={{ width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: background }}>
      <Ionicons name={icon} size={22} color={foreground} />
      <Text variant="caption" weight="semiBold" style={{ color: foreground }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * One note, as a list row (swipe left for archive / delete, swipe right to pin) or a grid tile. Swiping is a shortcut:
 * every action is also in the "more" sheet, on long press, and in the screen reader's actions menu.
 */
export const NoteCard = memo(function NoteCard({ note, layout: mode, index, onTogglePin, onToggleArchive, onDelete, onMenu, onToggleItem }: Props) {
  const router = useRouter();
  const { colors, accent, reduceMotion } = useTheme();
  const a = accent('notes');
  const grid = mode === 'grid';
  const pinned = !!note.isPinned;
  const archived = !!note.isArchived;

  const checklist = checklistOf(note);
  const done = checklist?.filter((item) => item.completed).length ?? 0;
  const shown = checklist?.slice(0, grid ? 3 : 5) ?? [];
  const tags = note.tags ?? [];
  const shownTags = tags.slice(0, grid ? 2 : 4);

  const open = useCallback(() => openNote(router, note), [router, note]);
  const meta = [formatDay(note.updatedAt), checklist ? `${done} of ${checklist.length} done` : null].filter(Boolean).join(' · ');

  const accessibilityActions = [
    { name: 'pin', label: pinned ? 'Unpin' : 'Pin to top' },
    { name: 'archive', label: archived ? 'Restore from archive' : 'Archive' },
    { name: 'delete', label: 'Delete' },
    { name: 'more', label: 'More options' },
  ];
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'pin':
        return onTogglePin(note);
      case 'archive':
        return onToggleArchive(note);
      case 'delete':
        return onDelete(note);
      case 'more':
        return onMenu(note);
    }
  };

  const card = (
    <Card variant={pinned ? 'tinted' : 'outlined'} accent="notes" padding="md" style={{ gap: spacing.sm, flex: grid ? 1 : undefined }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={[note.title, pinned ? 'pinned' : null, archived ? 'archived' : null, meta].filter(Boolean).join(', ')}
          accessibilityHint="Opens the note. More actions are available."
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={onAccessibilityAction}
          scaleTo={1}
          ringRadius={radius.sm}
          onPress={open}
          onLongPress={() => onMenu(note)}
          style={{ flex: 1, gap: spacing.xs, paddingVertical: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
            {pinned ? <Ionicons name="pin" size={16} color={a.text} style={{ marginTop: spacing.xs }} /> : null}
            <Text variant="title" numberOfLines={2} style={{ flex: 1 }}>
              {note.title}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        </PressableScale>
        {grid ? null : <IconButton size="sm" icon={pinned ? 'pin' : 'pin-outline'} accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'} selected={pinned} onPress={() => onTogglePin(note)} />}
        <IconButton size="sm" icon="ellipsis-horizontal" accessibilityLabel="More options" onPress={() => onMenu(note)} />
      </View>

      {checklist ? (
        <View>
          {shown.map((item) => (
            <PressableScale
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityLabel={item.text}
              accessibilityState={{ checked: item.completed }}
              haptic="select"
              scaleTo={1}
              ringRadius={radius.sm}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm }}
              onPress={() => onToggleItem(note, item.id)}
              style={{ minHeight: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={20} color={item.completed ? a.text : colors.textMuted} />
              <Text
                variant="body"
                color={item.completed ? 'textMuted' : 'text'}
                numberOfLines={1}
                style={{ flex: 1, textDecorationLine: item.completed ? 'line-through' : 'none' }}>
                {item.text}
              </Text>
            </PressableScale>
          ))}
          {checklist.length > shown.length ? (
            <Text variant="caption" color="textSecondary">
              + {checklist.length - shown.length} more {checklist.length - shown.length === 1 ? 'item' : 'items'}
            </Text>
          ) : null}
        </View>
      ) : note.content ? (
        <PressableScale accessible={false} scaleTo={1} focusRing={false} hitSlop={0} onPress={open} onLongPress={() => onMenu(note)}>
          <Text variant="body" color="textSecondary" numberOfLines={grid ? 6 : 4}>
            {note.content}
          </Text>
        </PressableScale>
      ) : null}

      {note.category || shownTags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {note.category ? <Tag label={note.category} accent="notes" /> : null}
          {shownTags.map((tag) => (
            <Tag key={tag} label={`#${tag}`} tone="neutral" />
          ))}
          {tags.length > shownTags.length ? <Tag label={`+${tags.length - shownTags.length}`} tone="neutral" /> : null}
        </View>
      ) : null}
    </Card>
  );

  const entering = reduceMotion || index >= MAX_ANIMATED_ROWS ? undefined : FadeInDown.delay(index * 40).duration(duration.base);

  if (grid) {
    // flex 1 + maxWidth keeps a lone last tile at half width instead of stretching across the row
    return (
      <Animated.View entering={entering} style={{ flex: 1, maxWidth: '50%' }}>
        {card}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entering}>
      <ReanimatedSwipeable
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        containerStyle={{ borderRadius: radius.lg, overflow: 'hidden' }}
        renderLeftActions={(_progress, _translation, methods) => (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }}>
            <SwipeAction
              label={pinned ? 'Unpin' : 'Pin'}
              icon={pinned ? 'pin-outline' : 'pin'}
              background={a.solid}
              foreground={a.onSolid}
              onPress={() => {
                methods.close();
                onTogglePin(note);
              }}
            />
          </View>
        )}
        renderRightActions={(_progress, _translation, methods) => (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }}>
            <SwipeAction
              label={archived ? 'Restore' : 'Archive'}
              icon={archived ? 'arrow-undo-outline' : 'archive-outline'}
              background={colors.secondary}
              foreground={colors.secondaryText}
              onPress={() => {
                methods.close();
                onToggleArchive(note);
              }}
            />
            <SwipeAction
              label="Delete"
              icon="trash-outline"
              background={colors.error}
              foreground={colors.onError}
              onPress={() => {
                methods.close();
                onDelete(note);
              }}
            />
          </View>
        )}>
        {card}
      </ReanimatedSwipeable>
    </Animated.View>
  );
});
