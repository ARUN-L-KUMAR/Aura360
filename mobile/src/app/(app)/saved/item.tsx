import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Linking, View, type TextInput } from 'react-native';

import { friendlyError } from '@/components/notes/friendly-error';
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
import { SAVED_TYPES, hostOf, isSavedType, type SavedItem, type SavedType } from '@/features/saved/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
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
  const { t } = useTranslation('saved');
  const params = useLocalSearchParams<{ item?: string; url?: string }>();
  const existing = useMemo(() => parseItem(params.item), [params.item]);

  const [type, setType] = useState<SavedType>(existing?.type ?? 'article');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [url, setUrl] = useState(existing?.url ?? params.url ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(', '));
  const [isFavorite, setIsFavorite] = useState(!!existing?.isFavorite);
  const [showProblems, setShowProblems] = useState(false);

  const urlRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const { mutateAsync: saveItem, isPending: saving } = useSaveSavedItem();
  const { mutateAsync: deleteItem, isPending: deleting } = useDeleteSavedItem();

  const cleanUrl = url.trim();
  const titleError = showProblems && !title.trim() ? t('item.titleField.error') : null;
  const urlError = showProblems && cleanUrl && !URL_PATTERN.test(cleanUrl) ? t('item.url.error') : null;
  const host = hostOf(existing?.url ?? null);

  const fail = (e: unknown, message: string) => notify.error(friendlyError(e, message, t('errors.offline')));

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
      if (!existing) analytics.track('link_saved');
      notify.success(existing ? t('item.toast.saved') : t('item.toast.created'));
      router.back();
    } catch (e) {
      fail(e, t('errors.save'));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({ title: t('item.confirmDelete.title'), message: existing.title, confirmLabel: t('item.confirmDelete.confirm'), destructive: true });
    if (!ok) return;
    try {
      await deleteItem(existing.id);
      analytics.track('link_removed');
      notify.success(t('item.toast.deleted'));
      router.back();
    } catch (e) {
      fail(e, t('errors.removeFromDetails'));
    }
  }

  async function openLink() {
    if (!existing?.url) return;
    try {
      await Linking.openURL(existing.url);
    } catch {
      notify.error(t('errors.openLink'));
    }
  }

  async function copyLink() {
    if (!existing?.url) return;
    try {
      await Clipboard.setStringAsync(existing.url);
      notify.success(t('item.copied'));
    } catch {
      notify.error(t('errors.copyLink'));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('item.titleEdit') : t('item.titleNew') }} />

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
                <Tag label={t(`type.${isSavedType(existing.type) ? existing.type : 'other'}`)} tone="neutral" />
              </View>
            </View>
            {existing.url ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title={t('item.open')} size="sm" leftIcon="open-outline" onPress={openLink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('item.copy')} size="sm" variant="secondary" leftIcon="copy-outline" onPress={copyLink} />
                </View>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color="textSecondary" accessibilityRole="header">
          {t('item.type')}
        </Text>
        <ChipGroup>
          {SAVED_TYPES.map((option) => (
            <Chip key={option} label={t(`type.${option}`)} accent="saved" selected={type === option} onPress={() => setType(option)} />
          ))}
        </ChipGroup>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('item.titleField.label')}
          value={title}
          onChangeText={setTitle}
          error={titleError}
          placeholder={t('item.titleField.placeholder')}
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => urlRef.current?.focus()}
        />
        <Input
          ref={urlRef}
          label={t('item.url.label')}
          value={url}
          onChangeText={setUrl}
          error={urlError}
          placeholder={t('item.url.placeholder')}
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
          label={t('item.description.label')}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t('item.description.placeholder')}
          style={{ minHeight: spacing.xxxl * 2 }}
        />
        <Input
          label={t('item.tags.label')}
          helper={t('item.tags.helper')}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder={t('item.tags.placeholder')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      <Card padding="sm">
        <ToggleRow
          accent="saved"
          icon={isFavorite ? 'heart' : 'heart-outline'}
          label={t('item.favourite.label')}
          description={t('item.favourite.description')}
          value={isFavorite}
          onChange={setIsFavorite}
        />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? t('item.save') : t('item.create')} leftIcon="checkmark" onPress={submit} loading={saving} />
        {existing ? <Button title={t('item.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={deleting} /> : null}
      </View>
    </Screen>
  );
}
