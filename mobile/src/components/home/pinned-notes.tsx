import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { ScrollView } from 'react-native';

import { GlassCard } from '@/components/home/glass-card';
import { Section, SectionHead } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { openNote } from '@/components/notes/note-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { DashboardToday } from '@/features/dashboard/use-dashboard';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

const CARD_WIDTH = layout.minTouchTarget * 4; // 176

/**
 * Pinned notes as a sideways strip of cards; each opens the note editor. With none pinned it renders nothing, unless
 * `showEmpty` is set (Notes is a module the person chose for Home): then a short invitation to pin or write one.
 */
export const PinnedNotes = memo(function PinnedNotes({ notes, index, showEmpty = false }: { notes: DashboardToday['pinnedNotes']; index: number; showEmpty?: boolean }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors } = useTheme();
  if (notes.length === 0) {
    if (!showEmpty) return null;
    return (
      <Section index={index}>
        <SectionHead
          title={t('pinned.title')}
          description={t('pinned.description')}
          actionLabel={t('pinned.seeAll')}
          actionAccessibilityLabel={t('pinned.seeAllLabel')}
          onActionPress={() => router.push('/notes')}
        />
        <GlassCard style={{ gap: spacing.md }}>
          <Text variant="label" weight="semiBold">
            {t('pinned.emptyTitle')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('pinned.emptyBody')}
          </Text>
          <Button title={t('pinned.emptyAction')} variant="secondary" leftIcon="add" fullWidth={false} onPress={() => router.push('/notes/edit')} />
        </GlassCard>
      </Section>
    );
  }

  return (
    <Section index={index}>
      <SectionHead
        title={t('pinned.title')}
        description={t('pinned.description')}
        actionLabel={t('pinned.seeAll')}
        actionAccessibilityLabel={t('pinned.seeAllLabel')}
        onActionPress={() => router.push('/notes')}
      />
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
        {notes.map((note) => {
          const title = note.title.trim() || t('pinned.noTitle');
          const progress = note.checklistTotal ? t('pinned.checklist', { done: note.checklistDone ?? 0, total: note.checklistTotal }) : null;
          return (
            <PressableScale
              key={note.id}
              accessibilityRole="button"
              accessibilityLabel={[title, progress ?? note.preview].filter(Boolean).join(', ')}
              accessibilityHint={t('pinned.openHint')}
              haptic="tap"
              ringRadius={radius.xl}
              onPress={() => openNote(router, note)}
              style={{
                width: CARD_WIDTH,
                minHeight: layout.minTouchTarget * 2,
                gap: spacing.sm,
                padding: spacing.lg,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}>
              <Ionicons name="pin" size={14} color={colors.textMuted} />
              <Text variant="label" weight="semiBold" numberOfLines={2}>
                {title}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={3}>
                {progress ?? note.preview}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </Section>
  );
});
