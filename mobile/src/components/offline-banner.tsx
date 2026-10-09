import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { discard, retryFailed } from '@/lib/offline/queue';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { syncNow } from '@/providers/offline';
import { radius, spacing, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A small pill at the top of the screen: "Offline · 2 waiting", "Syncing…", a flash of "Saved offline", or
 * "1 couldn't be saved". Tap it to see the entries and discard or retry them.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const snap = useOfflineSnapshot();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Flash short messages ("Saved offline", "Synced 2 entries") for a few seconds
  useEffect(() => {
    if (!snap.notice) return;
    setNotice(snap.notice.text);
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [snap.notice]);

  const attention = !snap.online || snap.pending > 0 || snap.failed > 0;
  if (!attention && !notice) return null;

  const tone = snap.failed > 0 ? 'danger' : !snap.online ? 'warning' : snap.pending > 0 ? 'info' : 'success';
  const color = { danger: colors.danger, warning: colors.warning, info: '#3b82f6', success: colors.success }[tone];
  const icons: Record<typeof tone, IconName> = {
    danger: 'alert-circle',
    warning: 'cloud-offline-outline',
    info: 'sync-outline',
    success: 'checkmark-circle',
  };
  const icon = icons[tone];

  const text =
    notice ??
    (snap.failed > 0
      ? `${plural(snap.failed, "entry couldn't", "entries couldn't")} be saved`
      : !snap.online
        ? snap.pending > 0
          ? `Offline · ${plural(snap.pending, 'entry', 'entries')} waiting`
          : "Offline · you can keep logging"
        : `Syncing ${plural(snap.pending, 'entry', 'entries')}…`);

  const reviewable = snap.pending > 0 || snap.failed > 0;

  return (
    <>
      <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${text}. ${reviewable ? 'Tap to review.' : ''}`}
          disabled={!reviewable}
          onPress={() => setOpen(true)}
          style={[styles.pill, { backgroundColor: colors.card, borderColor: color }]}>
          <Ionicons name={icon} size={14} color={color} />
          <Text variant="caption" style={{ fontWeight: '600' }}>
            {text}
          </Text>
          {reviewable && <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />}
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: insets.bottom + spacing.lg }]}>
          <Text variant="heading">Offline entries</Text>
          <Text variant="caption" muted style={{ marginBottom: spacing.md }}>
            Saved on this phone. Waiting entries are sent automatically; the rest were rejected by the server.
          </Text>

          <ScrollView style={{ maxHeight: 320 }}>
            {snap.items.length === 0 ? (
              <Text muted style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
                Nothing waiting.
              </Text>
            ) : (
              snap.items.map((item) => (
                <View key={`${item.kind}-${item.id}`} style={[styles.item, { borderColor: colors.border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '600' }} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text variant="caption" muted numberOfLines={2}>
                      {item.kind === 'failed' ? (item.error ?? 'Rejected') : 'Waiting to sync'} ·{' '}
                      {new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Discard ${item.label}`}
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert('Discard this entry?', `${item.label} will be deleted from this phone and never sent.`, [
                        { text: 'Keep', style: 'cancel' },
                        { text: 'Discard', style: 'destructive', onPress: () => void discard(item.id) },
                      ])
                    }>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {snap.online && snap.pending > 0 && <Button title="Sync now" onPress={() => void syncNow()} loading={snap.replaying} />}
            {snap.failed > 0 && <Button title="Retry the rejected ones" variant="secondary" onPress={() => void retryFailed().then(() => syncNow())} />}
            <Button title="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
