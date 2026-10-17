import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type ReactNode } from 'react';
import { FlatList, StyleSheet, TextInput, View, type ListRenderItemInfo } from 'react-native';

import { MessageBubble } from '@/components/ai/message-bubble';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { AiMessage } from '@/features/ai/types';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { MAX_FONT_SCALE, fontWeightFamily, layout, radius, spacing, typeScale, useTheme } from '@/theme';

import { COMPOSER_MAX_HEIGHT, FOR_YOU_ITEMS, type ForYouItem, type IconName, type QuickPrompt } from './widget-constants';

const MESSAGE_LIST_STYLE = { padding: spacing.md, gap: spacing.md } as const;
const CARD_LIST_STYLE = { padding: spacing.md, gap: spacing.sm } as const;
const EMPTY_ICON_SIZE = 28;

// ---------------------------------------------------------------------------------------------------------------
// Shared empty state
// ---------------------------------------------------------------------------------------------------------------

type EmptyProps = { icon: IconName; iconColor: string; tileColor: string; title: string; body: string; children?: ReactNode };

function TabEmpty({ icon, iconColor, tileColor, title, body, children }: EmptyProps) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: tileColor }]}>
        <Ionicons name={icon} size={EMPTY_ICON_SIZE} color={iconColor} />
      </View>
      <Text variant="title" style={styles.centered}>
        {title}
      </Text>
      <Text variant="caption" muted style={[styles.centered, styles.emptyBody]}>
        {body}
      </Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Chat tab
// ---------------------------------------------------------------------------------------------------------------

type QuickPromptRowProps = { item: QuickPrompt; onPress: (prompt: string) => void };

const QuickPromptRow = memo(function QuickPromptRow({ item, onPress }: QuickPromptRowProps) {
  const { colors, accent } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={item.prompt}
      onPress={() => onPress(item.prompt)}
      haptic="tap"
      ringRadius={radius.md}
      style={[styles.quickPrompt, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
      <Ionicons name={directional('arrow-forward', 'arrow-back')} size={16} color={accent('ai').text} />
      <Text variant="caption" weight="medium" style={styles.flex}>
        {item.prompt}
      </Text>
    </PressableScale>
  );
});

type ComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  pageTitle: string;
  modelName: string;
};

const Composer = memo(function Composer({ value, onChangeText, onSend, onStop, busy, pageTitle, modelName }: ComposerProps) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('ai');
  const ai = accent('ai');
  const canSend = value.trim().length > 0;
  return (
    <View style={[styles.composer, { borderTopColor: colors.border }]}>
      <Text variant="caption" muted>
        {t('chat.model', { name: modelName })}
      </Text>
      <View style={styles.composerRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('tabs.composerPlaceholder', { page: pageTitle })}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('tabs.composerLabel')}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          multiline
          maxLength={3000}
          style={[styles.input, { backgroundColor: colors.cardMuted, borderColor: colors.borderStrong, color: colors.text }]}
        />
        {busy ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('tabs.stop')}
            onPress={onStop}
            haptic="tap"
            ringRadius={radius.pill}
            style={[styles.roundButton, { backgroundColor: colors.cardMuted, borderColor: colors.borderStrong }]}>
            <Ionicons name="stop" size={18} color={colors.text} />
          </PressableScale>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            haptic="tap"
            ringRadius={radius.pill}
            style={[styles.roundButton, { backgroundColor: ai.solid }]}>
            <Ionicons name="arrow-up" size={20} color={ai.onSolid} />
          </PressableScale>
        )}
      </View>
    </View>
  );
});

export type ChatTabProps = {
  messages: AiMessage[];
  busy: boolean;
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
  pageTitle: string;
  quickPrompts: QuickPrompt[];
  modelName: string;
  input: string;
  onChangeInput: (text: string) => void;
  onSend: (text?: string) => void;
  onStop: () => void;
};

const keyOfMessage = (item: AiMessage) => item.id;

export const ChatTab = memo(function ChatTab({
  messages,
  busy,
  onConfirm,
  onCancel,
  pageTitle,
  quickPrompts,
  modelName,
  input,
  onChangeInput,
  onSend,
  onStop,
}: ChatTabProps) {
  const { accent } = useTheme();
  const { t } = useTranslation('ai');
  const ai = accent('ai');

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<AiMessage>) => (
      <MessageBubble message={item} disabled={busy} onConfirm={onConfirm} onCancel={onCancel} />
    ),
    [busy, onCancel, onConfirm],
  );
  const sendTyped = useCallback(() => onSend(), [onSend]);

  return (
    <View style={styles.flex}>
      {messages.length === 0 ? (
        <TabEmpty
          icon="sparkles"
          iconColor={ai.text}
          tileColor={ai.soft}
          title={t('tabs.emptyTitle', { page: pageTitle })}
          body={t('tabs.emptyBody')}>
          <View style={styles.quickPrompts}>
            {quickPrompts.map((item) => (
              <QuickPromptRow key={item.label} item={item} onPress={onSend} />
            ))}
          </View>
        </TabEmpty>
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={keyOfMessage}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={MESSAGE_LIST_STYLE}
          initialNumToRender={10}
          windowSize={7}
        />
      )}
      <Composer
        value={input}
        onChangeText={onChangeInput}
        onSend={sendTyped}
        onStop={onStop}
        busy={busy}
        pageTitle={pageTitle}
        modelName={modelName}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------------------------------------------
// For You tab
// ---------------------------------------------------------------------------------------------------------------

const ForYouCard = memo(function ForYouCard({ item, onPress }: { item: ForYouItem; onPress: (prompt: string) => void }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('ai');
  const tone = accent(item.module);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('tabs.forYouSpoken', { title: item.title, desc: item.desc })}
      onPress={() => onPress(item.prompt)}
      haptic="tap"
      ringRadius={radius.lg}
      style={[styles.forYouCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.forYouIcon, { backgroundColor: tone.soft }]}>
        <Ionicons name={item.icon} size={20} color={tone.text} />
      </View>
      <View style={styles.flex}>
        <View style={styles.forYouTitleRow}>
          <Text variant="label" weight="bold" style={styles.flex}>
            {item.title}
          </Text>
          <Text variant="caption" weight="bold" color={tone.text}>
            {item.tag}
          </Text>
        </View>
        <Text variant="caption" muted numberOfLines={2}>
          {item.desc}
        </Text>
      </View>
    </PressableScale>
  );
});

const keyOfForYou = (item: ForYouItem) => item.id;

export const ForYouTab = memo(function ForYouTab({ onSend }: { onSend: (text?: string) => void }) {
  const renderItem = useCallback(({ item }: ListRenderItemInfo<ForYouItem>) => <ForYouCard item={item} onPress={onSend} />, [onSend]);
  return <FlatList data={FOR_YOU_ITEMS} keyExtractor={keyOfForYou} renderItem={renderItem} contentContainerStyle={CARD_LIST_STYLE} />;
});

// ---------------------------------------------------------------------------------------------------------------
// Drafts tab
// ---------------------------------------------------------------------------------------------------------------

type DraftCardProps = { message: AiMessage; onConfirm: (id: string) => void; onCancel: (id: string) => void };

const DraftCard = memo(function DraftCard({ message, onConfirm, onCancel }: DraftCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('ai');
  const summary = message.pendingAction?.summary || t('tabs.draftFallback', { tool: message.pendingAction?.tool ?? '' });
  return (
    <View style={[styles.draftCard, { backgroundColor: colors.card, borderColor: colors.warningBorder }]}>
      <View style={styles.draftHeader}>
        <Ionicons name="alert-circle" size={18} color={colors.warningText} />
        <Text variant="label" weight="bold" color="warningText">
          {t('tabs.pending')}
        </Text>
      </View>
      <Text variant="body">{summary}</Text>
      <View style={styles.draftActions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('tabs.approveSpoken', { summary })}
          onPress={() => onConfirm(message.id)}
          haptic="tap"
          ringRadius={radius.md}
          style={[styles.draftButton, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={16} color={colors.onSuccess} />
          <Text variant="label" weight="bold" color="onSuccess">
            {t('tabs.approve')}
          </Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('tabs.cancelSpoken', { summary })}
          onPress={() => onCancel(message.id)}
          haptic="tap"
          ringRadius={radius.md}
          style={[styles.draftButton, styles.outlined, { backgroundColor: colors.cardMuted, borderColor: colors.borderStrong }]}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
          <Text variant="label" weight="bold" color="textSecondary">
            {t('bubble.cancel')}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
});

export type DraftsTabProps = {
  drafts: AiMessage[];
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
};

export const DraftsTab = memo(function DraftsTab({ drafts, onConfirm, onCancel }: DraftsTabProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('ai');
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AiMessage>) => <DraftCard message={item} onConfirm={onConfirm} onCancel={onCancel} />,
    [onCancel, onConfirm],
  );

  if (drafts.length === 0) {
    return (
      <TabEmpty
        icon="checkmark-done"
        iconColor={colors.successText}
        tileColor={colors.successContainer}
        title={t('tabs.draftsEmptyTitle')}
        body={t('tabs.draftsEmptyBody')}
      />
    );
  }
  return <FlatList data={drafts} keyExtractor={keyOfMessage} renderItem={renderItem} contentContainerStyle={MESSAGE_LIST_STYLE} />;
});

// ---------------------------------------------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: spacing.xxxl + spacing.sm,
    height: spacing.xxxl + spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBody: { maxWidth: 280 },
  quickPrompts: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    maxHeight: COMPOSER_MAX_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    fontFamily: fontWeightFamily.regular,
    textAlignVertical: 'top',
  },
  roundButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  forYouIcon: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  draftCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  draftActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  outlined: { borderWidth: 1 },
});
