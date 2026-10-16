import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassSurface } from '@/components/ui/glass-surface';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { AiMessage } from '@/features/ai/types';
import { duration, easing, layout, motionDuration, radius, spacing, spring, useTheme } from '@/theme';

import {
  DISMISS_DISTANCE,
  DISMISS_VELOCITY,
  DRAG_SLOP,
  SHEET_HEIGHT_RATIO,
  SHEET_MAX_HEIGHT,
  WIDGET_TABS,
  type QuickPrompt,
  type WidgetTab,
} from './widget-constants';
import { useKeyboardVisible } from './widget-hooks';
import { BotIcon } from './widget-icons';
import { settle } from './widget-placement';
import { ChatTab, DraftsTab, ForYouTab } from './widget-tabs';

const EASE_ENTER = Easing.bezier(...easing.decelerate);
const EASE_EXIT = Easing.bezier(...easing.accelerate);
const SHEET_FADE_END = 0.35;

// ---------------------------------------------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------------------------------------------

type HeaderButtonProps = { icon: 'create-outline' | 'expand-outline' | 'close'; label: string; onPress: () => void };

const HeaderButton = memo(function HeaderButton({ icon, label, onPress }: HeaderButtonProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="tap"
      ringRadius={radius.pill}
      style={styles.headerButton}>
      <Ionicons name={icon} size={22} color={icon === 'close' ? colors.textSecondary : colors.text} />
    </PressableScale>
  );
});

type SheetHeaderProps = { pageTitle: string; onNewChat: () => void; onOpenFull: () => void; onClose: () => void };

const SheetHeader = memo(function SheetHeader({ pageTitle, onNewChat, onOpenFull, onClose }: SheetHeaderProps) {
  const { colors, accent } = useTheme();
  const ai = accent('ai');
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerTitle}>
        <View style={[styles.avatar, { backgroundColor: ai.soft }]}>
          <BotIcon size={20} color={ai.text} />
        </View>
        <View style={styles.headerText}>
          <Text variant="label" weight="bold" accessibilityRole="header">
            Aura Assistant
          </Text>
          <View style={styles.contextRow}>
            <View style={[styles.contextDot, { backgroundColor: colors.success }]} />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.headerText}>
              Working on {pageTitle}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.headerActions}>
        <HeaderButton icon="create-outline" label="New Chat" onPress={onNewChat} />
        <HeaderButton icon="expand-outline" label="Open Full AI Page" onPress={onOpenFull} />
        <HeaderButton icon="close" label="Close" onPress={onClose} />
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------------------------------------------

type TabButtonProps = { tab: WidgetTab; label: string; selected: boolean; draftCount: number; onSelect: (tab: WidgetTab) => void };

const TabButton = memo(function TabButton({ tab, label, selected, draftCount, onSelect }: TabButtonProps) {
  const { colors, accent } = useTheme();
  const ai = accent('ai');
  const hint = tab === 'for_you' ? ', new suggestions' : tab === 'drafts' && draftCount > 0 ? `, ${draftCount} waiting` : '';
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${label}${hint}`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(tab)}
      style={styles.tab}>
      <Text variant="label" weight={selected ? 'bold' : 'medium'} color={selected ? ai.text : colors.textSecondary}>
        {label}
      </Text>
      {tab === 'for_you' ? <View style={[styles.newDot, { backgroundColor: colors.error }]} /> : null}
      {tab === 'drafts' && draftCount > 0 ? (
        <View style={[styles.countBadge, { backgroundColor: colors.warning }]}>
          <Text variant="caption" weight="bold" color="onWarning">
            {draftCount}
          </Text>
        </View>
      ) : null}
      {selected ? <View style={[styles.tabIndicator, { backgroundColor: ai.solid }]} /> : null}
    </Pressable>
  );
});

// ---------------------------------------------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------------------------------------------

export type WidgetSheetProps = {
  visible: boolean;
  onClose: () => void;
  onOpenFull: () => void;
  onNewChat: () => void;
  pageTitle: string;
  quickPrompts: QuickPrompt[];
  modelName: string;
  /** Newest-first, for the inverted list. */
  messages: AiMessage[];
  drafts: AiMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onConfirm: (messageId: string) => void;
  onCancel: (messageId: string) => void;
};

/**
 * Bottom-docked assistant panel in a transparent Modal (which traps screen-reader focus and handles Android back).
 * It slides up with a transform + fades the scrim (opacity only), can be dragged down from its handle / header to
 * dismiss, and keeps the composer above the keyboard. The input draft and selected tab survive closing.
 */
function SheetImpl({
  visible,
  onClose,
  onOpenFull,
  onNewChat,
  pageTitle,
  quickPrompts,
  modelName,
  messages,
  drafts,
  busy,
  onSend,
  onStop,
  onConfirm,
  onCancel,
}: WidgetSheetProps) {
  const { colors, reduceMotion } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  const [mounted, setMounted] = useState(visible);
  const [activeTab, setActiveTab] = useState<WidgetTab>('chat');
  const [input, setInput] = useState('');

  // Keep the Modal mounted through the exit animation.
  if (visible && !mounted) setMounted(true);

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(withTiming(1, { duration: motionDuration(duration.base, reduceMotion), easing: EASE_ENTER }));
      return;
    }
    Keyboard.dismiss();
    progress.set(
      withTiming(0, { duration: motionDuration(duration.base, reduceMotion), easing: EASE_EXIT }, (finished) => {
        if (finished) {
          dragY.set(0);
          scheduleOnRN(setMounted, false);
        }
      }),
    );
  }, [visible, reduceMotion, progress, dragY]);

  const dismissGesture = useMemo(() => {
    const gentle = spring.gentle;
    return Gesture.Pan()
      .activeOffsetY([-DRAG_SLOP, DRAG_SLOP])
      .onUpdate((e) => {
        dragY.set(Math.max(0, e.translationY));
      })
      .onEnd((e) => {
        if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
          scheduleOnRN(onClose);
        } else {
          dragY.set(settle(0, reduceMotion, gentle));
        }
      });
  }, [dragY, onClose, reduceMotion]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, SHEET_FADE_END], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (reduceMotion ? 0 : (1 - progress.get()) * screenHeight) + dragY.get() }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.get() * (1 - clamp(dragY.get() / screenHeight, 0, 1)),
  }));

  const sheetHeight = Math.min(SHEET_MAX_HEIGHT, screenHeight * SHEET_HEIGHT_RATIO, screenHeight - top - spacing.xl);

  const submit = useCallback(
    (customText?: string) => {
      const text = (customText || input).trim();
      if (!text || busy) return;
      setInput('');
      setActiveTab('chat');
      onSend(text);
    },
    [busy, input, onSend],
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close assistant" onPress={onClose} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.overlay }, scrimStyle]} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.dock}>
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
            <GlassSurface style={[styles.glass, { paddingBottom: keyboardVisible ? 0 : bottom || spacing.md }]}>
              <GestureDetector gesture={dismissGesture}>
                <View collapsable={false}>
                  <View style={styles.handleRow} accessible={false}>
                    <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                  </View>
                  <SheetHeader pageTitle={pageTitle} onNewChat={onNewChat} onOpenFull={onOpenFull} onClose={onClose} />
                </View>
              </GestureDetector>

              <View accessibilityRole="tablist" style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                {WIDGET_TABS.map((tab) => (
                  <TabButton
                    key={tab.key}
                    tab={tab.key}
                    label={tab.label}
                    selected={activeTab === tab.key}
                    draftCount={drafts.length}
                    onSelect={setActiveTab}
                  />
                ))}
              </View>

              <View style={styles.fill}>
                {activeTab === 'chat' ? (
                  <ChatTab
                    messages={messages}
                    busy={busy}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    pageTitle={pageTitle}
                    quickPrompts={quickPrompts}
                    modelName={modelName}
                    input={input}
                    onChangeInput={setInput}
                    onSend={submit}
                    onStop={onStop}
                  />
                ) : null}
                {activeTab === 'for_you' ? <ForYouTab onSend={submit} /> : null}
                {activeTab === 'drafts' ? <DraftsTab drafts={drafts} onConfirm={onConfirm} onCancel={onCancel} /> : null}
              </View>
            </GlassSurface>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

export const WidgetSheet = memo(SheetImpl);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dock: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    flexShrink: 1,
  },
  glass: {
    flex: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: spacing.xxl + spacing.xs,
    height: spacing.xs,
    borderRadius: radius.pill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: { flexShrink: 1 },
  avatar: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contextDot: {
    width: spacing.sm - spacing.xs / 2,
    height: spacing.sm - spacing.xs / 2,
    borderRadius: radius.pill,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  tabIndicator: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    height: 2,
    borderRadius: radius.pill,
  },
  newDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.pill,
  },
  countBadge: {
    minWidth: spacing.lg + spacing.xs,
    height: spacing.lg + spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
