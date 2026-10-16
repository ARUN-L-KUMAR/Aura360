import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { MessageMarkdown } from '@/components/ai/message-markdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import type { AiMessage } from '@/features/ai/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { duration, easing, radius, spacing, useTheme } from '@/theme';

type Props = {
  message: AiMessage;
  disabled: boolean;
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
  /** Shows "Regenerate" (or "Try again" on an error) under the message. Pass it for the last assistant message only. */
  onRetry?: (messageId: string) => void;
  /** Shows the copy / regenerate row under a finished assistant message. */
  showActions?: boolean;
  /** Shows the time under the message (the end of a group). Tapping a message also toggles it. */
  showTime?: boolean;
};

const DOT = spacing.sm;
const AVATAR = spacing.xl + spacing.xs;

/** Strips markdown so a screen reader doesn't speak the asterisks and hashes. */
function plainText(markdown: string) {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+])\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** One bouncing dot. Static (half opacity) when the user prefers reduced motion. */
function Dot({ index, still }: { index: number; still: boolean }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (still) {
      cancelAnimation(progress);
      progress.value = 0.5;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      index * duration.fast,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.standard) }),
          withTiming(0, { duration: duration.slow, easing: Easing.bezier(...easing.standard) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [still, index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * progress.value,
    transform: [{ translateY: still ? 0 : -spacing.xs * progress.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: colors.textSecondary }, animated]} />;
}

/** Three-dot typing indicator (decorative: the wrapper carries the accessible label). */
function TypingDots() {
  const { reduceMotion } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dots}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} still={reduceMotion} />
      ))}
    </View>
  );
}

function BubbleImpl({ message, disabled, onConfirm, onCancel, onRetry, showActions = false, showTime = false }: Props) {
  const { colors, accent, reduceMotion } = useTheme();
  const notify = useNotify();
  const [revealed, setRevealed] = useState(false);
  // Only a message that has just been created fades in; older ones (scrolled back into view) appear instantly.
  const [fresh] = useState(() => Date.now() - Date.parse(message.createdAt) < 2500);

  const copy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(message.content);
      notify.success('Copied');
    } catch {
      notify.error('Could not copy to the clipboard');
    }
  }, [message.content, notify]);

  const retry = useCallback(() => onRetry?.(message.id), [message.id, onRetry]);

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'copy') void copy();
      else if (event.nativeEvent.actionName === 'retry') retry();
    },
    [copy, retry],
  );

  const longPress = useCallback(() => {
    haptics.impact();
    void copy();
  }, [copy]);

  const time = formatTime(message.createdAt);
  const timeVisible = !!time && (showTime || revealed) && !message.isStreaming;
  const entering = fresh && !reduceMotion ? FadeIn.duration(duration.base) : undefined;
  const timeNode = timeVisible ? (
    <Text variant="caption" color="textMuted" style={message.role === 'user' ? styles.timeEnd : undefined}>
      {time}
    </Text>
  ) : null;

  if (message.role === 'user') {
    const a = accent('ai');
    return (
      <Animated.View entering={entering} style={styles.userRow}>
        <Pressable
          onPress={() => setRevealed((value) => !value)}
          onLongPress={longPress}
          delayLongPress={450}
          accessibilityRole="text"
          accessibilityLabel={`You said: ${message.content}`}
          accessibilityHint="Long press to copy"
          accessibilityActions={[{ name: 'copy', label: 'Copy message' }]}
          onAccessibilityAction={onAccessibilityAction}
          style={[styles.userBubble, { backgroundColor: a.solid }]}>
          <Text style={{ color: a.onSolid }}>{message.content}</Text>
        </Pressable>
        {timeNode}
      </Animated.View>
    );
  }

  const waiting = message.isStreaming && !message.content;
  const toolsUsed = (message.trace ?? []).length;
  const toolRunning = message.activeTool?.status === 'running';
  // A reply with a code block or widget keeps its own buttons focusable, so it can't be one merged element.
  const mergeForReader = !message.isStreaming && !message.content.includes('```');
  const canRetry = !!onRetry && !message.isStreaming && !message.pendingAction;
  const a = accent('ai');

  return (
    <Animated.View entering={entering} style={styles.modelRow}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.avatar, { backgroundColor: a.soft, borderColor: a.border }]}>
        <Ionicons name="sparkles" size={16} color={a.text} />
      </View>

      <View style={styles.modelColumn}>
        {message.activeTool && message.isStreaming ? (
          <View accessible accessibilityLiveRegion="polite" accessibilityLabel={message.activeTool.label} style={styles.toolRow}>
            {toolRunning ? <TypingDots /> : <Ionicons name="checkmark-circle" size={16} color={colors.successText} />}
            <Text variant="caption" color="textSecondary" style={styles.toolLabel}>
              {message.activeTool.label}
            </Text>
          </View>
        ) : null}

        {waiting && !message.activeTool ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel="Aura is thinking"
            style={[styles.assistantBubble, styles.thinking, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TypingDots />
          </View>
        ) : null}

        {message.content ? (
          message.isError ? (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLabel={`Aura could not reply: ${message.content}`}
              style={[styles.assistantBubble, styles.errorBubble, { backgroundColor: colors.errorContainer, borderColor: colors.errorBorder }]}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
                <Text variant="label" weight="semiBold" style={{ color: colors.onErrorContainer }}>
                  Couldn&apos;t get a reply
                </Text>
              </View>
              <Text style={{ color: colors.onErrorContainer }}>{message.content}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setRevealed((value) => !value)}
              onLongPress={longPress}
              delayLongPress={450}
              accessible={mergeForReader}
              accessibilityRole="text"
              accessibilityLabel={`Aura said: ${plainText(message.content)}`}
              accessibilityHint="Long press to copy"
              accessibilityActions={[{ name: 'copy', label: 'Copy reply' }]}
              onAccessibilityAction={onAccessibilityAction}
              style={[styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MessageMarkdown content={message.content} />
            </Pressable>
          )
        ) : null}

        {message.pendingAction ? (
          <Card variant="tinted" accent="ai" style={styles.actionCard}>
            <View style={styles.toolRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={a.text} />
              <Text variant="label" weight="semiBold" color="textSecondary">
                Needs your confirmation
              </Text>
            </View>
            <Text weight="semiBold">{message.pendingAction.summary}</Text>
            {message.actionStatus === 'pending' ? (
              <View style={styles.buttonRow}>
                <View style={styles.buttonCell}>
                  <Button title="Cancel" variant="secondary" onPress={() => onCancel(message.id)} disabled={disabled} />
                </View>
                <View style={styles.buttonCell}>
                  <Button title="Confirm" leftIcon="checkmark" onPress={() => onConfirm(message.id)} disabled={disabled} />
                </View>
              </View>
            ) : (
              <View accessible accessibilityLabel={message.actionStatus === 'confirmed' ? 'Confirmed' : 'Cancelled'} style={styles.toolRow}>
                <Ionicons
                  name={message.actionStatus === 'confirmed' ? 'checkmark-circle' : 'close-circle-outline'}
                  size={18}
                  color={message.actionStatus === 'confirmed' ? colors.successText : colors.textSecondary}
                />
                <Text variant="label" color={message.actionStatus === 'confirmed' ? 'successText' : 'textSecondary'}>
                  {message.actionStatus === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                </Text>
              </View>
            )}
          </Card>
        ) : null}

        {!message.isStreaming && toolsUsed > 0 && !message.pendingAction ? (
          <Text variant="caption" color="textMuted">
            Used {toolsUsed} {toolsUsed === 1 ? 'tool' : 'tools'} · {[...new Set((message.trace ?? []).map((t) => t.tool.replace(/_/g, ' ')))].slice(0, 3).join(', ')}
          </Text>
        ) : null}

        {(showActions || (message.isError && canRetry)) && message.content && !message.isStreaming ? (
          <View style={styles.actionRow}>
            {message.isError && canRetry ? <Button title="Try again" variant="secondary" size="sm" leftIcon="refresh" fullWidth={false} onPress={retry} /> : null}
            <IconButton icon="copy-outline" size="sm" accessibilityLabel="Copy reply" onPress={() => void copy()} />
            {!message.isError && canRetry ? <IconButton icon="refresh" size="sm" accessibilityLabel="Regenerate reply" onPress={retry} /> : null}
          </View>
        ) : null}

        {timeNode}
      </View>
    </Animated.View>
  );
}

export const MessageBubble = memo(BubbleImpl);

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', paddingLeft: spacing.xxxl, gap: spacing.xs },
  userBubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, borderBottomRightRadius: spacing.xs, maxWidth: '100%' },
  timeEnd: { textAlign: 'right' },
  modelRow: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.sm },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  modelColumn: { flex: 1, gap: spacing.xs },
  assistantBubble: { borderWidth: 1, borderRadius: radius.lg, borderBottomLeftRadius: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  thinking: { alignSelf: 'flex-start', paddingVertical: spacing.lg },
  errorBubble: { gap: spacing.xs },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionCard: { gap: spacing.md },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolLabel: { flexShrink: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  buttonCell: { flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dots: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
});
