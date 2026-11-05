import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { NO_DESCRIPTION } from '@/components/finance/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { MAX_ITEMS_PER_SHARE } from '@/features/share-import/accept';
import { manualDraft } from '@/features/share-import/draft';
import { canRetry } from '@/features/share-import/error-code';
import { importAgain, markReview, markSkipped, retryItem, setScreenOpen } from '@/features/share-import/inbox';
import { currentItem, positionOf, savedItems, unfinishedCount } from '@/features/share-import/queue';
import type { ImportErrorCode, RejectionCounts, ShareItem } from '@/features/share-import/types';
import { useImportRunner } from '@/features/share-import/use-import-runner';
import { useShareInbox } from '@/features/share-import/use-share-inbox';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useBiometrics } from '@/providers/biometrics';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const PREVIEW_HEIGHT = spacing.xxxl * 5;
const ICON_TILE = spacing.xxxl + spacing.sm;
const CHECK = spacing.xxl + spacing.sm;

const ERROR_ICONS: Record<ImportErrorCode, IconName> = {
  unsupportedType: 'document-outline',
  unreadable: 'lock-closed-outline',
  tooLarge: 'resize-outline',
  notPayment: 'search-outline',
  network: 'cloud-offline-outline',
  timeout: 'time-outline',
  session: 'lock-closed-outline',
  server: 'alert-circle-outline',
};

/**
 * Where a payment screenshot shared from GPay, PhonePe, Paytm or any other app lands. This screen only gets the
 * screenshot read and shows how that is going; the reading result opens the Finance module's own transaction form
 * (pre-filled, editable), and saving happens there. Opened by features/share-import/share-intake.tsx.
 */
export default function ShareImportScreen() {
  const { t } = useTranslation('finance');
  const router = useRouter();
  const { colors } = useTheme();
  const snapshot = useShareInbox();
  const { isLocked, isReady } = useBiometrics();
  const current = currentItem(snapshot);
  const saved = savedItems(snapshot);
  const runner = useImportRunner(current, isLocked || !isReady);

  // Tells the inbox this screen exists. Closing it (any way out) lets the inbox discard what was left.
  useEffect(() => {
    setScreenOpen(true);
    return () => setScreenOpen(false);
  }, []);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const finished = current === null && saved.length > 0;
  useEffect(() => {
    if (finished) haptics.success();
  }, [finished]);

  // Everything was skipped, or the list was emptied (signed out, discarded): there is nothing left to show.
  const nothingLeft = current === null && saved.length === 0 && snapshot.items.length > 0;
  useEffect(() => {
    if (nothingLeft) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nothingLeft]);

  const openLedger = () => router.dismissTo({ pathname: '/finance', params: { section: 'ledger', at: String(Date.now()) } });

  const rejectedNotes = <RejectedNotes counts={snapshot.rejected} />;

  if (finished) {
    const skipped = snapshot.items.filter((item) => item.status === 'skipped').length;
    return (
      <Screen topInset={false} contentContainerStyle={{ gap: spacing.lg }}>
        <Stack.Screen options={{ title: t('shareImport.title') }} />
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <SuccessCheck size={CHECK * 1.5} accent="finance" accessibilityLabel={null} />
          <Text variant="title" weight="bold" style={{ textAlign: 'center' }} accessibilityRole="header" accessibilityLiveRegion="polite">
            {t('shareImport.done.title', { count: saved.length })}
          </Text>
          <View style={{ gap: spacing.xs, alignSelf: 'stretch' }}>
            {saved.map((item) => (
              <Text key={item.id} variant="body" color="textSecondary" numeric style={{ textAlign: 'center' }} numberOfLines={2}>
                {savedLine(item, t)}
              </Text>
            ))}
          </View>
          {skipped > 0 ? (
            <Text variant="caption" color="textMuted">
              {t('shareImport.done.skipped', { count: skipped })}
            </Text>
          ) : null}
        </Card>
        {rejectedNotes}
        <Button title={t('shareImport.actions.viewLedger')} leftIcon="list-outline" onPress={openLedger} />
        <Button title={t('shareImport.actions.done')} variant="tertiary" onPress={leave} />
      </Screen>
    );
  }

  if (!current) {
    // Android delivered something, but none of it could be opened.
    return (
      <Screen topInset={false} contentContainerStyle={{ gap: spacing.lg }}>
        <Stack.Screen options={{ title: t('shareImport.title') }} />
        <StateBlock icon="images-outline" title={t('shareImport.nothing.title')} body={t('shareImport.nothing.body')} />
        {rejectedNotes}
        <Button title={t('shareImport.actions.close')} variant="tertiary" onPress={leave} />
      </Screen>
    );
  }

  const { index, total } = positionOf(snapshot, current.id);
  const remaining = unfinishedCount(snapshot);
  const skipLabel = remaining > 1 ? t('shareImport.actions.skip') : t('shareImport.actions.close');
  const skip = () => {
    markSkipped(current.id);
  };
  const addByHand = () => {
    // An empty form that is still tied to this screenshot: saving it settles the screenshot, and closing it without
    // saving leaves the same "not saved yet" choice as any other review.
    const draft = manualDraft(current.id);
    markReview(current.id, draft);
    runner.openForm(draft);
  };

  return (
    <Screen topInset={false} contentContainerStyle={{ gap: spacing.lg }}>
      <Stack.Screen options={{ title: t('shareImport.title') }} />

      {total > 1 ? (
        <Text variant="overline" color="textMuted" accessibilityLiveRegion="polite">
          {t('shareImport.counter', { index, total })}
        </Text>
      ) : null}

      {current.fileUri ? (
        <Card variant="flat" padding="sm" style={{ overflow: 'hidden' }}>
          <Image
            source={{ uri: current.fileUri }}
            contentFit="contain"
            style={{ width: '100%', height: PREVIEW_HEIGHT, borderRadius: radius.md }}
            accessibilityLabel={t('shareImport.previewLabel')}
            accessible
          />
        </Card>
      ) : null}

      {current.status === 'staging' ? (
        <Busy title={t('shareImport.receiving.title')} body={t('shareImport.receiving.body')} color={colors.primaryAccent} />
      ) : null}

      {current.status === 'ready' && current.seenBefore && !current.importAgain ? (
        <>
          <StateBlock
            icon="copy-outline"
            title={t(`shareImport.seen.${current.seenBefore}.title`)}
            body={t(`shareImport.seen.${current.seenBefore}.body`)}
          />
          <Button title={t('shareImport.actions.importAnyway')} onPress={() => importAgain(current.id)} />
          <Button title={skipLabel} variant="tertiary" onPress={skip} />
        </>
      ) : null}

      {current.status === 'ready' && !(current.seenBefore && !current.importAgain) ? (
        // Reading starts on its own once the app is unlocked; this is the instant before it does.
        <Busy title={t('shareImport.reading.title')} body={t('shareImport.reading.body')} color={colors.primaryAccent} />
      ) : null}

      {current.status === 'reading' ? (
        <>
          <Busy title={t('shareImport.reading.title')} body={t('shareImport.reading.body')} color={colors.primaryAccent} />
          <Button title={t('shareImport.actions.cancel')} variant="tertiary" onPress={() => runner.cancel(current.id)} />
        </>
      ) : null}

      {current.status === 'review' && current.draft ? (
        <>
          <StateBlock icon="create-outline" title={t('shareImport.review.title')} body={t('shareImport.review.body')} />
          <Button title={t('shareImport.actions.reviewAgain')} onPress={() => runner.openForm(current.draft!)} />
          <Button title={skipLabel} variant="tertiary" onPress={skip} />
        </>
      ) : null}

      {current.status === 'failed' && current.error ? (
        <>
          <StateBlock
            icon={ERROR_ICONS[current.error]}
            tone="error"
            title={t(`shareImport.errors.${current.error}.title`)}
            body={t(`shareImport.errors.${current.error}.body`)}
          />
          {canRetry(current) ? <Button title={t('shareImport.actions.retry')} leftIcon="refresh" onPress={() => retryItem(current.id)} /> : null}
          {current.error !== 'session' ? (
            <Button
              title={t('shareImport.actions.addByHand')}
              variant={canRetry(current) ? 'secondary' : 'primary'}
              leftIcon="create-outline"
              onPress={addByHand}
            />
          ) : null}
          <Button title={skipLabel} variant="tertiary" onPress={skip} />
        </>
      ) : null}

      {rejectedNotes}
    </Screen>
  );
}

function savedLine(item: ShareItem, t: ReturnType<typeof useTranslation<'finance'>>['t']) {
  const amount = formatMoney(item.saved?.amount ?? 0);
  const description = item.saved?.description ?? '';
  return description && description !== NO_DESCRIPTION
    ? t('shareImport.done.entry', { description, amount })
    : t('shareImport.done.entryNoDescription', { amount });
}

function Busy({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" accessibilityLabel={title} style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg }}>
      <ActivityIndicator size="large" color={color} />
      <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {body}
      </Text>
    </View>
  );
}

function StateBlock({ icon, title, body, tone = 'neutral' }: { icon: IconName; title: string; body: string; tone?: 'neutral' | 'error' }) {
  const { colors } = useTheme();
  const error = tone === 'error';
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: ICON_TILE,
          height: ICON_TILE,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: error ? colors.errorContainer : colors.primaryContainer,
        }}>
        <Ionicons name={icon} size={28} color={error ? colors.onErrorContainer : colors.onPrimaryContainer} />
      </View>
      <Text variant="title" weight="bold" style={{ textAlign: 'center' }} accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
        {body}
      </Text>
    </View>
  );
}

/** One line per kind of file that was turned away ("2 shared files aren't JPG, PNG or WebP images..."). */
function RejectedNotes({ counts }: { counts: RejectionCounts }) {
  const { t } = useTranslation('finance');
  if (counts.unsupported + counts.unsafe + counts.tooMany + counts.empty === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {counts.empty > 0 ? (
        <Text variant="caption" color="textMuted">
          {t('shareImport.rejected.empty')}
        </Text>
      ) : null}
      {counts.unsupported > 0 ? (
        <Text variant="caption" color="textMuted">
          {t('shareImport.rejected.unsupported', { count: counts.unsupported })}
        </Text>
      ) : null}
      {counts.unsafe > 0 ? (
        <Text variant="caption" color="textMuted">
          {t('shareImport.rejected.unsafe', { count: counts.unsafe })}
        </Text>
      ) : null}
      {counts.tooMany > 0 ? (
        <Text variant="caption" color="textMuted">
          {t('shareImport.rejected.tooMany', { count: counts.tooMany, max: MAX_ITEMS_PER_SHARE })}
        </Text>
      ) : null}
    </View>
  );
}
