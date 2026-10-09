import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { memo } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { MessageMarkdown } from '@/components/ai/message-markdown';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import type { AiMessage } from '@/features/ai/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Props = {
  message: AiMessage;
  disabled: boolean;
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
};

function BubbleImpl({ message, disabled, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();

  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <Pressable
          onLongPress={() => Clipboard.setStringAsync(message.content)}
          accessibilityLabel={`You said: ${message.content}`}
          style={[styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryText }} selectable>
            {message.content}
          </Text>
        </Pressable>
      </View>
    );
  }

  const waiting = message.isStreaming && !message.content;
  const toolsUsed = (message.trace ?? []).length;

  return (
    <View style={styles.modelRow}>
      <View style={[styles.avatar, { backgroundColor: `${moduleColors.ai}22` }]}>
        <Ionicons name="sparkles" size={16} color={moduleColors.ai} />
      </View>

      <View style={{ flex: 1, gap: spacing.xs }}>
        {message.activeTool && message.isStreaming ? (
          <View style={styles.toolRow}>
            {message.activeTool.status === 'running' ? <ActivityIndicator size="small" color={moduleColors.ai} /> : <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
            <Text variant="caption" muted>
              {message.activeTool.label}
            </Text>
          </View>
        ) : null}

        {waiting && !message.activeTool ? (
          <View style={styles.toolRow}>
            <ActivityIndicator size="small" color={moduleColors.ai} />
            <Text variant="caption" muted>
              Thinking…
            </Text>
          </View>
        ) : null}

        {message.content ? (
          message.isError ? (
            <GlassCard style={{ padding: spacing.md, borderColor: colors.danger }}>
              <Text color="danger" selectable>
                {message.content}
              </Text>
            </GlassCard>
          ) : (
            <Pressable onLongPress={() => Clipboard.setStringAsync(message.content).then(() => Alert.alert('Copied'))} delayLongPress={450}>
              <MessageMarkdown content={message.content} />
            </Pressable>
          )
        ) : null}

        {message.pendingAction ? (
          <GlassCard glowColor={moduleColors.ai} style={{ gap: spacing.md, padding: spacing.md + 2 }}>
            <View style={styles.toolRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={moduleColors.ai} />
              <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
                CONFIRM ACTION
              </Text>
            </View>
            <Text style={{ fontWeight: '600' }}>{message.pendingAction.summary}</Text>
            {message.actionStatus === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title="Cancel" variant="secondary" onPress={() => onCancel(message.id)} disabled={disabled} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Confirm" onPress={() => onConfirm(message.id)} disabled={disabled} />
                </View>
              </View>
            ) : (
              <Text variant="caption" color={message.actionStatus === 'confirmed' ? 'success' : 'textMuted'}>
                {message.actionStatus === 'confirmed' ? '✓ Confirmed' : 'Cancelled'}
              </Text>
            )}
          </GlassCard>
        ) : null}

        {!message.isStreaming && toolsUsed > 0 && !message.pendingAction ? (
          <Text variant="caption" muted>
            Used {toolsUsed} {toolsUsed === 1 ? 'tool' : 'tools'} · {[...new Set((message.trace ?? []).map((t) => t.tool.replace(/_/g, ' ')))].slice(0, 3).join(', ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const MessageBubble = memo(BubbleImpl);

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', paddingLeft: 48 },
  userBubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, borderBottomRightRadius: 4, maxWidth: '100%' },
  modelRow: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
