import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { parseTags } from '@/features/notes/types';
import { useDeleteSavedItem, useSaveSavedItem } from '@/features/saved/hooks';
import { SAVED_TYPES, type SavedItem, type SavedType } from '@/features/saved/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

function parseItem(raw?: string): SavedItem | null {
  try {
    return raw ? (JSON.parse(raw) as SavedItem) : null;
  } catch {
    return null;
  }
}

export default function SavedItemScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ item?: string }>();
  const existing = useMemo(() => parseItem(params.item), [params.item]);

  const [type, setType] = useState<SavedType>(existing?.type ?? 'article');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(', '));
  const [isFavorite, setIsFavorite] = useState(!!existing?.isFavorite);
  const [error, setError] = useState<string | null>(null);

  const save = useSaveSavedItem();
  const remove = useDeleteSavedItem();

  async function submit() {
    if (!title.trim()) return setError('Give it a title.');
    const cleanUrl = url.trim();
    if (cleanUrl && !/^https?:\/\/\S+$/i.test(cleanUrl)) return setError('The link must start with http:// or https://');

    setError(null);
    const tags = parseTags(tagsText);
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          type,
          title: title.trim(),
          url: cleanUrl || null,
          description: description.trim() || null,
          tags: tags.length > 0 ? tags : null,
          isFavorite,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this item?', existing.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(existing.id);
            router.back();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit saved item' : 'Add saved item' }} />

      {/* Type Selector */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <Text variant="label" muted>
          Content Type
        </Text>
        <ChipGroup>
          {SAVED_TYPES.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={type === option.value}
              color={moduleColors.saved}
              onPress={() => setType(option.value)}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {/* Details Inputs */}
      <GlassCard
        glowColor={moduleColors.saved}
        style={{
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Title or article headline" autoFocus={!existing} style={{ fontSize: 18, fontWeight: '700' }} />
        <Input label="Web Link (optional)" value={url} onChangeText={setUrl} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Input label="Description (optional)" value={description} onChangeText={setDescription} multiline placeholder="Key takeaways, highlights…" style={{ minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.md }} />
        <Input label="Tags (optional)" value={tagsText} onChangeText={setTagsText} placeholder="tech, reading, design" autoCapitalize="none" />
      </GlassCard>

      {/* Favorite Toggle Card */}
      <GlassCard style={{ padding: spacing.md }}>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isFavorite }}
          onPress={() => setIsFavorite(!isFavorite)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? colors.danger : colors.textMuted} />
            <Text style={{ fontWeight: '600' }}>Mark as Favourite</Text>
          </View>
          <Switch
            value={isFavorite}
            onValueChange={setIsFavorite}
            trackColor={{ false: colors.border, true: moduleColors.saved }}
          />
        </Pressable>
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

      <Button title={existing ? 'Save changes' : 'Add to saved'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete item" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
