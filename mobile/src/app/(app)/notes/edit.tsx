import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteNote, useNotes, useSaveNote } from '@/features/notes/hooks';
import { checklistOf, newItemId, parseTags, type ChecklistItem, type Note } from '@/features/notes/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type Mode = 'text' | 'checklist';

function parseNote(raw?: string): Note | null {
  try {
    return raw ? (JSON.parse(raw) as Note) : null;
  } catch {
    return null;
  }
}

export default function NoteEditorScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ note?: string }>();
  const existing = useMemo(() => parseNote(params.note), [params.note]);
  const existingChecklist = existing ? checklistOf(existing) : null;
  const notes = useNotes();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [mode, setMode] = useState<Mode>(existingChecklist ? 'checklist' : 'text');
  const [content, setContent] = useState(existing?.content ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(existingChecklist ?? []);
  const [category, setCategory] = useState(existing?.category ?? '');
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  const itemRefs = useRef<Record<string, TextInput | null>>({});
  const save = useSaveNote();
  const remove = useDeleteNote();

  const knownCategories = useMemo(
    () => [...new Set((notes.data ?? []).map((note) => note.category).filter((c): c is string => !!c))].sort(),
    [notes.data]
  );

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === 'checklist') {
      const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
      setItems(items.length > 0 ? items : lines.map((text) => ({ id: newItemId(), text, completed: false })));
    } else {
      setContent(items.length > 0 ? items.map((item) => item.text).join('\n') : content);
    }
    setMode(next);
  }

  function addItem(afterId?: string) {
    const item: ChecklistItem = { id: newItemId(), text: '', completed: false };
    setItems((current) => {
      if (!afterId) return [...current, item];
      const index = current.findIndex((entry) => entry.id === afterId);
      return [...current.slice(0, index + 1), item, ...current.slice(index + 1)];
    });
    setTimeout(() => itemRefs.current[item.id]?.focus(), 50);
  }

  async function submit() {
    if (!title.trim()) return setError('Give your note a title.');
    const cleanedItems = items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text);
    if (mode === 'checklist' && cleanedItems.length === 0) return setError('Add at least one item, or switch to a text note.');

    setError(null);
    const tags = parseTags(tagsText);
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          title: title.trim(),
          content: mode === 'checklist' ? '' : content.trim(),
          category: category.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          metadata: { ...(existing?.metadata ?? {}), checklist: mode === 'checklist' ? cleanedItems : undefined },
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this note?', existing.title, [
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
      <Stack.Screen options={{ title: existing ? 'Edit note' : 'New note' }} />

      {/* Title & Mode Switcher */}
      <GlassCard
        glowColor={moduleColors.notes}
        style={{
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Note title…"
          autoFocus={!existing}
          returnKeyType="next"
          style={{ fontSize: 20, fontWeight: '700' }}
        />

        <Segmented
          options={[
            { value: 'text', label: 'Rich Text' },
            { value: 'checklist', label: 'Checklist' },
          ]}
          value={mode}
          onChange={switchMode}
        />
      </GlassCard>

      {/* Editor Body */}
      {mode === 'text' ? (
        <GlassCard style={{ padding: spacing.md }}>
          <Input
            value={content}
            onChangeText={setContent}
            placeholder="Type your thoughts, ideas, markdown…"
            multiline
            style={{
              minHeight: 220,
              textAlignVertical: 'top',
              paddingTop: spacing.md,
              borderWidth: 0,
              backgroundColor: 'transparent',
              fontSize: 16,
              lineHeight: 24,
            }}
          />
        </GlassCard>
      ) : (
        <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
          {items.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                onPress={() => setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, completed: !entry.completed } : entry)))}
                hitSlop={8}>
                <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={24} color={item.completed ? moduleColors.notes : colors.textMuted} />
              </Pressable>
              <TextInput
                ref={(node) => {
                  itemRefs.current[item.id] = node;
                }}
                value={item.text}
                onChangeText={(text) => setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, text } : entry)))}
                placeholder="List item…"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => addItem(item.id)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(34, 48, 65, 0.7)' : colors.border,
                  backgroundColor: isDark ? 'rgba(18, 26, 36, 0.7)' : colors.card,
                  color: colors.text,
                  fontSize: 15,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                }}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Remove item" onPress={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => addItem()}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingVertical: spacing.sm,
            }}>
            <Ionicons name="add-circle-outline" size={20} color={moduleColors.notes} />
            <Text variant="label" style={{ fontWeight: '600', color: moduleColors.notes }}>
              Add Checklist Item
            </Text>
          </Pressable>
        </GlassCard>
      )}

      {/* Category & Tags Card */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Input label="Category (optional)" value={category} onChangeText={setCategory} placeholder="e.g. Work, Ideas, Personal" />
          {knownCategories.length > 0 && !category ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xs }}>
              {knownCategories.slice(0, 6).map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  onPress={() => setCategory(name)}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                    backgroundColor: isDark ? 'rgba(34, 48, 65, 0.6)' : colors.cardMuted,
                  }}>
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Input label="Tags (optional)" value={tagsText} onChangeText={setTagsText} placeholder="ideas, roadmap, client" autoCapitalize="none" />
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

      <Button title={existing ? 'Save changes' : 'Create note'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete note" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
