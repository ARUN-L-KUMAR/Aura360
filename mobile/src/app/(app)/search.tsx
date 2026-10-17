import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Keyboard, KeyboardAvoidingView, Platform, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChips, type Scope } from '@/components/search/filter-chips';
import { SearchIdle } from '@/components/search/search-idle';
import { SearchResultRow } from '@/components/search/search-result-row';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonList } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/ui/search-bar';
import { Text } from '@/components/ui/text';
import { normalize, tokenize } from '@/features/search/match';
import { countHits, searchEntries } from '@/features/search/run';
import { SEARCH_GROUPS, type SearchGroup, type SearchHit } from '@/features/search/types';
import { useRecentSearches } from '@/features/search/use-recent-searches';
import { useSearchSources } from '@/features/search/use-search-sources';
import { useTranslation } from '@/i18n';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

/** Wait this long after the last keystroke before searching. */
const DEBOUNCE_MS = 250;
/** In the "All" view each section shows this many results, with a "Show all" link for the rest. */
const PREVIEW_COUNT = 5;

type Row = { kind: 'header'; key: string; group: SearchGroup; count: number; more: boolean } | { kind: 'result'; key: string; hit: SearchHit };

type HeaderProps = { group: SearchGroup; count: number; more: boolean; onShowAll: (group: SearchGroup) => void };

const GroupHeader = memo(function GroupHeader({ group, count, more, onShowAll }: HeaderProps) {
  const { t } = useTranslation('search');
  const label = t(`groups.${group}`);
  return (
    <SectionHeader
      title={label}
      count={count}
      actionLabel={more ? t('showAll') : undefined}
      actionAccessibilityLabel={t('showAllLabel', { count, section: label })}
      onActionPress={more ? () => onShowAll(group) : undefined}
      style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xs }}
    />
  );
});

/** A one-line status note (offline, partial results) under the filters. */
function Note({ icon, text, action }: { icon: 'cloud-offline-outline' | 'alert-circle-outline'; text: string; action?: { title: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={!action}
      accessibilityLabel={action ? undefined : text}
      style={{
        marginHorizontal: layout.screenPadding,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.cardMuted,
      }}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
        {text}
      </Text>
      {action ? <Button title={action.title} variant="tertiary" size="sm" fullWidth={false} onPress={action.onPress} /> : null}
    </View>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation('search');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notify = useNotify();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  // A submitted query waiting for its results, so the analytics event carries the final count. `submitCount` re-runs
  // the effect below when the user submits again.
  const pending = useRef<string | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const recents = useRecentSearches();
  const debounced = useDebouncedValue(text, DEBOUNCE_MS);
  const trimmed = text.trim();
  // Clearing the field empties the results at once; typing waits for the debounce.
  const query = trimmed === '' ? '' : debounced.trim();
  const tokens = useMemo(() => tokenize(query), [query]);
  const active = tokens.length > 0;

  const sources = useSearchSources(active);
  const grouped = useMemo(() => searchEntries(sources.entries, tokens), [sources.entries, tokens]);
  const total = useMemo(() => countHits(grouped), [grouped]);
  const scopedCount = scope === 'all' ? total : grouped[scope].length;

  const chipGroups = useMemo(
    () => SEARCH_GROUPS.filter((group) => grouped[group].length > 0 || group === scope).map((group) => ({ group, count: grouped[group].length })),
    [grouped, scope],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const group of SEARCH_GROUPS) {
      if (scope !== 'all' && scope !== group) continue;
      const hits = grouped[group];
      if (hits.length === 0) continue;
      const shown = scope === 'all' ? hits.slice(0, PREVIEW_COUNT) : hits;
      out.push({ kind: 'header', key: `h:${group}`, group, count: hits.length, more: shown.length < hits.length });
      for (const hit of shown) out.push({ kind: 'result', key: hit.entry.key, hit });
    }
    return out;
  }, [grouped, scope]);

  // Remember the text and scope for callbacks that must stay stable (rows are memoised).
  const latest = useRef({ text: trimmed, scope });
  useEffect(() => {
    latest.current = { text: trimmed, scope };
  });

  // Analytics: one `search_performed` per submitted query, sent when its results are in. Never the text itself.
  useEffect(() => {
    if (pending.current === null) return;
    if (normalize(pending.current) !== normalize(query) || sources.loading) return;
    pending.current = null;
    analytics.track('search_performed', { results: total, filtered: scope !== 'all' });
  }, [submitCount, query, sources.loading, total, scope]);

  const summary =
    !active || sources.loading
      ? ''
      : scope === 'all'
        ? t('summary', { count: total, query })
        : t('summarySection', { count: scopedCount, section: t(`groups.${scope}`) });

  // Android reads the live region below; iOS ignores it, so announce there.
  useEffect(() => {
    if (Platform.OS === 'ios' && summary) AccessibilityInfo.announceForAccessibility(summary);
  }, [summary]);

  const changeText = useCallback((next: string) => {
    setText(next);
    if (pending.current !== null && normalize(pending.current) !== normalize(next.trim())) pending.current = null;
  }, []);

  const submit = useCallback(
    (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      recents.add(clean);
      pending.current = clean;
      setSubmitCount((n) => n + 1);
      Keyboard.dismiss();
    },
    [recents],
  );

  const pickRecent = useCallback(
    (value: string) => {
      setText(value);
      submit(value);
    },
    [submit],
  );

  const clearRecent = useCallback(async () => {
    const ok = await notify.confirm({
      title: t('recent.confirmTitle'),
      message: t('recent.confirmMessage'),
      confirmLabel: t('recent.confirmAction'),
      destructive: true,
    });
    if (!ok) return;
    recents.clear();
    notify.info(t('recent.cleared'));
  }, [notify, recents, t]);

  const pickScope = useCallback((group: SearchGroup) => {
    setScope(group);
    inputRef.current?.focus();
  }, []);

  const clearSearch = useCallback(() => {
    setText('');
    setScope('all');
    pending.current = null;
    inputRef.current?.focus();
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const open = useCallback(
    (hit: SearchHit) => {
      if (latest.current.text) recents.add(latest.current.text);
      analytics.track('search_result_opened', { section: hit.entry.group });
      router.push(hit.entry.route as never);
    },
    [recents, router],
  );

  const showAll = useCallback((group: SearchGroup) => setScope(group), []);

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) =>
      item.kind === 'header' ? (
        <GroupHeader group={item.group} count={item.count} more={item.more} onShowAll={showAll} />
      ) : (
        <SearchResultRow hit={item.hit} tokens={tokens} index={index} onOpen={open} />
      ),
    [tokens, open, showAll],
  );

  const bottom = insets.bottom + spacing.xxl;
  const { colors } = useTheme();

  const results = !active ? null : rows.length === 0 && sources.loading ? (
    <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg }}>
      <SkeletonList count={6} />
    </View>
  ) : (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={14}
      windowSize={9}
      contentContainerStyle={{ paddingBottom: bottom }}
      ListEmptyComponent={
        <EmptyState
          variant="noResults"
          title={scope === 'all' ? t('empty.title', { query }) : t('empty.titleSection', { query, section: t(`groups.${scope}`) })}
          description={t('empty.description')}
          actionTitle={t('empty.clear')}
          onAction={clearSearch}
          secondaryActionTitle={scope !== 'all' ? t('empty.searchAll') : undefined}
          onSecondaryAction={scope !== 'all' ? () => setScope('all') : undefined}
        />
      }
      ListFooterComponent={
        sources.loading && rows.length > 0 ? (
          <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.md }}>
            <SkeletonList count={2} />
          </View>
        ) : null
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: layout.screenPadding }}>
            <View style={{ flex: 1 }}>
              <SearchBar
                ref={inputRef}
                autoFocus
                value={text}
                onChangeText={changeText}
                onSubmitEditing={() => submit(text)}
                placeholder={t('placeholder')}
                accessibilityLabel={t('searchLabel')}
                returnKeyType="search"
                blurOnSubmit={false}
              />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
              accessibilityHint={t('cancelHint')}
              onPress={goBack}
              scaleTo={1}
              ringRadius={radius.md}
              style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, justifyContent: 'center', alignItems: 'center' }}>
              <Text variant="label" weight="semiBold" color="primaryAccent">
                {t('cancel')}
              </Text>
            </PressableScale>
          </View>

          {active ? <FilterChips scope={scope} total={total} groups={chipGroups} onChange={setScope} /> : null}
          {active && sources.paused ? <Note icon="cloud-offline-outline" text={t('offline')} /> : null}
          {active && sources.failed && !sources.loading ? (
            <Note icon="alert-circle-outline" text={t('loadError.message')} action={{ title: t('loadError.retry'), onPress: sources.retry }} />
          ) : null}

          {/* Always mounted so a screen reader hears the count change. */}
          <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: layout.screenPadding }}>
            {summary ? (
              <Text variant="caption" color="textSecondary">
                {summary}
              </Text>
            ) : null}
          </View>
        </View>

        {active ? (
          results
        ) : (
          <SearchIdle
            recent={recents.recent}
            scope={scope}
            paddingBottom={bottom}
            onPickRecent={pickRecent}
            onRemoveRecent={recents.remove}
            onClearRecent={clearRecent}
            onPickScope={pickScope}
            onClearScope={() => setScope('all')}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
