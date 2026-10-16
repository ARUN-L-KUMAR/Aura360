import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

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
import { MODULE_LABEL, extractUrl, hostOf, type Destination, type IngestPreview } from '@/features/saved/types';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

/** How long the "saved" confirmation stays before the screen closes (shorter under reduce-motion, where it does not pop). */
const CONFIRM_MS = 800;
const CONFIRM_REDUCED_MS = 450;

const DESTINATIONS: { value: Destination; label: string }[] = [
  { value: 'auto', label: 'Best fit (AI)' },
  { value: 'saved', label: 'Saved' },
  { value: 'notes', label: 'Notes' },
  { value: 'fashion', label: 'Fashion wishlist' },
];

export default function AddSavedScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { accent, reduceMotion } = useTheme();
  const preview = useLinkPreview();
  const saveLink = useSaveLink();

  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState<Destination>('auto');
  const [result, setResult] = useState<IngestPreview | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  /** Where the link went, once saved: swaps the form for a confirmation, then the screen closes. */
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

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
      setResult(null);
      setUrlError(null);
    } else {
      setUrlError('No link found on your clipboard. Copy one first.');
    }
  }

  async function fetchDetails(nextDestination = destination) {
    const clean = extractUrl(url.trim()) ?? url.trim();
    if (!clean) return setUrlError('Paste or type a link.');
    if (!/^https?:\/\//i.test(clean)) return setUrlError('Enter a link starting with http:// or https://');
    setUrlError(null);
    try {
      setResult(await preview.mutateAsync({ url: clean, destination: nextDestination }));
      setUrl(clean);
    } catch (e) {
      setResult(null);
      notify.error(e);
    }
  }

  async function save() {
    if (!result) return;
    try {
      const saved = await saveLink.mutateAsync({ url: result.url, destination });
      const label = MODULE_LABEL[saved.persistedTo ?? 'saved'] ?? 'Saved';
      // The toast already gives the success haptic; the check is the visual half of the same moment.
      notify.success(`Added to ${label}.`);
      setSavedTo(label);
      closeTimer.current = setTimeout(() => router.back(), reduceMotion ? CONFIRM_REDUCED_MS : CONFIRM_MS);
    } catch (e) {
      notify.error(e);
    }
  }

  function pickDestination(value: Destination) {
    setDestination(value);
    if (result) void fetchDetails(value);
  }

  if (savedTo) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: 'Save a link' }} />
        <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl }}>
          <SuccessCheck size={spacing.xxxl + spacing.xl} accent="saved" accessibilityLabel={null} />
          <Text variant="title">Added to {savedTo}</Text>
        </View>
      </Screen>
    );
  }

  const resolvedLabel = result ? (MODULE_LABEL[result.resolvedDestination] ?? 'Saved') : null;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Save a link' }} />

      <View style={{ gap: spacing.md }}>
        <Input
          label="Link"
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (urlError) setUrlError(null);
            if (result) setResult(null);
          }}
          error={urlError}
          placeholder="https://example.com/article"
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
            <Button title="Paste" variant="secondary" leftIcon="clipboard-outline" onPress={paste} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Preview" leftIcon="search" onPress={() => fetchDetails()} loading={preview.isPending} />
          </View>
        </View>
      </View>

      {preview.isPending && !result ? <SkeletonCard media lines={2} /> : null}

      {result ? (
        <>
          <Card padding="none" style={{ overflow: 'hidden' }}>
            {result.image ? <Thumbnail uri={result.image} /> : null}
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Text variant="title" numberOfLines={3}>
                {result.title}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                {hostOf(result.url) ? <Tag label={hostOf(result.url) ?? ''} accent="saved" icon="link-outline" /> : null}
                {result.type ? <Tag label={result.type} tone="neutral" /> : null}
              </View>
              {result.description ? (
                <Text variant="body" color="textSecondary" numberOfLines={3}>
                  {result.description}
                </Text>
              ) : null}
            </View>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color="textSecondary">
              Save to
            </Text>
            <ChipGroup>
              {DESTINATIONS.map((option) => (
                <Chip key={option.value} label={option.label} accent="saved" selected={destination === option.value} onPress={() => pickDestination(option.value)} />
              ))}
            </ChipGroup>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="sparkles" size={14} color={accent('ai').text} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {destination === 'auto' ? `Suggested: ${resolvedLabel} (${Math.round(result.confidence * 100)}% match)` : `Saving directly to ${resolvedLabel}`}
              </Text>
            </View>
          </View>

          <Button title={`Save to ${resolvedLabel}`} leftIcon="bookmark" onPress={save} loading={saveLink.isPending} />
        </>
      ) : null}

      <Button title="Enter details manually instead" variant="ghost" onPress={() => router.replace('/saved/item')} />
    </Screen>
  );
}
