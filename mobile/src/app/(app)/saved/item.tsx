import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, View, type TextInput } from 'react-native';

import { Thumbnail } from '@/components/notes/thumbnail';
import { ToggleRow } from '@/components/notes/toggle-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { parseTags } from '@/features/notes/types';
import { useDeleteSavedItem, useSaveSavedItem } from '@/features/saved/hooks';
import { SAVED_TYPES, hostOf, type SavedItem, type SavedType } from '@/features/saved/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

function parseItem(raw?: string): SavedItem | null {
  try {
    return raw ? (JSON.parse(raw) as SavedItem) : null;
  } catch {
    return null;
  }
}

const URL_PATTERN = /^https?:\/\/\S+$/i;

export default function SavedItemScreen() {
  const router = useRouter();
  const notify = useNotify();
  const params = useLocalSearchParams<{ item?: string }>();
  const existing = useMemo(() => parseItem(params.item), [params.item]);

  const [type, setType] = useState<SavedType>(existing?.type ?? 'article');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(', '));
  const [isFavorite, setIsFavorite] = useState(!!existing?.isFavorite);
  const [showProblems, setShowProblems] = useState(false);

  const urlRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const { mutateAsync: saveItem, isPending: saving } = useSaveSavedItem();
  const { mutateAsync: deleteItem, isPending: deleting } = useDeleteSavedItem();

  const cleanUrl = url.trim();
  const titleError = showProblems && !title.trim() ? 'Give it a title.' : null;
  const urlError = showProblems && cleanUrl && !URL_PATTERN.test(cleanUrl) ? 'The link must start with http:// or https://' : null;
  const host = hostOf(existing?.url ?? null);

  async function submit() {
    if (!title.trim() || (cleanUrl && !URL_PATTERN.test(cleanUrl))) {
      setShowProblems(true);
      haptics.warning();
      return;
    }
    const tags = parseTags(tagsText);
    try {
      await saveItem({
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
      notify.success(existing ? 'Changes saved' : 'Added to saved');
      router.back();
    } catch (e) {
      notify.error(e);
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({ title: 'Delete this item?', message: existing.title, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteItem(existing.id);
      notify.success('Item deleted');
      router.back();
    } catch (e) {
      notify.error(e);
    }
  }

  async function openLink() {
    if (!existing?.url) return;
    try {
      await Linking.openURL(existing.url);
    } catch {
      notify.error("Can't open this link.");
    }
  }

  async function copyLink() {
    if (!existing?.url) return;
    try {
      await Clipboard.setStringAsync(existing.url);
      notify.success('Link copied');
    } catch {
      notify.error("Couldn't copy the link.");
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Saved item' : 'Add saved item' }} />

      {existing ? (
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {existing.imageUrl ? <Thumbnail uri={existing.imageUrl} /> : null}
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <Text variant="title" numberOfLines={3}>
                {existing.title}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
                {host ? <Tag label={host} accent="saved" icon="link-outline" /> : null}
                <Tag label={SAVED_TYPES.find((t) => t.value === existing.type)?.label ?? 'Other'} tone="neutral" />
              </View>
            </View>
            {existing.url ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title="Open link" size="sm" leftIcon="open-outline" onPress={openLink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Copy link" size="sm" variant="secondary" leftIcon="copy-outline" onPress={copyLink} />
                </View>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color="textSecondary">
          Type
        </Text>
        <ChipGroup>
          {SAVED_TYPES.map((option) => (
            <Chip key={option.value} label={option.label} accent="saved" selected={type === option.value} onPress={() => setType(option.value)} />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          error={titleError}
          placeholder="Title or headline"
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => urlRef.current?.focus()}
        />
        <Input
          ref={urlRef}
          label="Link (optional)"
          value={url}
          onChangeText={setUrl}
          error={urlError}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="url"
          textContentType="URL"
          returnKeyType="next"
          clearable
          onSubmitEditing={() => descriptionRef.current?.focus()}
        />
        <Input
          ref={descriptionRef}
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Key takeaways, highlights…"
          style={{ minHeight: spacing.xxxl * 2 }}
        />
        <Input
          label="Tags (optional)"
          helper="Separate tags with commas."
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="tech, reading, design"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      <Card padding="sm">
        <ToggleRow accent="saved" icon={isFavorite ? 'heart' : 'heart-outline'} label="Favourite" description="Show it under Favourites." value={isFavorite} onChange={setIsFavorite} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? 'Save changes' : 'Add to saved'} leftIcon="checkmark" onPress={submit} loading={saving} />
        {existing ? <Button title="Delete item" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={deleting} /> : null}
      </View>
    </Screen>
  );
}
