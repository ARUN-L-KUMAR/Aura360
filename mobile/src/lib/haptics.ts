import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback for key actions. Every call is fire-and-forget and silently does nothing on devices or platforms
 * without a haptic engine, so components can call these unconditionally.
 */
const run = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

export const haptics = {
  /** Light tap: button press, chip select. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Selection tick: tab change, segmented control, toggle. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Heavier thud: drag snap, long-press pickup. */
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
