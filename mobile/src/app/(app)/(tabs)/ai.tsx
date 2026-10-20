import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type TextInput } from 'react-native';

import { MessageBubble } from '@/components/ai/message-bubble';
import Ionicons from '@expo/vector-icons/Ionicons';

import { IconButton } from '@/components/ui/icon-button';
import { PremiumHero } from '@/components/ui/premium-hero';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { aiActions } from '@/features/ai/threads';
import { AI_MODELS, SUGGESTED_PROMPTS, type AiMessage } from '@/features/ai/types';
import { useAiChat } from '@/features/ai/use-chat';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { analytics } from '@/lib/telemetry';
import { MAX_FONT_SCALE, layout, radius, spacing, typeScale, useTheme, type ModuleKey } from '@/theme';

/** Which module's colour each suggested prompt wears (by its icon), so the cards read like the rest of the app. */
const PROMPT_ACCENT: Record<string, ModuleKey> = {
  'wallet-outline': 'finance',
  'barbell-outline': 'fitness',
  'restaurant-outline': 'food',
  'sparkles-outline': 'skincare',
  'time-outline': 'time',
  'document-text-outline': 'notes',
};

const MAX_LENGTH = 3000;
const COMPOSER_LINES = 5;
/** Show the character counter only when the limit is close. */
const COUNT_FROM = Math.round(MAX_LENGTH * 0.9);

/** Placeholder for the conversation while the saved chats load from the phone. */
function ChatSkeleton() {
  const { t } = useTranslation('ai');
  return (
    <SkeletonGroup label={t('chat.loading')} style={styles.skeleton}>
      <View style={styles.skeletonUser}>
        <Skeleton width="55%" height={spacing.xxl + spacing.md} rounded="lg" />
      </View>
      <View style={styles.skeletonModel}>
        <Skeleton shape="circle" size={spacing.xl + spacing.xs} />
        <Skeleton width="80%" height={spacing.xxxl * 2} rounded="lg" />
      </View>
      <View style={styles.skeletonUser}>
        <Skeleton width="40%" height={spacing.xxl + spacing.md} rounded="lg" />
      </View>
    </SkeletonGroup>
  );
}

type ChatRowProps = {
  message: AiMessage;
  marginTop: number;
  disabled: boolean;
  showActions: boolean;
  showTime: boolean;
  canRetry: boolean;
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
  onRetry: (messageId: string) => void;
};

/**
 * One message in the list. Every prop is a primitive, the message object itself or a stable callback, so while a reply
 * streams in only the row that is changing renders again.
 */
const ChatRow = memo(function ChatRow({ message, marginTop, disabled, showActions, showTime, canRetry, onConfirm, onCancel, onRetry }: ChatRowProps) {
  return (
    <View style={{ marginTop }}>
      <MessageBubble
        message={message}
        disabled={disabled}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onRetry={canRetry ? onRetry : undefined}
        showActions={showActions}
        showTime={showTime}
      />
    </View>
  );
});

const keyOfMessage = (message: AiMessage) => message.id;

export default function AskAuraScreen() {
  const router = useRouter();
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const { online } = useOfflineSnapshot();
  const { fontScale } = useWindowDimensions();
  const { store, thread, busy, send, confirmAction, cancelAction, stop } = useAiChat();
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const wasBusy = useRef(false);

  const modelName = AI_MODELS.find((model) => model.id === store.model)?.name ?? store.model;
  const messages = thread?.messages;
  // Inverted list: newest at the bottom, and the view stays anchored there while a reply grows.
  const data = useMemo(() => [...(messages ?? [])].reverse(), [messages]);
  const isEmpty = store.hydrated && data.length === 0;
  const canSend = input.trim().length > 0 && !busy && online;

  // About five lines, following the system font size.
  const composerMaxHeight = Math.round(typeScale.body.lineHeight * Math.min(fontScale, MAX_FONT_SCALE) * COMPOSER_LINES + spacing.md * 2);

  // Tell screen-reader users when a reply has finished (the text itself streams in silently).
  useEffect(() => {
    if (wasBusy.current && !busy) AccessibilityInfo.announceForAccessibility(t('chat.replied'));
    wasBusy.current = busy;
  }, [busy, t]);

  const submit = useCallback(() => {
    const text = input.trim();
    if (!text || busy || !online) return;
    setInput('');
    void send(text);
    analytics.track('ai_message_sent', { surface: 'tab' });
  }, [busy, input, online, send]);

  const startNew = useCallback(() => {
    if (!(thread && thread.messages.length === 0)) aiActions.newThread();
    inputRef.current?.focus();
  }, [thread]);

  /** The hook has no retry, so this sends the user message that led to the reply again. */
  const retry = useCallback(
    (messageId: string) => {
      const list = messages ?? [];
      const index = list.findIndex((message) => message.id === messageId);
      for (let i = index - 1; i >= 0; i--) {
        if (list[i].role === 'user') {
          void send(list[i].content);
          analytics.track('ai_message_retried');
          return;
        }
      }
    },
    [messages, send],
  );

  // The hook's callbacks change on every streamed token. The rows get these stable wrappers instead, so settled
  // messages are not re-rendered while a reply grows.
  const latest = useRef({ confirmAction, cancelAction, retry });
  useEffect(() => {
    latest.current = { confirmAction, cancelAction, retry };
  });
  const onConfirm = useCallback((messageId: string) => void latest.current.confirmAction(messageId), []);
  const onCancel = useCallback((messageId: string) => latest.current.cancelAction(messageId), []);
  const onRetry = useCallback((messageId: string) => latest.current.retry(messageId), []);

  const renderItem = useCallback(
    ({ item, index }: { item: AiMessage; index: number }) => {
      const newer = data[index - 1];
      const older = data[index + 1];
      const lastReply = index === 0 && item.role === 'model' && !busy;
      return (
        <ChatRow
          message={item}
          marginTop={older && older.role === item.role ? spacing.xs : spacing.lg}
          disabled={busy}
          showActions={lastReply}
          showTime={!newer || newer.role !== item.role}
          canRetry={lastReply}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onRetry={onRetry}
        />
      );
    },
    [busy, data, onCancel, onConfirm, onRetry],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The tab header above already names the screen, so this row only carries the chat's own controls. */}
      <View style={styles.toolbar}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('chat.model', { name: modelName })}
          accessibilityHint={t('chat.modelHint')}
          haptic="tap"
          ringRadius={radius.pill}
          onPress={() => router.push('/ai/history')}
          style={[styles.modelChip, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="sparkles" size={14} color={colors.primaryAccent} />
          <Text variant="caption" weight="semiBold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {modelName}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </PressableScale>
        <View style={{ flex: 1 }} />
        <IconButton icon="create-outline" accessibilityLabel={t('chat.newChat')} onPress={startNew} />
        <IconButton icon="time-outline" accessibilityLabel={t('chat.conversations')} onPress={() => router.push('/ai/history')} />
      </View>

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!store.hydrated ? (
          <ChatSkeleton />
        ) : isEmpty ? (
          <ScrollView contentContainerStyle={styles.emptyContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <PremiumHero accent="ai"
              chip={{ icon: 'sparkles', label: t('chat.heroChip') }}
              title={t('chat.emptyTitle')}
              subtitle={t('chat.emptyDescription')}
              actions={[{ label: t('chat.writeMessage'), icon: 'create-outline', variant: 'solid', onPress: () => inputRef.current?.focus() }]}
            />
            <Text variant="overline" color="textMuted" accessibilityRole="header">
              {t('chat.tryAsking')}
            </Text>
            <View style={styles.promptGrid}>
              {SUGGESTED_PROMPTS.map((item) => (
                <PressableScale
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.prompt}
                  disabled={busy || !online}
                  haptic="tap"
                  ringRadius={radius.xl}
                  onPress={() => {
                    void send(item.prompt);
                    analytics.track('ai_message_sent', { surface: 'tab' });
                  }}
                  style={[styles.promptCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <IconTile icon={item.icon} accent={PROMPT_ACCENT[item.icon] ?? 'ai'} />
                  <Text variant="label" weight="semiBold" numberOfLines={2}>
                    {item.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={keyOfMessage}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.listContent}
            initialNumToRender={12}
            windowSize={9}
            maxToRenderPerBatch={8}
          />
        )}

        <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {online ? null : (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.offline}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.warningText} />
              <Text variant="caption" color="warningText" style={{ flex: 1 }}>
                {t('chat.offline')}
              </Text>
            </View>
          )}
          <View style={styles.composer}>
            <Input
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.placeholder')}
              accessibilityLabel={t('chat.messageLabel')}
              multiline
              maxLength={MAX_LENGTH}
              showCount={input.length >= COUNT_FROM}
              autoCapitalize="sentences"
              autoCorrect
              autoComplete="off"
              keyboardType="default"
              returnKeyType="default"
              textContentType="none"
              containerStyle={styles.inputWrap}
              style={{ maxHeight: composerMaxHeight }}
            />
            {busy ? (
              <IconButton
                icon="stop"
                variant="tonal"
                accessibilityLabel={t('chat.stop')}
                onPress={() => {
                  haptics.tap();
                  stop();
                }}
                style={styles.sendButton}
              />
            ) : (
              <IconButton icon="arrow-up" variant="filled" accessibilityLabel={t('chat.send')} disabled={!canSend} onPress={submit} style={styles.sendButton} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: layout.screenPadding, paddingVertical: layout.screenPadding },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  modelChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: layout.minTouchTarget - spacing.sm, maxWidth: '60%', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: layout.screenPadding, paddingVertical: spacing.lg },
  promptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  promptCard: { flexGrow: 1, flexBasis: layout.minTouchTarget * 3, gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xs },
  skeleton: { padding: layout.screenPadding, gap: layout.sectionGap },
  skeletonUser: { alignItems: 'flex-end' },
  skeletonModel: { flexDirection: 'row', gap: spacing.md },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.xs },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: layout.screenPadding },
  inputWrap: { flex: 1 },
  sendButton: { marginBottom: 2 },
});
