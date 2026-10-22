import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { friendlyError } from '@/components/notes/friendly-error';
import { Thumbnail } from '@/components/notes/thumbnail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useLinkPreview, useSaveLink } from '@/features/saved/hooks';
import { extractUrl, hostOf, isSavedType, placeOf, productFacts, type Destination, type IngestPreview, type PlaceKey } from '@/features/saved/types';
import { acknowledgeLink, usePendingLink } from '@/features/share-import/link-inbox';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

/** How long the "saved" confirmation stays before the screen closes (shorter under reduce-motion, where it does not pop). */
const CONFIRM_MS = 800;
const CONFIRM_REDUCED_MS = 450;

const DESTINATIONS: Destination[] = ['auto', 'saved', 'notes', 'fashion'];

export default function AddSavedScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('saved');
  const { accent, reduceMotion } = useTheme();
  const preview = useLinkPreview();
  const saveLink = useSaveLink();

  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState<Destination>('auto');
  const [result, setResult] = useState<IngestPreview | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  /** Where the link went, once saved: swaps the form for a confirmation, then the screen closes. */
  const [savedTo, setSavedTo] = useState<PlaceKey | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The words a link was shared with ("Check out ... on Flipkart"): the server's fallback name if the shop cannot be read. */
  const sharedHint = useRef<string | null>(null);
  /** A link another app has just shared (a product from Amazon, Flipkart, Myntra ...). */
  const sharedLink = usePendingLink();

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // A shared link is taken over once: the fields are set while rendering (so there is no flash of the old content), then it
  // is read straight away so the person only has to check it and save.
  const [takenLink, setTakenLink] = useState<number | null>(null);
  if (sharedLink && sharedLink.id !== takenLink) {
    setTakenLink(sharedLink.id);
    setResult(null);
    setDestination('auto');
    setUrl(sharedLink.url ?? '');
    setUrlError(sharedLink.url ? null : t('add.errors.sharedNoLink'));
  }
  useEffect(() => {
    if (!sharedLink) return;
    sharedHint.current = sharedLink.hint;
    acknowledgeLink(sharedLink.id);
    if (sharedLink.url) void fetchDetails('auto', sharedLink.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per shared link; fetchDetails is rebuilt on every render.
  }, [sharedLink?.id]);

  const fail = (e: unknown, message: string) => notify.error(friendlyError(e, message, t('errors.offline')));
  const destinationLabel = (value: Destination) => (value === 'auto' ? t('add.destination.auto') : t(`place.${value}`));

  async function paste() {
    let text = '';
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      // clipboard unavailable: handled as "nothing found" below
    }
    const found = extractUrl(text);
    if (found) {
      setUrl(found);
      sharedHint.current = null;
      setResult(null);
      setUrlError(null);
    } else {
      setUrlError(t('add.errors.noLink'));
    }
  }

  async function fetchDetails(nextDestination = destination, from = url) {
    const clean = extractUrl(from.trim()) ?? from.trim();
    if (!clean) return setUrlError(t('add.errors.empty'));
    if (!/^https?:\/\//i.test(clean)) return setUrlError(t('add.errors.scheme'));
    setUrlError(null);
    try {
      setResult(await preview.mutateAsync({ url: clean, destination: nextDestination, hintTitle: sharedHint.current }));
      setUrl(clean);
    } catch (e) {
      setResult(null);
      fail(e, t('add.errors.preview'));
    }
  }

  async function save() {
    if (!result) return;
    try {
      const saved = await saveLink.mutateAsync({ url: result.url, destination, hintTitle: sharedHint.current });
      const place = placeOf(saved.persistedTo);
      analytics.track('link_saved');
      // The toast already gives the success haptic; the check is the visual half of the same moment.
      notify.success(t('add.added', { place: t(`place.${place}`) }));
      setSavedTo(place);
      closeTimer.current = setTimeout(() => router.back(), reduceMotion ? CONFIRM_REDUCED_MS : CONFIRM_MS);
    } catch (e) {
      fail(e, t('add.errors.save'));
    }
  }

  function pickDestination(value: Destination) {
    setDestination(value);
    if (result) void fetchDetails(value);
  }

  if (savedTo) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: t('add.title') }} />
        <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl }}>
          <SuccessCheck size={spacing.xxxl + spacing.xl} accent="saved" accessibilityLabel={null} />
          <Text variant="title" accessibilityRole="header">
            {t('add.added', { place: t(`place.${savedTo}`) })}
          </Text>
        </View>
      </Screen>
    );
  }

  const resolvedPlace = result ? t(`place.${placeOf(result.resolvedDestination)}`) : '';
  const matchPercent = result ? new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(result.confidence) : '';
  const resultHost = result ? hostOf(result.url) : null;
  const resultType = result ? t(`type.${isSavedType(result.type) ? result.type : 'other'}`) : '';
  const facts = result ? productFacts(result.metadata, placeOf(result.resolvedDestination)) : null;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t('add.title') }} />

      <View style={{ gap: spacing.md }}>
        <Input
          label={t('add.link.label')}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (urlError) setUrlError(null);
            if (result) setResult(null);
            sharedHint.current = null;
          }}
          error={urlError}
          placeholder={t('add.link.placeholder')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="url"
          textContentType="URL"
          returnKeyType="go"
          clearable
          onSubmitEditing={() => fetchDetails()}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title={t('add.paste')} variant="secondary" leftIcon="clipboard-outline" onPress={paste} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={t('add.preview')} leftIcon="search" onPress={() => fetchDetails()} loading={preview.isPending} />
          </View>
        </View>
      </View>

      {preview.isPending && !result ? (
        <View accessible accessibilityLabel={t('add.loading')} accessibilityLiveRegion="polite">
          <SkeletonCard media lines={2} />
        </View>
      ) : null}

      {result ? (
        <>
          <Card padding="none" style={{ overflow: 'hidden' }}>
            {result.image ? <Thumbnail uri={result.image} /> : null}
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="title" numberOfLines={3}>
                {result.title}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                {resultHost ? <Tag label={resultHost} accent="saved" icon="link-outline" /> : null}
                {result.type ? <Tag label={resultType} tone="neutral" /> : null}
                {facts?.price ? <Tag label={formatMoney(facts.price)} tone="neutral" icon="pricetag-outline" /> : null}
                {facts?.category ? <Tag label={facts.category} accent="saved" icon="grid-outline" /> : null}
              </View>
              {result.description ? (
                <Text variant="body" color="textSecondary" numberOfLines={3}>
                  {result.description}
                </Text>
              ) : null}
            </View>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color="textSecondary" accessibilityRole="header">
              {t('add.saveTo')}
            </Text>
            <ChipGroup>
              {DESTINATIONS.map((option) => (
                <Chip key={option} label={destinationLabel(option)} accent="saved" selected={destination === option} onPress={() => pickDestination(option)} />
              ))}
            </ChipGroup>
            <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="sparkles" size={14} color={accent('ai').text} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {destination === 'auto' ? t('add.suggested', { place: resolvedPlace, match: matchPercent }) : t('add.direct', { place: resolvedPlace })}
              </Text>
            </View>
          </View>

          <Button title={t('add.saveButton', { place: resolvedPlace })} leftIcon="bookmark" onPress={save} loading={saveLink.isPending} />
        </>
      ) : null}

      <Button title={t('add.manual')} variant="ghost" onPress={() => router.replace({ pathname: '/saved/item', params: url.trim() ? { url: extractUrl(url.trim()) ?? url.trim() } : {} })} />
    </Screen>
  );
}
