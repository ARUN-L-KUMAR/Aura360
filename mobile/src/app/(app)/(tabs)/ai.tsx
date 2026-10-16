import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/ai/message-bubble';
import { APP_BAR_HEIGHT, TopAppBar } from '@/components/ui/app-bar';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { aiActions } from '@/features/ai/threads';
import { AI_MODELS, SUGGESTED_PROMPTS, type AiMessage } from '@/features/ai/types';
import { useAiChat } from '@/features/ai/use-chat';
import { MAX_FONT_SCALE, layout, spacing, typeScale, useTheme } from '@/theme';

const MAX_LENGTH = 3000;
const COMPOSER_LINES = 5;
/** Show the character counter only when the limit is close. */
const COUNT_FROM = Math.round(MAX_LENGTH * 0.9);

/** Placeholder for the conversation while the saved chats load from the phone. */
function ChatSkeleton() {
  return (
    <SkeletonGroup label="Loading conversation" style={styles.skeleton}>
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

export default function AskAuraScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
  const canSend = input.trim().length > 0 && !busy;

  // About five lines, following the system font size.
  const composerMaxHeight = Math.round(typeScale.body.lineHeight * Math.min(fontScale, MAX_FONT_SCALE) * COMPOSER_LINES + spacing.md * 2);

  // Tell screen-reader users when a reply has finished (the text itself streams in silently).
  useEffect(() => {
    if (wasBusy.current && !busy) AccessibilityInfo.announceForAccessibility('Aura replied');
    wasBusy.current = busy;
  }, [busy]);

  const submit = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void send(text);
  }, [busy, input, send]);

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
          return;
        }
      }
    },
    [messages, send],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AiMessage; index: number }) => {
      const newer = data[index - 1];
      const older = data[index + 1];
      const isLast = index === 0;
      const lastReply = isLast && item.role === 'model' && !busy;
      return (
        <View style={{ marginTop: older && older.role === item.role ? spacing.xs : spacing.lg }}>
          <MessageBubble
            message={item}
            disabled={busy}
            onConfirm={confirmAction}
            onCancel={cancelAction}
            onRetry={lastReply ? retry : undefined}
            showActions={lastReply}
            showTime={!newer || newer.role !== item.role}
          />
        </View>
      );
    },
    [busy, cancelAction, confirmAction, data, retry],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ height: insets.top + APP_BAR_HEIGHT }} />

      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        {!store.hydrated ? (
          <ChatSkeleton />
        ) : isEmpty ? (
          <ScrollView contentContainerStyle={styles.emptyContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            {/* The one soft hero wash on this screen. */}
            <Card gradient="ai" padding="none">
              <EmptyState
                accent="ai"
                icon="sparkles"
                title="Ask Aura anything"
                description="Aura can read your finances, workouts, meals, notes and more, and log things for you after you confirm. Pick a suggestion or write your own."
                actionTitle="Write a message"
                onAction={() => inputRef.current?.focus()}
              />
            </Card>
          </ScrollView>
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(message) => message.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.listContent}
          />
        )}

        <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {isEmpty ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              accessibilityLabel="Suggested prompts"
              contentContainerStyle={styles.suggestions}>
              {SUGGESTED_PROMPTS.map((item) => (
                <Chip key={item.label} label={item.label} icon={item.icon} selectable={false} accessibilityHint={item.prompt} disabled={busy} onPress={() => void send(item.prompt)} />
              ))}
            </ScrollView>
          ) : null}

          <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.model}>
            Model: {modelName}
          </Text>
          <View style={styles.composer}>
            <Input
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Message Aura"
              accessibilityLabel="Message"
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
              <IconButton icon="stop" variant="tonal" accessibilityLabel="Stop generating" onPress={stop} style={styles.sendButton} />
            ) : (
              <IconButton icon="arrow-up" variant="filled" accessibilityLabel="Send message" disabled={!canSend} onPress={submit} style={styles.sendButton} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <TopAppBar
        title="Ask Aura"
        elevated
        centerTitle={false}
        actions={[
          { icon: 'create-outline', label: 'New chat', onPress: startNew },
          { icon: 'time-outline', label: 'Conversations and model', onPress: () => router.push('/ai/history') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: layout.screenPadding, paddingVertical: layout.screenPadding },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: layout.screenPadding },
  skeleton: { padding: layout.screenPadding, gap: layout.sectionGap },
  skeletonUser: { alignItems: 'flex-end' },
  skeletonModel: { flexDirection: 'row', gap: spacing.md },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.xs },
  suggestions: { gap: spacing.sm, paddingHorizontal: layout.screenPadding, alignItems: 'center' },
  model: { paddingHorizontal: layout.screenPadding },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: layout.screenPadding },
  inputWrap: { flex: 1 },
  sendButton: { marginBottom: 2 },
});
