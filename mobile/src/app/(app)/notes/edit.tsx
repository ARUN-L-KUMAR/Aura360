import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { friendlyError } from '@/components/notes/friendly-error';
import { ToggleRow } from '@/components/notes/toggle-row';
import { useLatest } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteNote, useNotes, useSaveNote } from '@/features/notes/hooks';
import { checklistOf, newItemId, parseTags, type ChecklistItem, type Note, type NoteInput } from '@/features/notes/types';
import { useTranslation } from '@/i18n';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, spring, useTheme } from '@/theme';

type Mode = 'text' | 'checklist';

/** Edits to an existing note are saved this long after the last keystroke. */
const AUTOSAVE_MS = 1500;
/** While offline, try again this often (until the screen closes). */
const RETRY_MS = 10_000;

type Form = {
  title: string;
  mode: Mode;
  content: string;
  items: ChecklistItem[];
  category: string;
  tagsText: string;
  isPinned: boolean;
  isArchived: boolean;
};

function parseNote(raw?: string): Note | null {
  try {
    return raw ? (JSON.parse(raw) as Note) : null;
  } catch {
    return null;
  }
}

const cleanItems = (items: ChecklistItem[]) => items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text);

/** Why the form cannot be saved yet (the field it belongs to; its message is `editor.problem.<field>`), or null. */
function problemWith(form: Form): 'title' | 'items' | null {
  if (!form.title.trim()) return 'title';
  if (form.mode === 'checklist' && cleanItems(form.items).length === 0) return 'items';
  return null;
}

/** What the API gets. Same fields as before; pin / archive are sent for existing notes, and for new ones only when on. */
function toInput(form: Form, existing: Note | null): NoteInput {
  const tags = parseTags(form.tagsText);
  return {
    title: form.title.trim(),
    content: form.mode === 'checklist' ? '' : form.content.trim(),
    category: form.category.trim() || undefined,
    tags: tags.length > 0 ? tags : undefined,
    metadata: { ...(existing?.metadata ?? {}), checklist: form.mode === 'checklist' ? cleanItems(form.items) : undefined },
    ...(existing || form.isPinned ? { isPinned: form.isPinned } : {}),
    ...(existing || form.isArchived ? { isArchived: form.isArchived } : {}),
  };
}

type Failure = { kind: 'offline' | 'error'; key: string };

export default function NoteEditorScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('notes');
  const { colors, accent } = useTheme();
  const a = accent('notes');
  const params = useLocalSearchParams<{ note?: string }>();
  const existing = useMemo(() => parseNote(params.note), [params.note]);
  const existingChecklist = existing ? checklistOf(existing) : null;
  const notes = useNotes();
  const { mutateAsync: saveNote, isPending: creating } = useSaveNote();
  const { mutateAsync: deleteNote, isPending: deleting } = useDeleteNote();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [mode, setMode] = useState<Mode>(existingChecklist ? 'checklist' : 'text');
  const [content, setContent] = useState(existing?.content ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(existingChecklist ?? []);
  const [category, setCategory] = useState(existing?.category ?? '');
  const [tagsText, setTagsText] = useState((existing?.tags ?? []).join(', '));
  const [isPinned, setIsPinned] = useState(!!existing?.isPinned);
  const [isArchived, setIsArchived] = useState(!!existing?.isArchived);
  const [showProblems, setShowProblems] = useState(false);

  const itemRefs = useRef<Record<string, TextInput | null>>({});
  const bodyRef = useRef<TextInput>(null);

  const form: Form = { title, mode, content, items, category, tagsText, isPinned, isArchived };
  const formKey = JSON.stringify(toInput(form, existing));
  const problem = problemWith(form);
  const problemMessage = problem ? t(`editor.problem.${problem}`) : null;

  // Autosave bookkeeping (existing notes only). `savedKey` is the form as last stored on the server.
  const [savedKey, setSavedKey] = useState<string | null>(() => (existing ? formKey : null));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const inFlight = useRef<Promise<'saved' | 'skipped' | 'failed'> | null>(null);
  const lastError = useRef<unknown>(null);
  /** True once the note is being deleted or has been saved and closed: nothing more may be sent. */
  const finished = useRef(false);
  /** Whether the server has this note archived: so `note_archived` is sent once, when an autosave archives it. */
  const archivedOnServer = useRef(!!existing?.isArchived);
  const latest = useLatest({ form, formKey, problem, savedKey });

  const persist = useCallback(async (): Promise<'saved' | 'skipped' | 'failed'> => {
    if (!existing) return 'skipped';
    while (inFlight.current) await inFlight.current;
    const current = latest.current;
    if (finished.current || current.problem || current.formKey === current.savedKey) return 'skipped';

    const run = (async () => {
      setSaving(true);
      try {
        await saveNote({ id: existing.id, input: toInput(current.form, existing) });
        setSavedKey(current.formKey);
        setFailure(null);
        if (current.form.isArchived && !archivedOnServer.current) analytics.track('note_archived');
        archivedOnServer.current = current.form.isArchived;
        return 'saved' as const;
      } catch (e) {
        lastError.current = e;
        setFailure({ kind: e instanceof ApiError && e.isNetwork ? 'offline' : 'error', key: current.formKey });
        return 'failed' as const;
      } finally {
        setSaving(false);
      }
    })();
    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [existing, latest, saveNote]);

  const failed = failure && failure.key === formKey ? failure.kind : null;
  const dirty = !!existing && formKey !== savedKey;

  // Debounced autosave: restarts on every edit. A server rejection waits for the next edit; offline retries slowly.
  useEffect(() => {
    if (!existing || problem || formKey === savedKey || saving || failed === 'error') return;
    const timer = setTimeout(() => void persist(), failed === 'offline' ? RETRY_MS : AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [existing, problem, formKey, savedKey, saving, failed, persist]);

  // Leaving with edits still waiting: save them now instead of dropping them.
  useEffect(
    () => () => {
      if (!existing || finished.current) return;
      void persist().then((result) => {
        if (result === 'failed') notify.error(t('errors.lastChanges'));
      });
    },
    [existing, persist, notify, t],
  );

  const knownCategories = useMemo(
    () => [...new Set((notes.data ?? []).map((note) => note.category).filter((c): c is string => !!c))].sort(),
    [notes.data],
  );
  const knownTags = useMemo(() => [...new Set((notes.data ?? []).flatMap((note) => note.tags ?? []))].sort(), [notes.data]);
  const tags = parseTags(tagsText);
  const suggestedTags = knownTags.filter((tag) => !tags.includes(tag)).slice(0, 8);

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

  const updateItem = (id: string, change: Partial<ChecklistItem>) => setItems((current) => current.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)));

  function setTags(next: string[]) {
    setTagsText(next.join(', '));
  }

  /** A friendly toast for a failed action: offline copy when the server was unreachable, never raw server text. */
  const fail = (e: unknown, message: string) => notify.error(friendlyError(e, message, t('errors.offline')));

  async function submit() {
    if (problem) {
      setShowProblems(true);
      haptics.warning();
      return;
    }
    if (existing) {
      const result = await persist();
      if (result === 'failed') {
        fail(lastError.current, t('errors.save'));
        return;
      }
    } else {
      try {
        await saveNote({ input: toInput(form, null) });
      } catch (e) {
        fail(e, t('errors.save'));
        return;
      }
      analytics.track('note_created');
    }
    finished.current = true;
    notify.success(existing ? t('editor.toast.saved') : t('editor.toast.created'));
    router.back();
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({ title: t('editor.confirmDelete.title'), message: existing.title, confirmLabel: t('editor.confirmDelete.confirm'), destructive: true });
    if (!ok) return;
    finished.current = true; // stop autosave from racing the delete
    try {
      await deleteNote(existing.id);
      analytics.track('note_deleted');
      notify.success(t('editor.toast.deleted'));
      router.back();
    } catch (e) {
      finished.current = false;
      fail(e, t('errors.deleteFromEditor'));
    }
  }

  const titleError = showProblems && problem === 'title' ? problemMessage : null;
  const itemsError = showProblems && problem === 'items' ? problemMessage : null;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('editor.titleEdit') : t('editor.titleNew') }} />

      <SaveStatus existing={!!existing} saving={saving} failed={failed} dirty={dirty} problem={problemMessage} />

      <Input
        label={t('editor.titleField.label')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('editor.titleField.placeholder')}
        error={titleError}
        autoFocus={!existing}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => (mode === 'text' ? bodyRef.current?.focus() : addItem())}
      />

      <Segmented
        accessibilityLabel={t('editor.type.label')}
        options={[
          { value: 'text', label: t('editor.type.text') },
          { value: 'checklist', label: t('editor.type.checklist') },
        ]}
        value={mode}
        onChange={switchMode}
      />

      {mode === 'text' ? (
        <Input
          ref={bodyRef}
          accessibilityLabel={t('editor.body.label')}
          value={content}
          onChangeText={setContent}
          placeholder={t('editor.body.placeholder')}
          multiline
          scrollEnabled={false}
          style={{ minHeight: layout.minTouchTarget * 5 }}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((item, index) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <PressableScale
                accessibilityRole="checkbox"
                accessibilityLabel={t('editor.item.check', { n: index + 1 })}
                accessibilityState={{ checked: item.completed }}
                haptic="select"
                scaleTo={1}
                ringRadius={radius.pill}
                onPress={() => updateItem(item.id, { completed: !item.completed })}
                style={{ width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={24} color={item.completed ? a.text : colors.textMuted} />
              </PressableScale>
              <Input
                ref={(node) => {
                  itemRefs.current[item.id] = node;
                }}
                containerStyle={{ flex: 1 }}
                accessibilityLabel={t('editor.item.label', { n: index + 1 })}
                value={item.text}
                onChangeText={(text) => updateItem(item.id, { text })}
                placeholder={t('editor.item.placeholder')}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => addItem(item.id)}
                style={{ textDecorationLine: item.completed ? 'line-through' : 'none' }}
              />
              <IconButton icon="close-circle-outline" accessibilityLabel={t('editor.item.remove', { n: index + 1 })} onPress={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} />
            </View>
          ))}
          {itemsError ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="alert-circle" size={14} color={colors.errorText} accessibilityElementsHidden importantForAccessibility="no" />
              <Text variant="caption" color="errorText" style={{ flex: 1 }}>
                {itemsError}
              </Text>
            </View>
          ) : null}
          <Button title={t('editor.item.add')} variant="tertiary" leftIcon="add" onPress={() => addItem()} />
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Input label={t('editor.category.label')} value={category} onChangeText={setCategory} placeholder={t('editor.category.placeholder')} autoCapitalize="words" returnKeyType="next" />
        {knownCategories.length > 0 ? (
          <ChipGroup>
            {knownCategories.slice(0, 8).map((name) => (
              <Chip key={name} label={name} size="sm" accent="notes" selected={category.trim() === name} onPress={() => setCategory(category.trim() === name ? '' : name)} />
            ))}
          </ChipGroup>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Input
          label={t('editor.tags.label')}
          helper={t('editor.tags.helper')}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder={t('editor.tags.placeholder')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        {tags.length > 0 || suggestedTags.length > 0 ? (
          <ChipGroup>
            {tags.map((tag) => (
              <Chip key={`on-${tag}`} label={`#${tag}`} size="sm" accent="notes" selected onRemove={() => setTags(tags.filter((t) => t !== tag))} removeLabel={t('editor.tags.remove', { tag })} />
            ))}
            {suggestedTags.map((tag) => (
              <Chip key={`add-${tag}`} label={`#${tag}`} size="sm" accent="notes" onPress={() => setTags([...tags, tag])} accessibilityHint={t('editor.tags.addHint')} />
            ))}
          </ChipGroup>
        ) : null}
      </View>

      <Card padding="sm" style={{ gap: spacing.xs }}>
        <ToggleRow
          accent="notes"
          icon={isPinned ? 'pin' : 'pin-outline'}
          label={t('editor.pin.label')}
          description={t('editor.pin.description')}
          value={isPinned}
          onChange={setIsPinned}
        />
        <ToggleRow accent="notes" icon="archive-outline" label={t('editor.archive.label')} description={t('editor.archive.description')} value={isArchived} onChange={setIsArchived} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? t('editor.save') : t('editor.create')} leftIcon="checkmark" onPress={submit} loading={creating || (!!existing && saving)} />
        {existing ? <Button title={t('editor.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={deleting} /> : null}
      </View>
    </Screen>
  );
}

/** Autosave indicator: icon + words, never colour alone. New notes are only saved by the button. */
function SaveStatus({ existing, saving, failed, dirty, problem }: { existing: boolean; saving: boolean; failed: Failure['kind'] | null; dirty: boolean; problem: string | null }) {
  const { t } = useTranslation('notes');
  const { colors, reduceMotion } = useTheme();
  const settled = existing && !saving && !failed && !dirty;

  // A small pop on the tick each time a save lands (not on first open, when the note is already saved). Opacity and
  // scale only; nothing at all under reduce-motion.
  const pop = useSharedValue(1);
  const wasSettled = useRef(settled);
  useEffect(() => {
    if (settled && !wasSettled.current && !reduceMotion) {
      pop.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, spring.bouncy)));
    }
    wasSettled.current = settled;
  }, [settled, reduceMotion, pop]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * Math.min(1, pop.get()), transform: [{ scale: 0.7 + 0.3 * pop.get() }] }));

  let icon: React.ComponentProps<typeof Ionicons>['name'] = 'checkmark-circle';
  let text: string = t('editor.status.saved');
  let color: 'successText' | 'warningText' | 'errorText' | 'textSecondary' = 'successText';

  if (!existing) {
    icon = 'create-outline';
    text = t('editor.status.new');
    color = 'textSecondary';
  } else if (saving) {
    icon = 'sync-outline';
    text = t('editor.status.saving');
    color = 'textSecondary';
  } else if (failed === 'offline') {
    icon = 'cloud-offline-outline';
    text = t('editor.status.offline');
    color = 'warningText';
  } else if (failed === 'error') {
    icon = 'alert-circle-outline';
    text = t('editor.status.error');
    color = 'errorText';
  } else if (dirty && problem) {
    icon = 'information-circle-outline';
    text = t('editor.status.blocked', { problem });
    color = 'textSecondary';
  } else if (dirty) {
    icon = 'ellipsis-horizontal-circle-outline';
    text = t('editor.status.unsaved');
    color = 'textSecondary';
  }

  return (
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel={text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={18} color={colors[color]} />
      </Animated.View>
      <Text variant="caption" weight="medium" color={color} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
