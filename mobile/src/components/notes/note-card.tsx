import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';

import type { IconName } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { checklistOf, type Note } from '@/features/notes/types';
import { useTranslation } from '@/i18n';
import { directional, isRTL } from '@/i18n/rtl';
import { formatDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

export function openNote(router: ReturnType<typeof useRouter>, note?: Note) {
  router.push({ pathname: '/notes/edit', params: note ? { note: JSON.stringify(note) } : {} });
}

export type NoteLayout = 'list' | 'grid';

type Props = {
  note: Note;
  layout: NoteLayout;
  /** Position in the list: the first few rows fade in (see `useListMotion`). */
  index: number;
  onTogglePin: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onDelete: (note: Note) => void;
  /** Opens the "more options" sheet (also what a long press does). */
  onMenu: (note: Note) => void;
  onToggleItem: (note: Note, itemId: string) => void;
};

/** Minimum width of one swipe action; wider labels (large text, longer translations) grow it. */
const ACTION_WIDTH = spacing.xxxl + spacing.xl; // 72

type SwipeMethods = { close: () => void };

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
      style={{ minWidth: ACTION_WIDTH, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: background }}>
      <Ionicons name={icon} size={22} color={foreground} />
      <Text variant="caption" weight="semiBold" style={{ color: foreground }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * One note, as a list row or a grid tile. In a list, a swipe towards the end of the line (left in LTR) reveals archive and
 * delete, and a swipe towards the start (right in LTR) reveals pin. Swiping is a shortcut: every action is also in the
 * "more" sheet, on long press, and in the screen reader's actions menu.
 *
 * RTL: `ReanimatedSwipeable` is physical (`renderLeftActions` is what a drag to the right reveals, and it already mirrors
 * its own action row), so the two groups are swapped in RTL to keep "pin" on the leading side.
 */
export const NoteCard = memo(function NoteCard({ note, layout: mode, index, onTogglePin, onToggleArchive, onDelete, onMenu, onToggleItem }: Props) {
  const router = useRouter();
  const { t } = useTranslation('notes');
  const { colors, accent } = useTheme();
  const a = accent('notes');
  const grid = mode === 'grid';
  // Enter + exit live on the row. The reflow (`layout`) is done by the list on the FlatList cell, in a single column only.
  const { entering, exiting } = useListMotion(index);
  const pinned = !!note.isPinned;
  const archived = !!note.isArchived;

  const checklist = checklistOf(note);
  const done = checklist?.filter((item) => item.completed).length ?? 0;
  const shown = checklist?.slice(0, grid ? 3 : 5) ?? [];
  const tags = note.tags ?? [];
  const shownTags = tags.slice(0, grid ? 2 : 4);

  const open = useCallback(() => openNote(router, note), [router, note]);
  const date = formatDay(note.updatedAt);
  const meta = checklist ? t('card.metaChecklist', { date, done, total: checklist.length }) : t('card.meta', { date });
  const labelKind = pinned ? (archived ? 'pinnedArchived' : 'pinned') : archived ? 'archived' : 'plain';

  const accessibilityActions = [
    { name: 'pin', label: pinned ? t('action.unpin') : t('action.pin') },
    { name: 'archive', label: archived ? t('action.restore') : t('action.archive') },
    { name: 'delete', label: t('action.delete') },
    { name: 'more', label: t('action.more') },
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
          accessibilityLabel={t(`card.label.${labelKind}`, { title: note.title, meta })}
          accessibilityHint={t('card.hint')}
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
        {grid ? null : (
          <IconButton
            size="sm"
            icon={pinned ? 'pin' : 'pin-outline'}
            accessibilityLabel={pinned ? t('card.unpinNote', { title: note.title }) : t('card.pinNote', { title: note.title })}
            selected={pinned}
            onPress={() => onTogglePin(note)}
          />
        )}
        <IconButton size="sm" icon="ellipsis-horizontal" accessibilityLabel={t('card.moreOptions', { title: note.title })} onPress={() => onMenu(note)} />
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
              {t('card.moreItems', { count: checklist.length - shown.length })}
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
          {tags.length > shownTags.length ? <Tag label={t('card.moreTags', { count: tags.length - shownTags.length })} tone="neutral" /> : null}
        </View>
      ) : null}
    </Card>
  );

  if (grid) {
    // flex 1 + maxWidth keeps a lone last tile at half width instead of stretching across the row
    return (
      <Animated.View entering={entering} exiting={exiting} style={{ flex: 1, maxWidth: '50%' }}>
        {card}
      </Animated.View>
    );
  }

  const leadingActions = (methods: SwipeMethods) => (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }}>
      <SwipeAction
        label={pinned ? t('swipe.unpin') : t('swipe.pin')}
        icon={pinned ? 'pin-outline' : 'pin'}
        background={a.solid}
        foreground={a.onSolid}
        onPress={() => {
          methods.close();
          onTogglePin(note);
        }}
      />
    </View>
  );

  const trailingActions = (methods: SwipeMethods) => (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row' }}>
      <SwipeAction
        label={archived ? t('swipe.restore') : t('swipe.archive')}
        icon={archived ? directional('arrow-undo-outline', 'arrow-redo-outline') : 'archive-outline'}
        background={colors.secondary}
        foreground={colors.secondaryText}
        onPress={() => {
          methods.close();
          onToggleArchive(note);
        }}
      />
      <SwipeAction
        label={t('swipe.delete')}
        icon="trash-outline"
        background={colors.error}
        foreground={colors.onError}
        onPress={() => {
          methods.close();
          onDelete(note);
        }}
      />
    </View>
  );

  // The swipeable's "left" and "right" are physical, so in RTL the leading (pin) group goes on the right.
  const rtl = isRTL();

  return (
    <Animated.View entering={entering} exiting={exiting}>
      <ReanimatedSwipeable
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        containerStyle={{ borderRadius: radius.lg, overflow: 'hidden' }}
        renderLeftActions={(_progress, _translation, methods) => (rtl ? trailingActions(methods) : leadingActions(methods))}
        renderRightActions={(_progress, _translation, methods) => (rtl ? leadingActions(methods) : trailingActions(methods))}>
        {card}
      </ReanimatedSwipeable>
    </Animated.View>
  );
});
