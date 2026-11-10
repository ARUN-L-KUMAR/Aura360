import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accentTint } from '@/components/ui/accent-tint';
import { categoryIcon, categoryLabel, occasionLabel, VIBES, vibeLabel } from '@/components/fashion/labels';
import { Heading, RingCard } from '@/components/fashion/section-kit';
import { FashionImage, itemsGate, usePhotoScrim } from '@/components/fashion/shared';
import { failureMessage } from '@/components/finance/failure-message';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useFashionItems, useSaveOutfit } from '@/features/fashion/hooks';
import { CATEGORIES, OCCASIONS, type FashionItem } from '@/features/fashion/types';
import { i18n, useTranslation } from '@/i18n';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

/** Width of a piece in the picker strip. */
const PICK_TILE_WIDTH = 104;
/** Height of a slot tile (a little taller than two touch targets plus the label). */
const SLOT_HEIGHT = layout.minTouchTarget * 3;
const SLOT_ICON = 36;

type SlotKey = 'top' | 'bottom' | 'shoes' | 'accessory';
/** The four slots of a look and the wardrobe category that fills each. Anything else (outerwear, a second top) is a layer. */
const SLOTS: { key: SlotKey; category: (typeof CATEGORIES)[number] }[] = [
  { key: 'top', category: 'Tops' },
  { key: 'bottom', category: 'Bottoms' },
  { key: 'shoes', category: 'Shoes' },
  { key: 'accessory', category: 'Accessories' },
];

/** Call while rendering, never at module scope. */
function slotLabel(key: SlotKey) {
  switch (key) {
    case 'top':
      return i18n.t('fashion:look.slotTop');
    case 'bottom':
      return i18n.t('fashion:look.slotBottom');
    case 'shoes':
      return i18n.t('fashion:look.slotShoes');
    case 'accessory':
      return i18n.t('fashion:look.slotAccessory');
  }
}

/** Puts each chosen piece in the slot for its category; later pieces of an occupied slot (and outerwear) become layers. */
function assignSlots(pieces: FashionItem[]) {
  const filled: Partial<Record<SlotKey, FashionItem>> = {};
  const layers: FashionItem[] = [];
  for (const piece of pieces) {
    const slot = SLOTS.find((s) => s.category.toLowerCase() === piece.category.toLowerCase());
    if (slot && !filled[slot.key]) filled[slot.key] = piece;
    else layers.push(piece);
  }
  return { filled, layers };
}

type SlotTileProps = {
  slot: (typeof SLOTS)[number];
  piece?: FashionItem;
  onRemove: (id: string) => void;
  onPick: (category: string) => void;
};

/** One slot of the look: the chosen piece (tap to take it out) or a dashed tile that jumps to the picker for that category. */
function SlotTile({ slot, piece, onRemove, onPick }: SlotTileProps) {
  const { t } = useTranslation('fashion');
  const { accent, scheme } = useTheme();
  const scrim = usePhotoScrim();
  const a = accent('fashion');
  const label = slotLabel(slot.key);

  if (!piece) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('look.slotEmpty', { slot: label })}
        haptic="select"
        ringRadius={radius.xl}
        onPress={() => onPick(slot.category)}
        style={{
          flex: 1,
          height: SLOT_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          borderRadius: radius.xl,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: withAlpha(a.solid, scheme === 'dark' ? 0.55 : 0.7),
          backgroundColor: accentTint(a, scheme, 0.08),
        }}>
        <Ionicons name={categoryIcon(slot.category)} size={SLOT_ICON - spacing.sm} color={a.text} />
        <Text variant="overline" weight="semiBold" style={{ color: a.text }} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {t('look.slotAdd')}
        </Text>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('look.slotFilled', { slot: label, name: piece.name })}
      accessibilityHint={t('look.slotRemoveHint')}
      haptic="select"
      ringRadius={radius.xl}
      onPress={() => onRemove(piece.id)}
      style={{ flex: 1, height: SLOT_HEIGHT, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 2, borderColor: a.solid }}>
      <FashionImage uri={piece.imageUrl} category={piece.category} iconSize={SLOT_ICON} style={StyleSheet.absoluteFill} />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          top: spacing.sm,
          end: spacing.sm,
          width: spacing.xl,
          height: spacing.xl,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scrim.background,
        }}>
        <Ionicons name="close" size={14} color={scrim.foreground} />
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', start: 0, end: 0, bottom: 0, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: scrim.background }}>
        <Text variant="overline" numberOfLines={1} style={{ color: scrim.foreground }}>
          {label}
        </Text>
        <Text variant="caption" weight="bold" numberOfLines={1} style={{ color: scrim.foreground }}>
          {piece.name}
        </Text>
      </View>
    </PressableScale>
  );
}

type TileProps = { item: FashionItem; selected: boolean; onToggle: (id: string) => void };

/** A wardrobe piece in the picker strip: photo, name, and a ring plus check when it is in the look. */
const PieceTile = memo(function PieceTile({ item, selected, onToggle }: TileProps) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fashion');
  const a = accent('fashion');
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityLabel={t('look.pieceLabel', { name: item.name, category: categoryLabel(item.category) })}
      accessibilityState={{ checked: selected }}
      haptic="select"
      ringRadius={radius.lg}
      onPress={() => onToggle(item.id)}
      style={{
        width: PICK_TILE_WIDTH,
        overflow: 'hidden',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}>
      <View style={{ aspectRatio: 1 }}>
        <FashionImage uri={item.imageUrl} category={item.category} style={{ flex: 1 }} iconSize={28} />
        <View
          style={{
            position: 'absolute',
            top: spacing.xs,
            end: spacing.xs,
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
      <View style={{ padding: spacing.sm, gap: 2 }}>
        <Text variant="caption" weight="semiBold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {categoryLabel(item.category)}
        </Text>
      </View>
      {selected ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius.lg, borderWidth: 2, borderColor: a.solid }]} /> : null}
    </PressableScale>
  );
});

const keyExtractor = (item: FashionItem) => item.id;

function StripGap() {
  return <View style={{ width: spacing.sm }} />;
}

export default function FashionOutfitModal() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('fashion');
  const { colors, accent, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const a = accent('fashion');

  const itemsQuery = useFashionItems();
  const { data: allItems, isPending, fetchStatus, isError, error, isRefetching, refetch } = itemsQuery;
  const saveOutfit = useSaveOutfit();

  const wardrobeItems = useMemo(() => (allItems ?? []).filter((i) => i.status === 'wardrobe'), [allItems]);

  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [pickFilter, setPickFilter] = useState<string>('All');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const pickerTop = useRef(0);
  const occasionRef = useRef<TextInput>(null);
  const vibeRef = useRef<TextInput>(null);

  const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const selectedPieces = useMemo(
    () => selectedItemIds.map((id) => wardrobeItems.find((i) => i.id === id)).filter((i): i is FashionItem => !!i),
    [selectedItemIds, wardrobeItems],
  );
  const { filled, layers } = useMemo(() => assignSlots(selectedPieces), [selectedPieces]);
  // The colour names of the chosen pieces, once each, in the order they were picked.
  const colourNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const piece of selectedPieces) {
      const colour = piece.color?.trim();
      if (colour && !seen.has(colour.toLowerCase())) {
        seen.add(colour.toLowerCase());
        names.push(colour);
      }
    }
    return names;
  }, [selectedPieces]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of wardrobeItems) counts.set(item.category.toLowerCase(), (counts.get(item.category.toLowerCase()) ?? 0) + 1);
    return counts;
  }, [wardrobeItems]);
  const pickItems = useMemo(
    () => (pickFilter === 'All' ? wardrobeItems : wardrobeItems.filter((i) => i.category.toLowerCase() === pickFilter.toLowerCase())),
    [wardrobeItems, pickFilter],
  );

  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  /** An empty slot was tapped: show that category in the picker and bring the picker into view. */
  const pickFor = useCallback(
    (category: string) => {
      setPickFilter(category);
      scrollRef.current?.scrollTo({ y: Math.max(0, pickerTop.current - layout.sectionGap), animated: !reduceMotion });
    },
    [reduceMotion],
  );

  const nameError = submitted && !name.trim() ? t('look.nameNeeded') : undefined;
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
          analytics.track('outfit_saved');
          notify.success(t('look.saved'));
          router.back();
        },
        onError: (err) => {
          const message = failureMessage(err, t('errors.saveLook'));
          setSaveError(message);
          notify.error(message);
        },
      },
    );
  };

  const gate = itemsGate({
    loading: isPending && fetchStatus !== 'paused',
    offline: isPending && fetchStatus === 'paused',
    error: isError && !allItems ? error : null,
    staleError: isError && allItems ? error : null,
    refreshing: isRefetching,
    refetch: () => void refetch(),
  });

  const renderItem = useCallback(({ item }: { item: FashionItem }) => <PieceTile item={item} selected={selectedSet.has(item.id)} onToggle={toggleItem} />, [selectedSet, toggleItem]);

  const count = selectedItemIds.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('look.title') }} />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: layout.sectionGap, gap: layout.sectionGap }}>
        {saveError ? <ErrorState size="inline" title={t('errors.saveTitle')} message={saveError} /> : null}

        <View style={{ gap: spacing.md }}>
          <Heading overline={t('look.overline')} title={t('look.slotsTitle')} count={count} />
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {SLOTS.slice(0, 2).map((slot) => (
                <SlotTile key={slot.key} slot={slot} piece={filled[slot.key]} onRemove={toggleItem} onPick={pickFor} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {SLOTS.slice(2).map((slot) => (
                <SlotTile key={slot.key} slot={slot} piece={filled[slot.key]} onRemove={toggleItem} onPick={pickFor} />
              ))}
            </View>
          </View>

          {layers.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" color="textMuted">
                {t('look.layers')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {layers.map((piece) => (
                  <PressableScale
                    key={piece.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('look.layerRemove', { name: piece.name })}
                    haptic="select"
                    ringRadius={radius.lg}
                    onPress={() => toggleItem(piece.id)}
                    style={{ width: layout.minTouchTarget + spacing.md, height: layout.minTouchTarget + spacing.md, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 2, borderColor: a.solid }}>
                    <FashionImage uri={piece.imageUrl} category={piece.category} iconSize={24} style={{ flex: 1 }} />
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}

          {colourNames.length > 0 ? (
            <View
              accessible
              accessibilityLabel={t('look.coloursSpoken', { names: colourNames.join(', ') })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs }}>
              <Ionicons name="color-palette-outline" size={18} color={a.text} />
              <Text variant="overline" color="textMuted">
                {t('look.colours')}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={2} style={{ flex: 1 }}>
                {colourNames.join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <RingCard>
          <Input
            label={t('look.nameLabel')}
            placeholder={t('look.namePlaceholder')}
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
              label={t('look.occasionLabel')}
              placeholder={t('look.occasionPlaceholder')}
              value={occasion}
              onChangeText={setOccasion}
              autoCapitalize="sentences"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => vibeRef.current?.focus()}
            />
            <ChipRow>
              {OCCASIONS.map((occ) => {
                const on = occasion.trim().toLowerCase() === occ.toLowerCase();
                return <Chip key={occ} size="sm" label={occasionLabel(occ)} accent="fashion" selected={on} onPress={() => setOccasion(on ? '' : occ)} />;
              })}
            </ChipRow>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Input
              ref={vibeRef}
              label={t('look.vibeLabel')}
              placeholder={t('look.vibePlaceholder')}
              value={vibe}
              onChangeText={setVibe}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
            <ChipRow>
              {VIBES.map((v) => {
                const on = vibe.trim().toLowerCase() === v.toLowerCase();
                return <Chip key={v} size="sm" label={vibeLabel(v)} accent="fashion" selected={on} onPress={() => setVibe(on ? '' : v)} />;
              })}
            </ChipRow>
          </View>
        </RingCard>

        <View style={{ gap: spacing.md }} onLayout={(e) => (pickerTop.current = e.nativeEvent.layout.y)}>
          <View style={{ gap: spacing.sm }}>
            <Heading overline={t('look.pickOverline')} title={t('look.pickTitle')} subtitle={t('look.pickHint')} />
            {piecesError ? (
              <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons name="alert-circle" size={16} color={colors.errorText} />
                <Text variant="caption" style={{ color: colors.errorText }}>
                  {t('look.pickNeeded')}
                </Text>
              </View>
            ) : null}
          </View>

          {gate ? (
            gate
          ) : wardrobeItems.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              accent="fashion"
              title={t('look.emptyTitle')}
              description={t('look.emptyBody')}
              actionTitle={t('look.emptyAction')}
              onAction={() => router.push({ pathname: '/fashion/add', params: { defaultStatus: 'wardrobe' } })}
            />
          ) : (
            <>
              <ChipRow>
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    size="sm"
                    label={categoryLabel(cat)}
                    accent="fashion"
                    selected={pickFilter === cat}
                    count={cat === 'All' ? wardrobeItems.length : (categoryCounts.get(cat.toLowerCase()) ?? 0)}
                    onPress={() => setPickFilter(cat)}
                  />
                ))}
              </ChipRow>
              {pickItems.length === 0 ? (
                <Text variant="caption" color="textSecondary">
                  {t('look.pickNone')}
                </Text>
              ) : (
                <FlatList
                  horizontal
                  data={pickItems}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  extraData={selectedSet}
                  ItemSeparatorComponent={StripGap}
                  style={{ flexGrow: 0 }}
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={6}
                  windowSize={5}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}>
        <Button title={count > 0 ? t('look.saveCount', { count }) : t('look.save')} leftIcon="sparkles" loading={saveOutfit.isPending} onPress={handleSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
