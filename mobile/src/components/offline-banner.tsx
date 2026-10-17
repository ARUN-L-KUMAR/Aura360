import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInUp, FadeOutUp, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_BAR_HEIGHT } from '@/components/ui/app-bar';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconButton } from '@/components/ui/icon-button';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { runManualSync } from '@/lib/manual-sync';
import { discard, retryFailed, type OfflineItem } from '@/lib/offline/queue';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { useNotify } from '@/providers/notify';
import { duration, layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'danger' | 'warning' | 'info' | 'success';
type BannerState = 'failed' | 'syncing' | 'notice' | 'offline' | 'queued';

const NOTICE_MS = 3500;

const ICONS: Record<BannerState, IconName> = {
  failed: 'alert-circle',
  syncing: 'sync-outline',
  notice: 'checkmark-circle',
  offline: 'cloud-offline-outline',
  queued: 'time-outline',
};

/** Icon colour on the glass surface for each tone. */
function toneColor(colors: ThemeColors, tone: Tone) {
  return {
    danger: colors.errorText,
    warning: colors.warningText,
    info: colors.infoText,
    success: colors.successText,
  }[tone];
}

/**
 * The sync icon turns while entries are being sent (stays still with reduce motion on). `done` swaps it for the pop-in
 * success check, which plays once when the "synced" notice appears.
 */
function StatusIcon({ name, color, spinning, done }: { name: IconName; color: string; spinning: boolean; done: boolean }) {
  const { reduceMotion } = useTheme();
  const rotation = useSharedValue(0);
  const turning = spinning && !reduceMotion;

  useEffect(() => {
    if (turning)
      rotation.set(
        withRepeat(
          withTiming(360, {
            duration: duration.slow * 2.5,
            easing: Easing.linear,
          }),
          -1,
        ),
      );
    else {
      cancelAnimation(rotation);
      rotation.set(0);
    }
    return () => cancelAnimation(rotation);
  }, [turning, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  if (done) return <SuccessCheck size={24} accessibilityLabel={null} />;

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}

/**
 * Status banner under the top safe area: "Offline", queued count, "Syncing n...", failed entries with a Retry action and
 * a short confirmation once everything is sent. Tap it to open the review sheet with every queued and rejected entry.
 */
export function OfflineBanner() {
  const { t } = useTranslation('offline');
  const notify = useNotify();
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const snap = useOfflineSnapshot();
  const [open, setOpen] = useState(false);
  // Flash messages ("Synced 2 offline entries") show for a few seconds. A notice that is already there on mount counts as seen.
  const [seenNotice, setSeenNotice] = useState(() => snap.notice?.at ?? 0);
  // Most entries waiting at once during the current sync, to turn "n left" into a progress bar
  const [peak, setPeak] = useState(0);

  const notice = snap.notice;
  useEffect(() => {
    if (!notice) return;
    const at = notice.at;
    const timer = setTimeout(() => setSeenNotice(at), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (snap.replaying && snap.pending > peak) setPeak(snap.pending);
  else if (!snap.replaying && peak !== 0) setPeak(0);

  const showNotice = !!notice && notice.at > seenNotice;
  const state: BannerState | null = snap.failed > 0 ? 'failed' : snap.replaying && snap.online ? 'syncing' : showNotice ? 'notice' : !snap.online ? 'offline' : snap.pending > 0 ? 'queued' : null;

  let title = '';
  let detail: string | undefined;
  let tone: Tone = 'info';
  if (state === 'failed') {
    title = t('failed.title', { count: snap.failed });
    detail = t('failed.detail', { count: snap.failed });
    tone = 'danger';
  } else if (state === 'syncing') {
    title = t('syncing.title', { count: snap.pending });
    detail = t('syncing.detail');
  } else if (state === 'notice' && notice) {
    const count = notice.count ?? 0;
    title =
      notice.kind === 'saved'
        ? t('notice.saved', { label: notice.label ?? '' })
        : notice.kind === 'synced'
          ? t('notice.synced', { count })
          : notice.kind === 'failed'
            ? t('notice.failed', { count })
            : t('notice.signIn');
    tone = notice.kind === 'failed' || notice.kind === 'signIn' ? 'warning' : 'success';
  } else if (state === 'offline') {
    title = t('offline.title');
    detail = snap.pending > 0 ? t('offline.detailQueued', { count: snap.pending }) : t('offline.detail');
    tone = 'warning';
  } else if (state === 'queued') {
    title = t('queued.title', { count: snap.pending });
    detail = t('queued.detail');
  }

  const color = toneColor(colors, tone);
  // One haptic each time a new "synced" notice appears (not while it merely stays on screen)
  const celebrate = state === 'notice' && tone === 'success';
  const noticeAt = notice?.at;
  useEffect(() => {
    if (celebrate) haptics.success();
  }, [celebrate, noticeAt]);
  const progress = peak > 0 ? ((peak - snap.pending) / peak) * 100 : 0;
  const retry = () => {
    haptics.tap();
    void retryFailed()
      .then(() => runManualSync())
      .catch(() => notify.error(t('errors.syncFailed')));
  };
  const syncAll = () => {
    haptics.tap();
    runManualSync().catch(() => notify.error(t('errors.syncFailed')));
  };

  return (
    <>
      {state ? (
        <Animated.View
          key="offline-banner"
          entering={reduceMotion ? undefined : FadeInUp.duration(duration.base)}
          exiting={reduceMotion ? undefined : FadeOutUp.duration(duration.fast)}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            start: layout.screenPadding,
            end: layout.screenPadding,
            top: insets.top + APP_BAR_HEIGHT + spacing.xs,
            zIndex: 50,
          }}>
          <GlassSurface style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion={state === 'failed' ? 'assertive' : 'polite'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingEnd: spacing.sm,
              }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
                accessibilityHint={t('actions.bannerHint')}
                onPress={() => setOpen(true)}
                scaleTo={1}
                ringRadius={radius.lg}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: layout.minTouchTarget + spacing.sm,
                  padding: spacing.md,
                }}>
                <StatusIcon name={ICONS[state]} color={color} spinning={state === 'syncing'} done={celebrate} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" weight="semiBold">
                    {title}
                  </Text>
                  {detail ? (
                    <Text variant="caption" color="textSecondary">
                      {detail}
                    </Text>
                  ) : null}
                  {state === 'syncing' ? (
                    <View style={{ paddingTop: spacing.xs }}>
                      <ProgressBar percent={progress} height={spacing.xs} />
                    </View>
                  ) : null}
                </View>
              </PressableScale>
              {state === 'failed' ? (
                <Button title={t('actions.retry')} variant="tertiary" size="sm" fullWidth={false} leftIcon="refresh-outline" onPress={retry} />
              ) : state === 'queued' ? (
                <Button title={t('actions.syncNow')} variant="tertiary" size="sm" fullWidth={false} onPress={syncAll} />
              ) : null}
            </View>
          </GlassSurface>
        </Animated.View>
      ) : null}

      <SyncSheet open={open} onClose={() => setOpen(false)} progress={progress} />
    </>
  );
}

/** Review sheet: sync status summary, every queued and rejected entry with Discard, and the Sync now / Retry buttons. */
function SyncSheet({ open, onClose, progress }: { open: boolean; onClose: () => void; progress: number }) {
  const { t } = useTranslation('offline');
  const notify = useNotify();
  const { colors } = useTheme();
  const snap = useOfflineSnapshot();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const syncing = snap.replaying && snap.online;

  return (
    <BottomSheet
      visible={open}
      onClose={() => {
        setConfirmId(null);
        onClose();
      }}
      title={t('sheet.title')}
      scrollable
      footer={
        snap.items.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {snap.online && snap.pending > 0 ? (
              <Button
                title={t('actions.syncNow')}
                leftIcon="sync-outline"
                loading={snap.replaying}
                onPress={() => {
                  haptics.tap();
                  runManualSync().catch(() => notify.error(t('errors.syncFailed')));
                }}
              />
            ) : null}
            {snap.failed > 0 ? (
              <Button
                title={t('actions.retryRejected')}
                variant="secondary"
                leftIcon="refresh-outline"
                onPress={() => {
                  haptics.tap();
                  void retryFailed()
                    .then(() => runManualSync())
                    .catch(() => notify.error(t('errors.syncFailed')));
                }}
              />
            ) : null}
          </View>
        ) : undefined
      }>
      <View style={{ paddingHorizontal: layout.screenPadding, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Badge label={snap.online ? t('sheet.online') : t('sheet.offline')} severity={snap.online ? 'success' : 'warning'} icon={snap.online ? 'cloud-done-outline' : 'cloud-offline-outline'} />
            <Badge label={t('sheet.waiting', { count: snap.pending })} severity={snap.pending > 0 ? 'info' : 'neutral'} icon="time-outline" />
            <Badge label={t('sheet.rejected', { count: snap.failed })} severity={snap.failed > 0 ? 'error' : 'neutral'} icon={snap.failed > 0 ? 'alert-circle' : 'checkmark-circle-outline'} />
          </View>
          {syncing ? <ProgressBar percent={progress} label={t('sheet.syncing', { count: snap.pending })} /> : null}
          <Text variant="caption" color="textSecondary">
            {t('sheet.explainer')}
          </Text>
        </View>

        {snap.items.length === 0 ? (
          <EmptyState illustration={<SuccessCheck size={72} accessibilityLabel={null} />} title={t('sheet.emptyTitle')} description={t('sheet.emptyDescription')} />
        ) : (
          <Card padding="none" style={{ overflow: 'hidden' }}>
            {snap.items.map((item, index) => (
              <EntryRow
                key={`${item.kind}-${item.id}`}
                item={item}
                index={index}
                divider={index < snap.items.length - 1}
                confirming={confirmId === item.id}
                onAskDiscard={() => setConfirmId(item.id)}
                onKeep={() => setConfirmId(null)}
                onDiscard={() => {
                  setConfirmId(null);
                  haptics.warning();
                  void discard(item.id);
                }}
                tile={item.kind === 'failed' ? colors.errorContainer : colors.cardMuted}
                glyph={item.kind === 'failed' ? colors.onErrorContainer : colors.textSecondary}
              />
            ))}
          </Card>
        )}
      </View>
    </BottomSheet>
  );
}

type EntryRowProps = {
  item: OfflineItem;
  index: number;
  divider: boolean;
  confirming: boolean;
  onAskDiscard: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  tile: string;
  glyph: string;
};

/**
 * One queued or rejected entry. Discarding is confirmed in place: a second dialog cannot open on top of the sheet on
 * iOS, so the row swaps to a Keep / Discard question instead of using `useNotify().confirm`.
 */
function EntryRow({ item, index, divider, confirming, onAskDiscard, onKeep, onDiscard, tile, glyph }: EntryRowProps) {
  const { t } = useTranslation('offline');
  const { colors } = useTheme();
  // Enter, leave (discard or a successful send) and close-the-gap reflow; instant under reduce-motion
  const motion = useListMotion(index);

  if (confirming) {
    return (
      <Animated.View
        {...motion}
        accessibilityRole="alert"
        style={{
          gap: spacing.md,
          padding: layout.cardPadding,
          backgroundColor: colors.errorContainer,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: colors.border,
        }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" weight="semiBold" color="onErrorContainer">
            {t('entry.discardTitle')}
          </Text>
          <Text variant="caption" color="onErrorContainer">
            {t('entry.discardBody', { label: item.label })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('entry.keep')} variant="tertiary" size="sm" fullWidth={false} onPress={onKeep} />
          <Button title={t('entry.discard')} variant="destructive" size="sm" fullWidth={false} leftIcon="trash-outline" onPress={onDiscard} />
        </View>
      </Animated.View>
    );
  }

  const rejected = item.kind === 'failed';
  const when = new Date(item.createdAt).toLocaleString(getDeviceLocale(), {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Animated.View {...motion}>
      <ListItem
        accessible={false}
        divider={divider}
        leading={
          <View
            style={{
              width: layout.minTouchTarget - spacing.xs,
              height: layout.minTouchTarget - spacing.xs,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tile,
            }}>
            <Ionicons name={rejected ? 'alert-circle-outline' : 'time-outline'} size={22} color={glyph} />
          </View>
        }
        title={item.label}
        subtitle={t('entry.subtitle', { status: rejected ? (item.error ?? t('entry.rejected')) : t('entry.waiting'), when })}
        trailing={<IconButton icon="trash-outline" variant="ghost" destructive accessibilityLabel={t('entry.discardLabel', { label: item.label })} onPress={onAskDiscard} />}
      />
    </Animated.View>
  );
}
