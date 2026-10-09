import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/ai/message-bubble';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { aiActions } from '@/features/ai/threads';
import { AI_MODELS, SUGGESTED_PROMPTS } from '@/features/ai/types';
import { useAiChat } from '@/features/ai/use-chat';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function AskAuraScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { store, thread, busy, send, confirmAction, cancelAction, stop } = useAiChat();
  const [input, setInput] = useState('');

  const modelName = AI_MODELS.find((model) => model.id === store.model)?.name ?? store.model;
  // Inverted list: newest at the bottom, and the view stays anchored there while a reply grows.
  const data = useMemo(() => [...(thread?.messages ?? [])].reverse(), [thread?.messages]);

  const submit = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void send(text);
  }, [busy, input, send]);

  const startNew = () => {
    if (thread && thread.messages.length === 0) return;
    aiActions.newThread();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
      {/* Tab Screen Top Header */}
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title">Ask Aura</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="New chat" onPress={startNew} hitSlop={10}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Conversations and model" onPress={() => router.push('/ai/history')} hitSlop={10}>
            <Ionicons name="time-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {!store.hydrated ? null : data.length === 0 ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={SUGGESTED_PROMPTS as unknown as (typeof SUGGESTED_PROMPTS)[number][]}
            keyExtractor={(item) => item.label}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.md }}>
                <EmptyState icon="sparkles" color={moduleColors.ai} title="Ask Aura anything" description="Aura can read your finances, workouts, meals, notes and more, and log things for you after you confirm." />
              </View>
            }
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => void send(item.prompt)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <GlassCard style={styles.promptCard}>
                  <View style={[styles.promptIcon, { backgroundColor: `${moduleColors.ai}1a` }]}>
                    <Ionicons name={item.icon} size={18} color={moduleColors.ai} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: '700' }}>
                      {item.label}
                    </Text>
                    <Text variant="caption" muted numberOfLines={2}>
                      {item.prompt}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            )}
          />
        </View>
      ) : (
        <FlatList
          inverted
          data={data}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          renderItem={({ item }) => <MessageBubble message={item} disabled={busy} onConfirm={confirmAction} onCancel={cancelAction} />}
        />
      )}

      <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: spacing.sm }]}>
        <Text variant="caption" muted style={{ paddingHorizontal: spacing.lg }} numberOfLines={1}>
          {modelName}
        </Text>
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message Aura…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            accessibilityLabel="Message"
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
          {busy ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop" onPress={stop} style={[styles.sendButton, { backgroundColor: colors.cardMuted }]}>
              <Ionicons name="stop" size={20} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={submit}
              disabled={!input.trim()}
              style={[styles.sendButton, { backgroundColor: moduleColors.ai, opacity: input.trim() ? 1 : 0.4 }]}>
              <Ionicons name="arrow-up" size={22} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  promptCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 },
  promptIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xs, gap: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: 22, borderWidth: 1, paddingHorizontal: spacing.lg, paddingTop: 11, paddingBottom: 11, fontSize: 16 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
