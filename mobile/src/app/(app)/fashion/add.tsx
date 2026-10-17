import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FashionImage, parseAmount } from '@/components/fashion/shared';
import { conditionLabel } from '@/components/fashion/condition';
import { categoryLabel, occasionLabel, seasonLabel } from '@/components/fashion/labels';
import { failureMessage } from '@/components/finance/failure-message';
import { LoadError, OfflineState } from '@/components/finance/load-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
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
import { useTranslation } from '@/i18n';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

/** Not copy: the start of a web address. */
const URL_HINT = 'https://';

const PIECE_CATEGORIES = CATEGORIES.filter((c) => c !== 'All');

export default function FashionAddScreen() {
  const router = useRouter();
  const { t } = useTranslation('fashion');
  const params = useLocalSearchParams<{ id?: string; defaultStatus?: FashionStatus }>();
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useFashionItems();

  const isEdit = !!params.id;
  const existingItem = useMemo(() => (params.id ? (data?.find((i) => i.id === params.id) ?? null) : null), [data, params.id]);

  if (isEdit && !existingItem) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: t('add.titleEdit') }} />
        {isPending && fetchStatus !== 'paused' ? (
          <>
            <Skeleton height={layout.minTouchTarget} rounded="lg" />
            <SkeletonCard media lines={3} />
          </>
        ) : isPending ? (
          <OfflineState description={t('offline.item')} onRetry={() => void refetch()} />
        ) : isError ? (
          <LoadError error={error} title={t('errors.loadItems')} onRetry={() => void refetch()} retrying={isRefetching} />
        ) : (
          <ErrorState kind="notFound" message={t('add.notFound')} onRetry={() => router.back()} retryLabel={t('common.goBack')} />
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
  const { t } = useTranslation('fashion');
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
  const nameError = submitted && !name.trim() ? t('add.nameNeeded') : undefined;
  const priceError = submitted && !parsedPrice.valid ? t('add.priceInvalid') : undefined;

  const pickImage = async (useCamera: boolean) => {
    setPhotoError(null);
    try {
      const permission = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(t('add.photoDenied'));
        return;
      }
      const options = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.8 };
      const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) setImageUrl(result.assets[0].uri);
    } catch {
      setPhotoError(t('add.photoFailed'));
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
        analytics.track('fashion_item_saved', { mode: existingItem ? 'edit' : 'create' });
        notify.success(existingItem ? t('add.saved') : status === 'wishlist' ? t('add.addedWishlist') : t('add.addedWardrobe'));
        router.back();
      },
      onError: (err) => {
        const message = failureMessage(err, t('errors.saveItem'));
        setSaveError(message);
        notify.error(message);
      },
    });
  };

  const saveLabel = existingItem ? t('add.saveChanges') : status === 'wishlist' ? t('add.saveWishlist') : t('add.saveWardrobe');
  const statusOptions: { value: 'wardrobe' | 'wishlist'; label: string }[] = [
    { value: 'wardrobe', label: t('add.inWardrobe') },
    { value: 'wishlist', label: t('add.onWishlist') },
  ];

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
      <Stack.Screen options={{ title: existingItem ? t('add.titleEdit') : t('add.titleNew') }} />

      {saveError ? <ErrorState size="inline" title={t('errors.saveTitle')} message={saveError} /> : null}

      <Segmented options={statusOptions} value={status === 'wishlist' ? 'wishlist' : 'wardrobe'} onChange={setStatus} accessibilityLabel={t('add.where')} />

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title={t('add.photoTitle')} />
        {imageUrl ? (
          <View style={{ alignSelf: 'center', width: '60%', aspectRatio: 1 }}>
            <FashionImage uri={imageUrl} accessibilityLabel={t('add.photoSelected')} style={{ flex: 1, borderRadius: radius.md }} iconSize={48} />
            <View style={{ position: 'absolute', top: spacing.xs, end: spacing.xs }}>
              <IconButton icon="trash-outline" variant="filled" destructive size="sm" accessibilityLabel={t('add.removePhoto')} onPress={() => setImageUrl('')} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button title={t('add.choosePhoto')} variant="secondary" leftIcon="images-outline" onPress={() => pickImage(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('add.takePhoto')} variant="secondary" leftIcon="camera-outline" onPress={() => pickImage(true)} />
            </View>
          </View>
        )}
        <Input
          label={t('add.pasteLink')}
          placeholder={URL_HINT}
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
          label={t('add.nameLabel')}
          placeholder={t('add.namePlaceholder')}
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
          label={t('add.brandLabel')}
          placeholder={t('add.brandPlaceholder')}
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => priceRef.current?.focus()}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" accessibilityRole="header">
            {t('add.category')}
          </Text>
          <ChipGroup>
            {PIECE_CATEGORIES.map((cat) => (
              <Chip key={cat} label={categoryLabel(cat)} accent="fashion" selected={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </ChipGroup>
        </View>

        <Input
          ref={priceRef}
          label={t('add.priceLabel')}
          placeholder={t('add.pricePlaceholder')}
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
            label={t('add.colourLabel')}
            placeholder={t('add.colourPlaceholder')}
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
            label={t('add.sizeLabel')}
            placeholder={t('add.sizePlaceholder')}
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
          <SectionHeader title={t('add.conditionTitle')} subtitle={t('add.conditionHint')} />
          <ChipGroup>
            {CONDITIONS.map((cond) => (
              <Chip key={cond.value} label={conditionLabel(cond.value)} accent="fashion" selected={condition === cond.value} onPress={() => setCondition(cond.value)} />
            ))}
          </ChipGroup>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" accessibilityRole="header">
            {t('add.seasons')}
          </Text>
          <ChipGroup>
            {SEASONS.map((s) => (
              <Chip key={s} label={seasonLabel(s)} accent="fashion" selected={selectedSeasons.includes(s)} onPress={() => toggleSeason(s)} />
            ))}
          </ChipGroup>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" accessibilityRole="header">
            {t('add.occasions')}
          </Text>
          <ChipGroup>
            {OCCASIONS.map((occ) => (
              <Chip key={occ} label={occasionLabel(occ)} accent="fashion" selected={selectedOccasions.includes(occ)} onPress={() => toggleOccasion(occ)} />
            ))}
          </ChipGroup>
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <Input
          ref={linkRef}
          label={t('add.linkLabel')}
          placeholder={t('add.linkPlaceholder')}
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
          label={t('add.notesLabel')}
          placeholder={t('add.notesPlaceholder')}
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
