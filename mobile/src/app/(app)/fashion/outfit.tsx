import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FashionImage, SpacerCell, isSpacer, itemsGate, type GridEntry } from '@/components/fashion/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { useFashionItems, useSaveOutfit } from '@/features/fashion/hooks';
import { OCCASIONS, type FashionItem } from '@/features/fashion/types';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

const COLUMNS = 3;
const keyExtractor = (entry: GridEntry) => entry.id;
const columnStyle = { gap: spacing.sm } as const;

function RowGap() {
  return <View style={{ height: spacing.sm }} />;
}

/** Pads the last row so a lone tile keeps column width. */
function padRows(items: FashionItem[]): GridEntry[] {
  const missing = (COLUMNS - (items.length % COLUMNS)) % COLUMNS;
  return missing === 0 ? items : [...items, ...Array.from({ length: missing }, (_, i) => ({ id: `__spacer_${i}`, spacer: true as const }))];
}

type TileProps = { item: FashionItem; selected: boolean; onToggle: (id: string) => void };

const PieceTile = memo(function PieceTile({ item, selected, onToggle }: TileProps) {
  const { colors, accent } = useTheme();
  const a = accent('fashion');
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.name}, ${item.category}`}
      accessibilityState={{ checked: selected }}
      haptic="select"
      onPress={() => onToggle(item.id)}
      style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? a.solid : colors.border,
        backgroundColor: colors.card,
      }}>
      <View style={{ aspectRatio: 1 }}>
        <FashionImage uri={item.imageUrl} style={{ flex: 1 }} iconSize={24} />
        <View
          style={{
            position: 'absolute',
            top: spacing.xs,
            right: spacing.xs,
            width: spacing.xl,
            height: spacing.xl,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? a.text : colors.textSecondary} />
        </View>
      </View>
      <View style={{ padding: spacing.xs + spacing.xs / 2, gap: 2 }}>
        <Text variant="caption" weight="semiBold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {item.category}
        </Text>
      </View>
    </PressableScale>
  );
});

export default function FashionOutfitModal() {
  const router = useRouter();
  const notify = useNotify();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const itemsQuery = useFashionItems();
  const { data: allItems, isPending, fetchStatus, isError, error, isRefetching, refetch } = itemsQuery;
  const saveOutfit = useSaveOutfit();

  const wardrobeItems = useMemo(() => (allItems ?? []).filter((i) => i.status === 'wardrobe'), [allItems]);
  const entries = useMemo(() => padRows(wardrobeItems), [wardrobeItems]);

  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const occasionRef = useRef<TextInput>(null);
  const vibeRef = useRef<TextInput>(null);

  const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const nameError = submitted && !name.trim() ? 'Give this look a name' : undefined;
  const piecesError = submitted && selectedItemIds.length === 0;

  const handleSave = () => {
    setSubmitted(true);
    setSaveError(null);
    if (!name.trim() || selectedItemIds.length === 0) return;

    saveOutfit.mutate(
      {
        name: name.trim(),
        itemIds: selectedItemIds,
        occasion: occasion.trim() || null,
        vibe: vibe.trim() || null,
      },
      {
        onSuccess: () => {
          notify.success('Look saved');
          router.back();
        },
        onError: (err) => {
          setSaveError(err instanceof Error && err.message ? err.message : 'Could not save this look.');
          notify.error(err);
        },
      },
    );
  };

  const gate = itemsGate({
    loading: isPending && fetchStatus !== 'paused',
    offline: isPending && fetchStatus === 'paused',
    error: isError && !allItems ? error : null,
    refreshing: isRefetching,
    refetch: () => void refetch(),
  });

  const renderItem = useCallback(
    ({ item }: { item: GridEntry }) => (isSpacer(item) ? <SpacerCell /> : <PieceTile item={item} selected={selectedSet.has(item.id)} onToggle={toggleItem} />),
    [selectedSet, toggleItem],
  );

  const count = selectedItemIds.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
      <Stack.Screen options={{ title: 'New look' }} />
      <FlatList
        data={gate ? [] : entries}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={selectedSet}
        numColumns={COLUMNS}
        columnWrapperStyle={columnStyle}
        ItemSeparatorComponent={RowGap}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: layout.sectionGap }}
        ListHeaderComponent={
          <View style={{ gap: layout.sectionGap, marginBottom: layout.itemGap }}>
            {saveError ? <ErrorState size="inline" title="Couldn't save" message={saveError} /> : null}

            <Card style={{ gap: spacing.lg }}>
              <Input
                label="Look name"
                placeholder="Summer date night"
                value={name}
                onChangeText={setName}
                error={nameError}
                autoCapitalize="sentences"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => occasionRef.current?.focus()}
              />
              <View style={{ gap: spacing.sm }}>
                <Input
                  ref={occasionRef}
                  label="Occasion"
                  placeholder="Casual, party"
                  value={occasion}
                  onChangeText={setOccasion}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => vibeRef.current?.focus()}
                />
                <ChipRow>
                  {OCCASIONS.map((occ) => (
                    <Chip key={occ} size="sm" label={occ} accent="fashion" selected={occasion.trim().toLowerCase() === occ.toLowerCase()} onPress={() => setOccasion(occ)} />
                  ))}
                </ChipRow>
              </View>
              <Input
                ref={vibeRef}
                label="Style or vibe"
                placeholder="Minimalist, cosy"
                value={vibe}
                onChangeText={setVibe}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </Card>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Pick your pieces" subtitle="Choose from the items in your wardrobe." count={count} />
              {piecesError ? (
                <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name="alert-circle" size={16} color={colors.errorText} />
                  <Text variant="caption" style={{ color: colors.errorText }}>
                    Select at least one piece
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          gate ?? (
            <EmptyState
              icon="shirt-outline"
              accent="fashion"
              title="No pieces to pick from"
              description="Add clothing to your wardrobe first, then come back to put a look together."
              actionTitle="Add an item"
              onAction={() => router.push({ pathname: '/fashion/add', params: { defaultStatus: 'wardrobe' } })}
            />
          )
        }
      />

      <View
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}>
        <Button
          title={count > 0 ? `Save look · ${count} ${count === 1 ? 'piece' : 'pieces'}` : 'Save look'}
          leftIcon="sparkles"
          loading={saveOutfit.isPending}
          onPress={handleSave}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
