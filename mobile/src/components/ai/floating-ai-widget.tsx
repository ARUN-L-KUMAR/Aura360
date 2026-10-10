import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { MessageBubble } from '@/components/ai/message-bubble';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { aiActions } from '@/features/ai/threads';
import { AI_MODELS } from '@/features/ai/types';
import { useAiChat } from '@/features/ai/use-chat';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function BotIcon({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M12 8V4H8" />
      <Rect width={16} height={12} x={4} y={8} rx={2} />
      <Path d="M2 14h2" />
      <Path d="M20 14h2" />
      <Path d="M15 13v2" />
      <Path d="M9 13v2" />
    </Svg>
  );
}

type WidgetTab = 'chat' | 'for_you' | 'drafts';

const MODULE_NAMES: Record<string, string> = {
  index: 'Dashboard',
  finance: 'Finance & Expenses',
  fashion: 'Fashion & Style',
  saved: 'Saved Items',
  fitness: 'Fitness & Workouts',
  food: 'Food & Nutrition',
  skincare: 'Skincare Routine',
  notes: 'Notes & Ideas',
  time: 'Time Tracker',
  ai: 'Ask Aura',
};

const CONTEXT_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  fashion: [
    { label: 'What to wear?', prompt: 'What outfit combination can I wear today based on my active wardrobe?' },
    { label: 'Wardrobe audit', prompt: 'Review my wardrobe asset valuation and tell me which items are worn most.' },
    { label: 'Laundry status', prompt: 'Which clothing items are marked as needing a wash right now?' },
  ],
  finance: [
    { label: 'Spending breakdown', prompt: 'Review my recent transactions and tell me my total spending this month.' },
    { label: 'Budget check', prompt: 'Check all my active budgets and let me know if any are nearing limits.' },
    { label: 'Log ₹250 meal', prompt: 'Log an expense of ₹250 for lunch today under Food.' },
  ],
  fitness: [
    { label: 'Today’s workout', prompt: 'Suggest a balanced 30-minute training routine for today.' },
    { label: 'Activity streak', prompt: 'Check my recent workouts and summarize my active streak.' },
    { label: 'Log workout', prompt: 'Log a 45-minute strength training workout for today.' },
  ],
  food: [
    { label: 'Nutrition check', prompt: 'Review my meals logged today and estimate my calorie pacing.' },
    { label: 'Quick meal idea', prompt: 'Suggest a high-protein quick meal with under 500 calories.' },
    { label: 'Log food', prompt: 'Log breakfast: 2 boiled eggs and oatmeal.' },
  ],
  skincare: [
    { label: 'Routine sequence', prompt: 'Review my morning and evening skincare steps.' },
    { label: 'Product audit', prompt: 'Which skincare items do I currently own vs need to buy?' },
  ],
  saved: [
    { label: 'Search saved', prompt: 'What links and articles have I saved recently?' },
    { label: 'Favourites review', prompt: 'List all my favourited saved items.' },
  ],
  default: [
    { label: 'Day summary', prompt: 'Summarize my activity and logs across Aura360 for today.' },
    { label: 'Quick note', prompt: 'Create a note titled "Idea" with details to be filled later.' },
    { label: 'Log expense', prompt: 'Record a ₹150 expense for coffee.' },
  ],
};

const FOR_YOU_ITEMS = [
  {
    id: 'fy-1',
    title: 'Style & Outfit Suggestion',
    desc: 'Get curated outfit ideas matching your wardrobe items',
    prompt: 'Check my wardrobe and suggest a stylish outfit combination for today.',
    tag: 'Fashion',
    icon: 'shirt-outline' as const,
    color: moduleColors.fashion,
  },
  {
    id: 'fy-2',
    title: 'Weekly Expense Review',
    desc: 'Analyze where your money is going this month',
    prompt: 'Review my recent transactions and tell me where I am spending most.',
    tag: 'Finance',
    icon: 'wallet-outline' as const,
    color: moduleColors.finance,
  },
  {
    id: 'fy-3',
    title: '30-Min Workout Plan',
    desc: 'Quick, balanced training based on your routine',
    prompt: 'Suggest a focused 30-minute workout routine for today.',
    tag: 'Fitness',
    icon: 'barbell-outline' as const,
    color: moduleColors.fitness,
  },
  {
    id: 'fy-4',
    title: 'Daily Reflection Note',
    desc: 'Draft key highlights and priorities for today',
    prompt: 'Help me draft a concise daily recap note with today’s priorities.',
    tag: 'Productivity',
    icon: 'document-text-outline' as const,
    color: moduleColors.notes,
  },
];

const BUTTON_SIZE = 48;

export function FloatingAiWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { colors } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>('chat');
  const [input, setInput] = useState('');

  const { store, thread, busy, send, confirmAction, cancelAction, stop } = useAiChat();

  // Hide the floating widget if user is already on the dedicated Ask Aura tab
  const isChatTab = pathname?.endsWith('/ai') || (segments as string[]).includes('ai');

  // Initial position: Left side, above bottom tab bar
  const defaultX = 18;
  const defaultY = screenHeight - (insets.bottom || 12) - 64 - BUTTON_SIZE;

  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const currentPos = useRef({ x: defaultX, y: defaultY });

  useEffect(() => {
    const id = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Tap detected (user tapped rather than dragged)
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          setIsOpen(true);
          return;
        }

        // Clamp to screen boundaries with padding
        const minX = 10;
        const maxX = screenWidth - BUTTON_SIZE - 10;
        const minY = (insets.top || 20) + 8;
        const maxY = screenHeight - (insets.bottom || 10) - 56 - BUTTON_SIZE;

        const clampedX = Math.max(minX, Math.min(maxX, currentPos.current.x));
        const clampedY = Math.max(minY, Math.min(maxY, currentPos.current.y));

        Animated.spring(pan, {
          toValue: { x: clampedX, y: clampedY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  // Determine current active module name for context
  const currentModuleKey =
    segments.find((seg) => typeof seg === 'string' && seg in MODULE_NAMES) ||
    pathname?.split('/').filter(Boolean).pop() ||
    'index';

  const pageTitle = MODULE_NAMES[currentModuleKey] || 'Dashboard';
  const quickPrompts = CONTEXT_PROMPTS[currentModuleKey] || CONTEXT_PROMPTS.default;

  const modelName = AI_MODELS.find((m) => m.id === store.model)?.name ?? 'Gemini 3.6 Flash';
  const messages = useMemo(() => [...(thread?.messages ?? [])].reverse(), [thread?.messages]);

  // Pending actions awaiting user confirmation
  const pendingDrafts = useMemo(() => {
    return (thread?.messages ?? []).filter(
      (m) => m.pendingAction && m.actionStatus === 'pending'
    );
  }, [thread?.messages]);

  const handleSend = useCallback(
    (customText?: string) => {
      const text = (customText || input).trim();
      if (!text || busy) return;
      setInput('');
      setActiveTab('chat');
      void send(text);
    },
    [busy, input, send]
  );

  const handleStartNew = () => {
    if (thread && thread.messages.length === 0) return;
    aiActions.newThread();
  };

  const handleExpandToPage = () => {
    setIsOpen(false);
    router.push('/ai');
  };

  if (isChatTab) return null;

  return (
    <>
      {/* ── Draggable Floating Launcher Button ── */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: pan.getTranslateTransform(),
            },
          ]}
          {...panResponder.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask Aura AI Assistant"
            style={({ pressed }) => [
              styles.fabButton,
              {
                backgroundColor: '#6366f1',
                borderColor: 'rgba(255, 255, 255, 0.28)',
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <BotIcon size={22} color="#ffffff" />
            <View style={styles.onlineDot} />

            {pendingDrafts.length > 0 ? (
              <View style={styles.fabDraftBadge}>
                <Text style={styles.fabDraftBadgeText}>{pendingDrafts.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      )}

      {/* ── Docked Floating Assistant Modal ── */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.backdropDismiss}
            onPress={() => setIsOpen(false)}
            accessibilityLabel="Close assistant"
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom || spacing.md,
              },
            ]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandleRow}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerAvatar, { backgroundColor: `${moduleColors.ai}20` }]}>
                  <BotIcon size={16} color={moduleColors.ai} />
                </View>
                <View style={{ gap: 1 }}>
                  <Text variant="label" style={{ fontWeight: '700', fontSize: 14 }}>
                    Aura Assistant
                  </Text>
                  <View style={styles.contextBadge}>
                    <View style={styles.contextDot} />
                    <Text variant="caption" muted style={{ fontSize: 10 }}>
                      Working on {pageTitle}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.headerActions}>
                {/* New Chat */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="New Chat"
                  onPress={handleStartNew}
                  hitSlop={8}
                  style={styles.headerBtn}>
                  <Ionicons name="create-outline" size={19} color={colors.text} />
                </Pressable>

                {/* Expand to Full Page */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Full AI Page"
                  onPress={handleExpandToPage}
                  hitSlop={8}
                  style={styles.headerBtn}>
                  <Ionicons name="expand-outline" size={18} color={colors.text} />
                </Pressable>

                {/* Close */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setIsOpen(false)}
                  hitSlop={8}
                  style={styles.headerBtn}>
                  <Ionicons name="close" size={21} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Sub-Tabs: Chat | For You | Drafts */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.cardMuted }]}>
              <Pressable
                accessibilityRole="tab"
                onPress={() => setActiveTab('chat')}
                style={[
                  styles.tabButton,
                  activeTab === 'chat' && [styles.tabButtonActive, { borderColor: moduleColors.ai }],
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'chat' ? moduleColors.ai : colors.textMuted,
                      fontWeight: activeTab === 'chat' ? '700' : '500',
                    },
                  ]}>
                  Chat
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                onPress={() => setActiveTab('for_you')}
                style={[
                  styles.tabButton,
                  activeTab === 'for_you' && [styles.tabButtonActive, { borderColor: moduleColors.ai }],
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'for_you' ? moduleColors.ai : colors.textMuted,
                      fontWeight: activeTab === 'for_you' ? '700' : '500',
                    },
                  ]}>
                  For You
                </Text>
                <View style={styles.forYouDot} />
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                onPress={() => setActiveTab('drafts')}
                style={[
                  styles.tabButton,
                  activeTab === 'drafts' && [styles.tabButtonActive, { borderColor: moduleColors.ai }],
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'drafts' ? moduleColors.ai : colors.textMuted,
                      fontWeight: activeTab === 'drafts' ? '700' : '500',
                    },
                  ]}>
                  Drafts
                </Text>
                {pendingDrafts.length > 0 ? (
                  <View style={styles.draftTabBadge}>
                    <Text style={styles.draftTabBadgeText}>{pendingDrafts.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* Tab: Chat */}
            {activeTab === 'chat' && (
              <View style={{ flex: 1 }}>
                {messages.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconBox, { backgroundColor: `${moduleColors.ai}18` }]}>
                      <Ionicons name="sparkles" size={28} color={moduleColors.ai} />
                    </View>
                    <Text variant="heading" style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                      How can I help with {pageTitle}?
                    </Text>
                    <Text variant="caption" muted style={{ textAlign: 'center', maxWidth: 280, marginTop: 4 }}>
                      Ask questions, request style recommendations, log transactions, or draft entries.
                    </Text>

                    <View style={styles.quickPromptsList}>
                      {quickPrompts.map((item) => (
                        <Pressable
                          key={item.label}
                          onPress={() => handleSend(item.prompt)}
                          style={({ pressed }) => [
                            styles.quickPromptChip,
                            {
                              backgroundColor: colors.cardMuted,
                              borderColor: colors.border,
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}>
                          <Ionicons name="arrow-forward" size={13} color={moduleColors.ai} />
                          <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500', flex: 1 }}>
                            {item.prompt}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <FlatList
                    inverted
                    data={messages}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
                    renderItem={({ item }) => (
                      <MessageBubble
                        message={item}
                        disabled={busy}
                        onConfirm={confirmAction}
                        onCancel={cancelAction}
                      />
                    )}
                  />
                )}

                {/* Composer */}
                <View style={[styles.composerContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.modelTagRow}>
                    <Text variant="caption" muted style={{ fontSize: 10 }}>
                      Model: {modelName}
                    </Text>
                  </View>

                  <View style={styles.composerInputRow}>
                    <TextInput
                      value={input}
                      onChangeText={setInput}
                      placeholder={`Message Aura about ${pageTitle}…`}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      maxLength={3000}
                      style={[
                        styles.composerInput,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />

                    {busy ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Stop response"
                        onPress={stop}
                        style={[styles.composerSendBtn, { backgroundColor: colors.cardMuted }]}>
                        <Ionicons name="stop" size={18} color={colors.text} />
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        onPress={() => handleSend()}
                        disabled={!input.trim()}
                        style={[
                          styles.composerSendBtn,
                          {
                            backgroundColor: moduleColors.ai,
                            opacity: input.trim() ? 1 : 0.4,
                          },
                        ]}>
                        <Ionicons name="arrow-up" size={20} color="#ffffff" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Tab: For You */}
            {activeTab === 'for_you' && (
              <FlatList
                data={FOR_YOU_ITEMS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSend(item.prompt)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                    <GlassCard style={styles.forYouCard}>
                      <View style={[styles.forYouIcon, { backgroundColor: `${item.color}1c` }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text variant="label" style={{ fontWeight: '700' }}>
                            {item.title}
                          </Text>
                          <Text variant="caption" style={{ color: item.color, fontWeight: '700', fontSize: 10 }}>
                            {item.tag}
                          </Text>
                        </View>
                        <Text variant="caption" muted numberOfLines={2}>
                          {item.desc}
                        </Text>
                      </View>
                    </GlassCard>
                  </Pressable>
                )}
              />
            )}

            {/* Tab: Drafts (Pending approvals) */}
            {activeTab === 'drafts' && (
              <View style={{ flex: 1 }}>
                {pendingDrafts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconBox, { backgroundColor: `${colors.success}18` }]}>
                      <Ionicons name="checkmark-done" size={28} color={colors.success} />
                    </View>
                    <Text variant="heading" style={{ fontSize: 15, fontWeight: '700' }}>
                      Nothing waiting for review
                    </Text>
                    <Text variant="caption" muted style={{ textAlign: 'center', maxWidth: 280, marginTop: 4 }}>
                      When Aura drafts actions, transactions, or items for your approval, they appear here.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={pendingDrafts}
                    keyExtractor={(m) => m.id}
                    contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
                    renderItem={({ item }) => (
                      <GlassCard style={{ gap: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                          <Text variant="label" style={{ fontWeight: '700', color: '#f59e0b' }}>
                            Pending Confirmation
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: colors.text }}>
                          {item.pendingAction?.summary || `Execute ${item.pendingAction?.tool}`}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                          <Pressable
                            onPress={() => confirmAction(item.id)}
                            style={[styles.draftActionBtn, { backgroundColor: colors.success }]}>
                            <Ionicons name="checkmark" size={16} color="#ffffff" />
                            <Text style={styles.draftActionBtnText}>Approve</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => cancelAction(item.id)}
                            style={[styles.draftActionBtn, { backgroundColor: colors.cardMuted }]}>
                            <Ionicons name="close" size={16} color={colors.textMuted} />
                            <Text style={[styles.draftActionBtnText, { color: colors.textMuted }]}>
                              Cancel
                            </Text>
                          </Pressable>
                        </View>
                      </GlassCard>
                    )}
                  />
                )}
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  onlineDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  fabDraftBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  fabDraftBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    height: '75%',
    maxHeight: 640,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contextDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 13,
  },
  forYouDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  draftTabBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  quickPromptsList: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  modelTagRow: {
    paddingHorizontal: 4,
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
  },
  composerSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  forYouIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  draftActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
