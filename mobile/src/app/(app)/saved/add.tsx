import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useLinkPreview, useSaveLink } from '@/features/saved/hooks';
import { MODULE_LABEL, extractUrl, hostOf, type Destination, type IngestPreview } from '@/features/saved/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const DESTINATIONS: { value: Destination; label: string }[] = [
  { value: 'auto', label: 'Best fit (AI)' },
  { value: 'saved', label: 'Saved' },
  { value: 'notes', label: 'Notes' },
  { value: 'fashion', label: 'Fashion Wishlist' },
];

export default function AddSavedScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const preview = useLinkPreview();
  const saveLink = useSaveLink();

  const [url, setUrl] = useState('');
  const [destination, setDestination] = useState<Destination>('auto');
  const [result, setResult] = useState<IngestPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function paste() {
    const text = await Clipboard.getStringAsync();
    const found = extractUrl(text);
    if (found) {
      setUrl(found);
      setResult(null);
      setError(null);
    } else {
      setError('No valid link found on your clipboard.');
    }
  }

  async function fetchDetails(nextDestination = destination) {
    const clean = extractUrl(url.trim()) ?? url.trim();
    if (!/^https?:\/\//i.test(clean)) return setError('Enter a link starting with http:// or https://');
    setError(null);
    try {
      setResult(await preview.mutateAsync({ url: clean, destination: nextDestination }));
      setUrl(clean);
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : 'Could not fetch metadata for that URL.');
    }
  }

  async function save() {
    if (!result) return;
    setError(null);
    try {
      const saved = await saveLink.mutateAsync({ url: result.url, destination });
      Alert.alert('Saved', `Added to ${MODULE_LABEL[saved.persistedTo ?? 'saved'] ?? 'Saved'}.`);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function pickDestination(value: Destination) {
    setDestination(value);
    if (result) void fetchDetails(value);
  }

  const resolvedLabel = result ? MODULE_LABEL[result.resolvedDestination] ?? 'Saved' : null;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Save a link' }} />

      {/* URL Input & Quick Paste */}
      <GlassCard
        glowColor={moduleColors.saved}
        style={{
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="URL Address"
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (result) setResult(null);
          }}
          placeholder="https://example.com/article"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => fetchDetails()}
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Paste" variant="secondary" onPress={paste} />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Inspect Link" onPress={() => fetchDetails()} loading={preview.isPending} />
          </View>
        </View>
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Metadata Preview Result Card */}
      {result ? (
        <>
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {result.image ? (
              <Image
                source={{ uri: result.image }}
                style={{ width: '100%', height: 180, backgroundColor: colors.cardMuted }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View style={{ padding: spacing.lg, gap: spacing.xs }}>
              <Text variant="heading" numberOfLines={3}>
                {result.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                <View
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                    backgroundColor: `${moduleColors.saved}20`,
                  }}>
                  <Text variant="caption" style={{ color: moduleColors.saved, fontWeight: '700' }}>
                    {hostOf(result.url)}
                  </Text>
                </View>
                {result.type ? (
                  <Text variant="caption" muted>
                    · {result.type}
                  </Text>
                ) : null}
              </View>
              {result.description ? (
                <Text muted numberOfLines={3} style={{ marginTop: spacing.xs }}>
                  {result.description}
                </Text>
              ) : null}
            </View>
          </GlassCard>

          {/* Destination Selector */}
          <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
            <Text variant="label" muted>
              Save Destination
            </Text>
            <ChipGroup>
              {DESTINATIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={destination === option.value}
                  color={moduleColors.saved}
                  onPress={() => pickDestination(option.value)}
                />
              ))}
            </ChipGroup>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs }}>
              <Ionicons name="sparkles" size={14} color={moduleColors.ai} />
              <Text variant="caption" muted>
                {destination === 'auto'
                  ? `AI predicts destination: ${resolvedLabel} (${Math.round(result.confidence * 100)}% match)`
                  : `Saving directly to ${resolvedLabel}`}
              </Text>
            </View>
          </GlassCard>

          <Button title={`Save to ${resolvedLabel}`} onPress={save} loading={saveLink.isPending} />
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/saved/item')}
        hitSlop={8}
        style={{ alignSelf: 'center', paddingVertical: spacing.sm }}>
        <Text variant="label" muted style={{ textDecorationLine: 'underline' }}>
          Enter details manually instead
        </Text>
      </Pressable>
    </Screen>
  );
}
