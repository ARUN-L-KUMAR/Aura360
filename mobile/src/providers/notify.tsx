/**
 * App-wide notifications: `NotifyProvider` mounts the toast, banner and dialog layers; `useNotify()` is the one API
 * screens use. Severity model, surfaces and the mapping from push / inbox notifications: see `src/lib/notify.ts`.
 *
 * ```ts
 * const notify = useNotify();
 * notify.success('Saved');
 * notify.error(err);                                   // Error | string
 * notify.toast({ message: 'Entry deleted', action: { label: 'Undo', onPress: restore } });
 * if (await notify.confirm({ title: 'Delete entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) { ... }
 * notify.banner({ id: 'session', severity: 'critical', message: 'Your session expired.', action: { label: 'Sign in', onPress } });
 * ```
 *
 * Toasts and banners render in the app tree; dialogs use a native Modal. A toast raised while a dialog or sheet is
 * open appears behind it (and is visible once it closes).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useLatest } from '@/components/ui/bottom-sheet';
import { BannerHost } from '@/components/ui/banner';
import { Dialog, type DialogAction, type DialogProps } from '@/components/ui/dialog';
import { ToastHost } from '@/components/ui/toast';
import {
  EMPTY_TOAST_QUEUE,
  bindNotifyHandle,
  dismissToastIn,
  enqueueToast,
  errorMessage,
  normalizeBanner,
  normalizeToast,
  notifyOutsideReact,
  removeBanner,
  upsertBanner,
  type AlertOptions,
  type BannerItem,
  type ConfirmOptions,
  type NotifyApi,
  type Severity,
  type ToastOptions,
  type ToastQueue,
} from '@/lib/notify';

export { notifyOutsideReact };
export type { NotifyApi };

type DialogSpec = Pick<DialogProps, 'title' | 'message' | 'severity' | 'dismissible'> & {
  /** Builds the buttons; each calls `settle` with the value the promise resolves to. */
  actions: (settle: (value: boolean) => void) => DialogAction[];
};
type DialogRequest = { id: number; props: DialogSpec; resolve: (value: boolean) => void };

const NotifyContext = createContext<NotifyApi | null>(null);

type Props = {
  children: ReactNode;
  /** Clearance above the bottom safe area for the tab bar. */
  toastBottomOffset?: number;
  /** Clearance below the top safe area for banners and top toasts. */
  topOffset?: number;
};

let requestCounter = 0;

export function NotifyProvider({ children, toastBottomOffset, topOffset }: Props) {
  const [toasts, setToasts] = useState<ToastQueue>(EMPTY_TOAST_QUEUE);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [dialogs, setDialogs] = useState<DialogRequest[]>([]);
  const bannersRef = useLatest(banners);

  const toast = useCallback((options: ToastOptions | string) => {
    const item = normalizeToast(options);
    setToasts((state) => enqueueToast(state, item));
    return item.id;
  }, []);

  const dismissToast = useCallback((id?: string) => setToasts((state) => dismissToastIn(state, id)), []);

  const banner = useCallback((options: Parameters<NotifyApi['banner']>[0]) => {
    const item = normalizeBanner(options);
    setBanners((list) => upsertBanner(list, item));
  }, []);

  const dismissBanner = useCallback((id: string) => setBanners((list) => removeBanner(list, id)), []);

  const handleBannerDismiss = useCallback(
    (id: string) => {
      bannersRef.current.find((b) => b.id === id)?.onDismiss?.();
      dismissBanner(id);
    },
    [dismissBanner, bannersRef],
  );

  const openDialog = useCallback((props: DialogRequest['props']) => {
    return new Promise<boolean>((resolve) => {
      setDialogs((queue) => [...queue, { id: ++requestCounter, props, resolve }]);
    });
  }, []);

  const api = useMemo<NotifyApi>(() => {
    const withSeverity = (severity: Severity) => (message: string, options?: Partial<ToastOptions>) =>
      toast({ ...options, message, severity });

    return {
      toast,
      dismissToast,
      info: withSeverity('info'),
      success: withSeverity('success'),
      warning: withSeverity('warning'),
      error: (message, options) => toast({ ...options, message: errorMessage(message), severity: 'error' }),
      banner,
      dismissBanner,
      confirm: (o: ConfirmOptions) =>
        openDialog({
          title: o.title,
          message: o.message,
          severity: o.destructive ? 'warning' : undefined,
          dismissible: true,
          actions: (settle) => [
            { label: o.cancelLabel ?? 'Cancel', variant: 'secondary', onPress: () => settle(false) },
            { label: o.confirmLabel ?? 'Confirm', variant: o.destructive ? 'destructive' : 'primary', onPress: () => settle(true) },
          ],
        }),
      alert: async (o: AlertOptions) => {
        await openDialog({
          title: o.title,
          message: o.message,
          severity: o.severity,
          dismissible: o.severity !== 'critical',
          actions: (settle) => [{ label: o.okLabel ?? 'OK', variant: 'primary', onPress: () => settle(true) }],
        });
      },
      critical: async (o) => {
        await openDialog({
          title: o.title,
          message: o.message,
          severity: 'critical',
          dismissible: false,
          actions: (settle) => [{ label: o.okLabel ?? 'OK', variant: 'primary', onPress: () => settle(true) }],
        });
      },
    };
  }, [toast, dismissToast, banner, dismissBanner, openDialog]);

  useEffect(() => {
    bindNotifyHandle(api);
    return () => bindNotifyHandle(null);
  }, [api]);

  // The dialog on screen is the oldest request; the rest wait their turn. The last one is kept for its fade-out.
  const active = dialogs[0];
  const [lastActive, setLastActive] = useState<DialogRequest | undefined>(undefined);
  if (active && active !== lastActive) setLastActive(active);
  const shown = active ?? lastActive;

  const settle = useCallback((value: boolean) => {
    setDialogs((queue) => {
      const [first, ...rest] = queue;
      first?.resolve(value);
      return rest;
    });
  }, []);

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <BannerHost banners={banners} onDismiss={handleBannerDismiss} topOffset={topOffset} />
      <ToastHost current={toasts.current} onDismiss={dismissToast} bottomOffset={toastBottomOffset} topOffset={topOffset} />
      {shown ? (
        <Dialog
          visible={!!active}
          title={shown.props.title}
          message={shown.props.message}
          severity={shown.props.severity}
          dismissible={shown.props.dismissible}
          actions={shown.props.actions(settle)}
          onClose={() => settle(false)}
        />
      ) : null}
    </NotifyContext.Provider>
  );
}

/**
 * The notification API. Outside a `NotifyProvider` (e.g. in a test or an error boundary) it falls back to the
 * imperative handle, whose calls are harmless no-ops until a provider mounts.
 */
export function useNotify(): NotifyApi {
  return useContext(NotifyContext) ?? notifyOutsideReact;
}
