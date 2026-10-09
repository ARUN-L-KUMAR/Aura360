import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { aiActions, useAiStore } from '@/features/ai/threads';
import { AI_MODELS } from '@/features/ai/types';
import { formatDay } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function AiHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const store = useAiStore();

  function open(threadId: string) {
    aiActions.setActive(threadId);
    router.back();
  }

  function confirmDelete(threadId: string, title: string) {
    Alert.alert('Delete this conversation?', title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => aiActions.deleteThread(threadId) },
    ]);
  }

  function confirmClearAll() {
    Alert.alert('Delete all conversations?', 'This only removes the chats stored on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => aiActions.clearAll() },
    ]);
  }

  const threads = store.threads.filter((thread) => thread.messages.length > 0);

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Conversations' }} />

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          MODEL
        </Text>
        {AI_MODELS.map((model) => {
          const selected = store.model === model.id;
          return (
            <Pressable key={model.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => aiActions.setModel(model.id)}>
              <GlassCard glowColor={selected ? moduleColors.ai : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 }}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? moduleColors.ai : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{model.name}</Text>
                  <Text variant="caption" muted>
                    {model.note}
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          CONVERSATIONS ON THIS PHONE
        </Text>
        {threads.length === 0 ? <Text muted>No conversations yet.</Text> : null}
        {threads.map((thread) => {
          const active = thread.id === store.activeId;
          return (
            <Pressable key={thread.id} accessibilityRole="button" onPress={() => open(thread.id)} onLongPress={() => confirmDelete(thread.id, thread.title)}>
              <GlassCard glowColor={active ? moduleColors.ai : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2 }}>
                <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: `${moduleColors.ai}1a`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={moduleColors.ai} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }} numberOfLines={1}>
                    {thread.title}
                  </Text>
                  <Text variant="caption" muted>
                    {formatDay(thread.updatedAt)} · {thread.messages.length} messages
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Delete conversation" onPress={() => confirmDelete(thread.id, thread.title)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

      {threads.length > 0 ? <Button title="Delete all conversations" variant="ghost" onPress={confirmClearAll} /> : null}
    </Screen>
  );
}
