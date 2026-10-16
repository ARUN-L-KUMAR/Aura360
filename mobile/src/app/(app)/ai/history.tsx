import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { ListItem } from '@/components/ui/list-item';
import { useScreenPadding } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { aiActions, useAiStore } from '@/features/ai/threads';
import { AI_MODELS, type AiThread } from '@/features/ai/types';
import { formatDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

type ThreadRowProps = {
  thread: AiThread;
  active: boolean;
  onOpen: (threadId: string) => void;
  onDelete: (threadId: string, title: string) => void;
};

const ThreadRow = memo(function ThreadRow({ thread, active, onOpen, onDelete }: ThreadRowProps) {
  const count = thread.messages.length;
  return (
    <Card variant={active ? 'tinted' : 'outlined'} accent="ai" padding="none" style={styles.threadCard}>
      <View style={styles.threadMain}>
        <ListItem
          icon="chatbubble-ellipses-outline"
          accent="ai"
          title={thread.title}
          subtitle={`${formatDay(thread.updatedAt)} · ${count} ${count === 1 ? 'message' : 'messages'}`}
          meta={active ? 'Current' : undefined}
          chevron={false}
          accessibilityHint="Opens this conversation"
          onPress={() => onOpen(thread.id)}
          onLongPress={() => onDelete(thread.id, thread.title)}
        />
      </View>
      <IconButton icon="trash-outline" accessibilityLabel={`Delete conversation: ${thread.title}`} onPress={() => onDelete(thread.id, thread.title)} />
    </Card>
  );
});

export default function AiHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const notify = useNotify();
  const store = useAiStore();
  const padding = useScreenPadding(false);

  const threads = useMemo(() => store.threads.filter((thread) => thread.messages.length > 0), [store.threads]);

  const open = useCallback(
    (threadId: string) => {
      aiActions.setActive(threadId);
      router.back();
    },
    [router],
  );

  const confirmDelete = useCallback(
    async (threadId: string, title: string) => {
      const ok = await notify.confirm({ title: 'Delete this conversation?', message: title, confirmLabel: 'Delete', destructive: true });
      if (!ok) return;
      aiActions.deleteThread(threadId);
      notify.success('Conversation deleted');
    },
    [notify],
  );

  const confirmClearAll = useCallback(async () => {
    const ok = await notify.confirm({
      title: 'Delete all conversations?',
      message: 'This only removes the chats stored on this phone.',
      confirmLabel: 'Delete all',
      destructive: true,
    });
    if (!ok) return;
    aiActions.clearAll();
    notify.success('All conversations deleted');
  }, [notify]);

  const header = (
    <View style={styles.header}>
      <View style={styles.block}>
        <SectionHeader title="Model" subtitle="Used for new messages in every conversation." />
        <Card padding="none" style={styles.modelCard}>
          {AI_MODELS.map((model, index) => (
            <ListItem
              key={model.id}
              icon="hardware-chip-outline"
              accent="ai"
              title={model.name}
              subtitle={model.note}
              selected={store.model === model.id}
              divider={index < AI_MODELS.length - 1}
              accessibilityHint="Use this model"
              onPress={() => {
                haptics.select();
                aiActions.setModel(model.id);
              }}
            />
          ))}
        </Card>
      </View>
      <SectionHeader title="On this phone" count={store.hydrated ? threads.length : undefined} />
    </View>
  );

  const footer =
    threads.length > 0 ? (
      <Button title="Delete all conversations" variant="ghost" leftIcon="trash-outline" onPress={() => void confirmClearAll()} style={styles.clearAll} />
    ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Conversations' }} />
      <FlatList
        data={store.hydrated ? threads : []}
        keyExtractor={(thread) => thread.id}
        extraData={store.activeId}
        renderItem={({ item }) => <ThreadRow thread={item} active={item.id === store.activeId} onOpen={open} onDelete={confirmDelete} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          store.hydrated ? (
            <EmptyState
              accent="ai"
              icon="chatbubble-ellipses-outline"
              title="No conversations yet"
              description="Chats you have with Aura are stored on this phone."
              actionTitle="Start a chat"
              onAction={() => router.back()}
            />
          ) : (
            <SkeletonList count={4} />
          )
        }
        ListFooterComponent={footer}
        contentContainerStyle={[padding, styles.content]}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.sm },
  header: { gap: spacing.lg, marginBottom: spacing.xs },
  block: { gap: spacing.sm },
  modelCard: { overflow: 'hidden' },
  threadCard: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingRight: spacing.xs },
  threadMain: { flex: 1 },
  clearAll: { marginTop: spacing.lg },
});
