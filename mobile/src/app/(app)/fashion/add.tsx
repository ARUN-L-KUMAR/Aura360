import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FashionImage, parseAmount } from '@/components/fashion/shared';
import { CONDITION_META } from '@/components/fashion/condition';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFashionItems, useSaveFashionItem } from '@/features/fashion/hooks';
import {
  CATEGORIES,
  CONDITIONS,
  OCCASIONS,
  SEASONS,
  type FashionCondition,
  type FashionItem,
  type FashionStatus,
} from '@/features/fashion/types';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

const STATUS_OPTIONS: { value: 'wardrobe' | 'wishlist'; label: string }[] = [
  { value: 'wardrobe', label: 'In my wardrobe' },
  { value: 'wishlist', label: 'On my wishlist' },
];

const PIECE_CATEGORIES = CATEGORIES.filter((c) => c !== 'All');

export default function FashionAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; defaultStatus?: FashionStatus }>();
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useFashionItems();

  const isEdit = !!params.id;
  const existingItem = useMemo(() => (params.id ? (data?.find((i) => i.id === params.id) ?? null) : null), [data, params.id]);

  if (isEdit && !existingItem) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: 'Edit item' }} />
        {isPending && fetchStatus !== 'paused' ? (
          <>
            <Skeleton height={layout.minTouchTarget} rounded="lg" />
            <SkeletonCard media lines={3} />
          </>
        ) : isPending ? (
          <EmptyState variant="offline" description="Connect to the internet to load this item." actionTitle="Try again" onAction={() => void refetch()} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
        ) : (
          <ErrorState kind="notFound" message="This item may have been deleted." onRetry={() => router.back()} />
        )}
      </Screen>
    );
  }

  const defaultStatus: 'wardrobe' | 'wishlist' = params.defaultStatus === 'wishlist' ? 'wishlist' : 'wardrobe';
  return <AddForm key={existingItem?.id ?? 'new'} existingItem={existingItem} defaultStatus={defaultStatus} />;
}

function AddForm({ existingItem, defaultStatus }: { existingItem: FashionItem | null; defaultStatus: FashionStatus }) {
  const router = useRouter();
  const notify = useNotify();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const saveMutation = useSaveFashionItem();

  const [status, setStatus] = useState<FashionStatus>(existingItem?.status ?? defaultStatus);
  const [name, setName] = useState(existingItem?.name ?? '');
  const [brand, setBrand] = useState(existingItem?.brand ?? '');
  const [category, setCategory] = useState<string>(existingItem?.category ?? 'Tops');
  const subcategory = existingItem?.subcategory ?? '';
  const [color, setColor] = useState(existingItem?.color ?? '');
  const [size, setSize] = useState(existingItem?.size ?? '');
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [condition, setCondition] = useState<FashionCondition>(existingItem?.condition ?? 'good');
  const [imageUrl, setImageUrl] = useState(existingItem?.imageUrl ?? '');
  const [notes, setNotes] = useState(existingItem?.notes ?? existingItem?.description ?? '');
  const [buyingLink, setBuyingLink] = useState((existingItem?.metadata?.buyingLink as string) ?? '');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(existingItem?.season ?? ['All']);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(existingItem?.occasion ?? ['Casual']);

  const [submitted, setSubmitted] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const brandRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const sizeRef = useRef<TextInput>(null);
  const linkRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const parsedPrice = parseAmount(price);
  const nameError = submitted && !name.trim() ? 'Enter a name for this item' : undefined;
  const priceError = submitted && !parsedPrice.valid ? 'Enter an amount, like 2499 or 2499.50' : undefined;

  const pickImage = async (useCamera: boolean) => {
    setPhotoError(null);
    try {
      const permission = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Allow camera or photo access in your device settings to add a picture.');
        return;
      }
      const options = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.8 };
      const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) setImageUrl(result.assets[0].uri);
    } catch {
      setPhotoError("Couldn't open the photo picker. Try again.");
    }
  };

  const toggleSeason = (s: string) => setSelectedSeasons((prev) => (prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]));
  const toggleOccasion = (occ: string) => setSelectedOccasions((prev) => (prev.includes(occ) ? prev.filter((item) => item !== occ) : [...prev, occ]));

  const handleSave = () => {
    setSubmitted(true);
    setSaveError(null);
    if (!name.trim() || !parsedPrice.valid) return;

    const payload: Partial<FashionItem> & { id?: string } = {
      ...(existingItem ? { id: existingItem.id } : {}),
      name: name.trim(),
      brand: brand.trim() || null,
      category,
      subcategory: subcategory.trim() || null,
      color: color.trim() || null,
      size: size.trim() || null,
      price: parsedPrice.value,
      status,
      condition,
      imageUrl: imageUrl || null,
      notes: notes.trim() || null,
      season: selectedSeasons,
      occasion: selectedOccasions,
      metadata: {
        ...(existingItem?.metadata || {}),
        buyingLink: buyingLink.trim() || undefined,
      },
    };

    saveMutation.mutate(payload, {
      onSuccess: () => {
        notify.success(existingItem ? 'Changes saved' : status === 'wishlist' ? 'Added to your wishlist' : 'Added to your wardrobe');
        router.back();
      },
      onError: (err) => {
        setSaveError(err instanceof Error && err.message ? err.message : 'Could not save this item.');
        notify.error(err);
      },
    });
  };

  const saveLabel = existingItem ? 'Save changes' : status === 'wishlist' ? 'Add to wishlist' : 'Add to wardrobe';

  return (
    <Screen
      topInset={false}
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}>
          <Button title={saveLabel} leftIcon="checkmark" loading={saveMutation.isPending} onPress={handleSave} />
        </View>
      }>
      <Stack.Screen options={{ title: existingItem ? 'Edit item' : 'Add item' }} />

      {saveError ? <ErrorState size="inline" title="Couldn't save" message={saveError} /> : null}

      <Segmented options={STATUS_OPTIONS} value={status === 'wishlist' ? 'wishlist' : 'wardrobe'} onChange={setStatus} accessibilityLabel="Where this item lives" />

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Photo" />
        {imageUrl ? (
          <View style={{ alignSelf: 'center', width: '60%', aspectRatio: 1 }}>
            <FashionImage uri={imageUrl} style={{ flex: 1, borderRadius: radius.md }} iconSize={48} />
            <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs }}>
              <IconButton icon="trash-outline" variant="filled" destructive size="sm" accessibilityLabel="Remove photo" onPress={() => setImageUrl('')} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button title="Choose photo" variant="secondary" leftIcon="images-outline" onPress={() => pickImage(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Take photo" variant="secondary" leftIcon="camera-outline" onPress={() => pickImage(true)} />
            </View>
          </View>
        )}
        <Input
          label="Or paste an image link"
          placeholder="https://"
          value={imageUrl}
          onChangeText={(value) => {
            setImageUrl(value);
            setPhotoError(null);
          }}
          error={photoError}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="URL"
          returnKeyType="done"
          clearable
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Input
          label="Item name"
          placeholder="Linen blend overshirt"
          value={name}
          onChangeText={setName}
          error={nameError}
          autoCapitalize="sentences"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => brandRef.current?.focus()}
        />
        <Input
          ref={brandRef}
          label="Brand or store"
          placeholder="Zara, Uniqlo, Nike"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => priceRef.current?.focus()}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Category</Text>
          <ChipGroup>
            {PIECE_CATEGORIES.map((cat) => (
              <Chip key={cat} label={cat} accent="fashion" selected={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </ChipGroup>
        </View>

        <Input
          ref={priceRef}
          label="Price"
          placeholder="2499"
          value={price}
          onChangeText={setPrice}
          error={priceError}
          leftAdornment={
            <Text variant="body" color="textSecondary">
              {CURRENCY_SYMBOL}
            </Text>
          }
          keyboardType="decimal-pad"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => colorRef.current?.focus()}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            ref={colorRef}
            containerStyle={{ flex: 1 }}
            label="Colour"
            placeholder="Navy"
            value={color}
            onChangeText={setColor}
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => sizeRef.current?.focus()}
          />
          <Input
            ref={sizeRef}
            containerStyle={{ flex: 1 }}
            label="Size"
            placeholder="M or 32"
            value={size}
            onChangeText={setSize}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => linkRef.current?.focus()}
          />
        </View>
      </Card>

      {status === 'wardrobe' ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title="Condition" subtitle="Items marked as needing a wash show up in the planner's laundry list." />
          <ChipGroup>
            {CONDITIONS.map((cond) => (
              <Chip key={cond.value} label={CONDITION_META[cond.value].label} accent="fashion" selected={condition === cond.value} onPress={() => setCondition(cond.value)} />
            ))}
          </ChipGroup>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Seasons</Text>
          <ChipGroup>
            {SEASONS.map((s) => (
              <Chip key={s} label={s} accent="fashion" selected={selectedSeasons.includes(s)} onPress={() => toggleSeason(s)} />
            ))}
          </ChipGroup>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Occasions</Text>
          <ChipGroup>
            {OCCASIONS.map((occ) => (
              <Chip key={occ} label={occ} accent="fashion" selected={selectedOccasions.includes(occ)} onPress={() => toggleOccasion(occ)} />
            ))}
          </ChipGroup>
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Input
          ref={linkRef}
          label="Store link"
          placeholder="https://myntra.com/..."
          value={buyingLink}
          onChangeText={setBuyingLink}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="URL"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => notesRef.current?.focus()}
        />
        <Input
          ref={notesRef}
          label="Notes"
          placeholder="Pairs with white sneakers, fits slightly oversized"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
      </Card>
    </Screen>
  );
}
