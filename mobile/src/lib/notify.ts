/**
 * Unified notification model: types and pure logic (no React, no native modules), shared by the toast, banner and
 * dialog components and by `NotifyProvider` (src/providers/notify.tsx).
 *
 * ## Severity hierarchy
 *
 * `info < success < warning < error < critical`. Higher severity means more interruptive and longer-lived:
 *
 * | Severity   | Surface                          | Auto-dismiss | Haptic  | Icon             | Role |
 * |------------|----------------------------------|--------------|---------|------------------|------|
 * | `info`     | toast                            | 4 s          | none    | information-circle | FYI, nothing to do |
 * | `success`  | toast                            | 3 s          | success | checkmark-circle | An action worked |
 * | `warning`  | toast, or banner if it persists  | 5.5 s        | warning | warning          | Needs attention soon |
 * | `error`    | toast (long) or banner           | 7 s          | error   | close-circle     | An action failed |
 * | `critical` | banner or blocking dialog        | never        | error   | alert-circle     | Must be acknowledged |
 *
 * Severity is never colour alone: every surface pairs the colour with the icon and label from `describeSeverity()`.
 * Colour comes from the theme at render time (`severityColors`).
 *
 * ## How other notification channels map onto the same model
 *
 * These systems are server/OS driven and are NOT changed by this module; they simply share the vocabulary:
 *
 * - **In-app inbox** (`src/features/notifications`, `AppNotification.type`): the server already sends
 *   `'info' | 'warning' | 'error' | 'success'`, which is exactly `Severity` minus `critical`. Use the same icon and
 *   colour per type in the inbox list via `describeSeverity` / `severityColors` so a "warning" looks the same
 *   everywhere. A new inbox item that arrives while the app is open may be surfaced with `notify.toast`.
 * - **Local reminders** (`src/lib/notifications.ts`: water, skincare, daily review) are `info`; **budget alerts** are
 *   `warning` (approaching) or `error` (exceeded). They are OS notifications while the app is backgrounded; when the
 *   app is foregrounded, show the equivalent toast instead of a system banner.
 * - **Server push** (`src/lib/push.ts`): same mapping as the inbox; the payload's `type` picks the severity. A push
 *   received in the foreground becomes a toast with an action that deep-links to the notification's route.
 * - **Offline pill** (`OfflineBanner`): stays its own surface; offline = `warning`, rejected entries = `error`.
 */
import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type Severity = 'info' | 'success' | 'warning' | 'error' | 'critical';

/** Lowest to highest. Index is the severity's rank. */
export const SEVERITY_ORDER: readonly Severity[] = ['info', 'success', 'warning', 'error', 'critical'];

export const severityRank = (severity: Severity) => SEVERITY_ORDER.indexOf(severity);

/** Positive when `a` is more severe than `b`. */
export const compareSeverity = (a: Severity, b: Severity) => severityRank(a) - severityRank(b);

export type Surface = 'toast' | 'banner' | 'dialog';

export type HapticKind = 'success' | 'warning' | 'error' | null;

type SeverityMeta = {
  icon: IconName;
  label: string;
  /** Theme colour family used to render it. `critical` reuses the error family with a solid fill. */
  tone: 'info' | 'success' | 'warning' | 'error';
  /** Surfaces this severity may use; the first is the default. */
  surfaces: readonly Surface[];
  /** Default on-screen time for a toast in ms. 0 means it stays until dismissed. */
  duration: number;
  haptic: HapticKind;
};

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  info: { icon: 'information-circle', label: 'Info', tone: 'info', surfaces: ['toast'], duration: 4000, haptic: null },
  success: { icon: 'checkmark-circle', label: 'Success', tone: 'success', surfaces: ['toast'], duration: 3000, haptic: 'success' },
  warning: { icon: 'warning', label: 'Warning', tone: 'warning', surfaces: ['toast', 'banner'], duration: 5500, haptic: 'warning' },
  error: { icon: 'close-circle', label: 'Error', tone: 'error', surfaces: ['toast', 'banner'], duration: 7000, haptic: 'error' },
  critical: { icon: 'alert-circle', label: 'Critical', tone: 'error', surfaces: ['banner', 'dialog'], duration: 0, haptic: 'error' },
};

/** Icon name and spoken / visible label for a severity. Colour is resolved at render time from the theme. */
export function describeSeverity(severity: Severity): { icon: IconName; label: string; tone: SeverityMeta['tone'] } {
  const { icon, label, tone } = SEVERITY_META[severity];
  return { icon, label, tone };
}

export const defaultDuration = (severity: Severity) => SEVERITY_META[severity].duration;
export const hapticFor = (severity: Severity): HapticKind => SEVERITY_META[severity].haptic;

/** True when a severity is allowed to appear on a surface. */
export const canUseSurface = (severity: Severity, surface: Surface) => SEVERITY_META[severity].surfaces.includes(surface);

/** Theme colours for a severity. Critical renders as a solid fill, everything else as a soft container. */
export function severityColors(colors: ThemeColors, severity: Severity) {
  const { tone } = SEVERITY_META[severity];
  const soft = {
    background: colors[`${tone}Container`],
    foreground: colors[`on${capitalize(tone)}Container` as keyof ThemeColors],
    border: colors[`${tone}Border`],
    /** Colour for the icon. */
    icon: colors[`on${capitalize(tone)}Container` as keyof ThemeColors],
  };
  if (severity !== 'critical') return soft;
  return { background: colors.error, foreground: colors.onError, border: colors.error, icon: colors.onError };
}

function capitalize<T extends string>(value: T): Capitalize<T> {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<T>;
}

// ---------------------------------------------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------------------------------------------

export type NotifyAction = { label: string; onPress: () => void };

export type ToastPosition = 'top' | 'bottom';

export type ToastOptions = {
  /** Supply to update or dismiss a specific toast. Generated when omitted. */
  id?: string;
  message: string;
  title?: string;
  /** Default `info`. */
  severity?: Severity;
  /** Milliseconds on screen. 0 keeps it until dismissed. Defaults by severity; toasts with an action get at least 6 s. */
  duration?: number;
  /** One action, e.g. Undo. The toast dismisses after it runs. */
  action?: NotifyAction;
  /** Default `bottom`. */
  position?: ToastPosition;
  /** Fire the severity's haptic. Default true. */
  haptic?: boolean;
};

export type BannerOptions = {
  /** Stable id: showing a banner with an existing id updates it in place. */
  id: string;
  message: string;
  title?: string;
  /** Default `info`. */
  severity?: Severity;
  action?: NotifyAction;
  /** Show a dismiss button. Default true except for `critical`. */
  dismissible?: boolean;
  onDismiss?: () => void;
};

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Default "Confirm" (or "Delete" style wording is up to the caller). */
  confirmLabel?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  /** Styles the confirm button as destructive and shows a warning icon. */
  destructive?: boolean;
};

export type AlertOptions = {
  title: string;
  message?: string;
  /** Default "OK". */
  okLabel?: string;
  /** Adds the matching icon. */
  severity?: Severity;
};

export type NotifyApi = {
  /** Show a toast. Returns its id. A bare string is an `info` toast. */
  toast: (options: ToastOptions | string) => string;
  dismissToast: (id?: string) => void;
  info: (message: string, options?: Partial<ToastOptions>) => string;
  success: (message: string, options?: Partial<ToastOptions>) => string;
  warning: (message: string, options?: Partial<ToastOptions>) => string;
  /** Accepts an Error (or anything thrown) and shows its message with a friendly fallback. */
  error: (message: string | Error | unknown, options?: Partial<ToastOptions>) => string;
  banner: (options: BannerOptions) => void;
  dismissBanner: (id: string) => void;
  /** Resolves true when the user confirms, false when they cancel or dismiss. Drop-in for Alert.alert confirmations. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves when the user acknowledges it. */
  alert: (options: AlertOptions) => Promise<void>;
  /** Blocking dialog that must be acknowledged. */
  critical: (options: Omit<AlertOptions, 'severity'>) => Promise<void>;
};

// ---------------------------------------------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------------------------------------------

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** A user-presentable message from anything that was thrown. */
export function errorMessage(error: unknown, fallback = FALLBACK_ERROR_MESSAGE): string {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

// ---------------------------------------------------------------------------------------------------------------
// Toast queue (max 1 visible, the rest wait; identical toasts are merged)
// ---------------------------------------------------------------------------------------------------------------

export type ToastItem = Required<Pick<ToastOptions, 'id' | 'message' | 'severity' | 'duration' | 'position' | 'haptic'>> &
  Pick<ToastOptions, 'title' | 'action'> & {
    /** Bumped when an identical toast arrives while this one is visible, so the host restarts its timer. */
    nonce: number;
  };

export type ToastQueue = { current: ToastItem | null; queue: ToastItem[] };

export const EMPTY_TOAST_QUEUE: ToastQueue = { current: null, queue: [] };
export const MAX_QUEUED_TOASTS = 8;
/** A toast with an action stays long enough to be read and tapped. */
export const MIN_ACTION_DURATION = 6000;

let toastCounter = 0;
export const nextToastId = () => `toast-${++toastCounter}`;

export function normalizeToast(options: ToastOptions | string): ToastItem {
  const o: ToastOptions = typeof options === 'string' ? { message: options } : options;
  const severity = o.severity ?? 'info';
  let duration = o.duration ?? defaultDuration(severity);
  if (o.action && duration > 0) duration = Math.max(duration, MIN_ACTION_DURATION);
  return {
    id: o.id ?? nextToastId(),
    message: o.message,
    title: o.title,
    severity,
    duration,
    action: o.action,
    position: o.position ?? 'bottom',
    haptic: o.haptic ?? true,
    nonce: 0,
  };
}

/** Two toasts are "identical" when a user would see the same thing. */
export const toastKey = (t: Pick<ToastItem, 'severity' | 'title' | 'message' | 'action'>) =>
  `${t.severity}|${t.title ?? ''}|${t.message}|${t.action?.label ?? ''}`;

/**
 * Adds a toast. Rules: identical to the visible one restarts its timer instead of stacking; identical to a queued
 * one is dropped; otherwise it queues behind the visible toast, with more severe toasts ahead of less severe
 * ones (stable within a severity). The queue is capped; the least severe, oldest entries are dropped first.
 */
export function enqueueToast(state: ToastQueue, item: ToastItem): ToastQueue {
  const key = toastKey(item);
  if (state.current && (state.current.id === item.id || toastKey(state.current) === key)) {
    return { ...state, current: { ...state.current, nonce: state.current.nonce + 1 } };
  }
  if (!state.current) return { current: item, queue: state.queue };
  if (state.queue.some((q) => q.id === item.id || toastKey(q) === key)) return state;

  const rank = severityRank(item.severity);
  const at = state.queue.findIndex((q) => severityRank(q.severity) < rank);
  const queue = at === -1 ? [...state.queue, item] : [...state.queue.slice(0, at), item, ...state.queue.slice(at)];
  return { ...state, queue: queue.length > MAX_QUEUED_TOASTS ? queue.slice(0, MAX_QUEUED_TOASTS) : queue };
}

/** Removes a toast (default: the visible one) and promotes the next. */
export function dismissToastIn(state: ToastQueue, id?: string): ToastQueue {
  if (id === undefined || state.current?.id === id) {
    const [next, ...rest] = state.queue;
    return { current: next ?? null, queue: rest };
  }
  return { ...state, queue: state.queue.filter((q) => q.id !== id) };
}

// ---------------------------------------------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------------------------------------------

export type BannerItem = Required<Pick<BannerOptions, 'id' | 'message' | 'severity'>> &
  Pick<BannerOptions, 'title' | 'action' | 'onDismiss'> & { dismissible: boolean };

export function normalizeBanner(options: BannerOptions): BannerItem {
  const severity = options.severity ?? 'info';
  return {
    id: options.id,
    message: options.message,
    title: options.title,
    severity,
    action: options.action,
    onDismiss: options.onDismiss,
    dismissible: options.dismissible ?? severity !== 'critical',
  };
}

/** Adds or replaces (by id) a banner, keeping the list ordered most severe first, then oldest first. */
export function upsertBanner(list: BannerItem[], item: BannerItem): BannerItem[] {
  const existing = list.findIndex((b) => b.id === item.id);
  const next = existing === -1 ? [...list, item] : list.map((b, i) => (i === existing ? item : b));
  return next
    .map((b, i) => ({ b, i }))
    .sort((x, y) => compareSeverity(y.b.severity, x.b.severity) || x.i - y.i)
    .map(({ b }) => b);
}

export const removeBanner = (list: BannerItem[], id: string) => list.filter((b) => b.id !== id);

// ---------------------------------------------------------------------------------------------------------------
// Imperative handle for non-React code (e.g. src/lib/api.ts)
// ---------------------------------------------------------------------------------------------------------------

let handle: NotifyApi | null = null;

/** Called by `NotifyProvider` on mount (and with `null` on unmount). Not for app code. */
export function bindNotifyHandle(api: NotifyApi | null) {
  handle = api;
}

/**
 * Raise notifications from outside React. Before the provider has mounted (or after it unmounts) calls are no-ops
 * and `confirm` resolves false, so callers never need to guard.
 *
 * @example notifyOutsideReact.error('Your session expired. Please sign in again.');
 */
export const notifyOutsideReact: NotifyApi = {
  toast: (o) => handle?.toast(o) ?? '',
  dismissToast: (id) => handle?.dismissToast(id),
  info: (m, o) => handle?.info(m, o) ?? '',
  success: (m, o) => handle?.success(m, o) ?? '',
  warning: (m, o) => handle?.warning(m, o) ?? '',
  error: (m, o) => handle?.error(m, o) ?? '',
  banner: (o) => handle?.banner(o),
  dismissBanner: (id) => handle?.dismissBanner(id),
  confirm: (o) => handle?.confirm(o) ?? Promise.resolve(false),
  alert: (o) => handle?.alert(o) ?? Promise.resolve(),
  critical: (o) => handle?.critical(o) ?? Promise.resolve(),
};
