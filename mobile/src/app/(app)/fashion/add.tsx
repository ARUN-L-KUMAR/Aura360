import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Segmented } from '@/components/ui/segmented';
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
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function FashionAddScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ id?: string; defaultStatus?: FashionStatus }>();

  const { data: allItems = [] } = useFashionItems();
  const saveMutation = useSaveFashionItem();

  const existingItem = useMemo(() => {
    if (!params.id) return null;
    return allItems.find((i) => i.id === params.id) ?? null;
  }, [allItems, params.id]);

  const [status, setStatus] = useState<FashionStatus>(
    existingItem?.status ?? (params.defaultStatus || 'wardrobe')
  );
  const [name, setName] = useState(existingItem?.name ?? '');
  const [brand, setBrand] = useState(existingItem?.brand ?? '');
  const [category, setCategory] = useState<string>(existingItem?.category ?? 'Tops');
  const [subcategory, setSubcategory] = useState(existingItem?.subcategory ?? '');
  const [color, setColor] = useState(existingItem?.color ?? '');
  const [size, setSize] = useState(existingItem?.size ?? '');
  const [price, setPrice] = useState(existingItem?.price ? String(existingItem.price) : '');
  const [condition, setCondition] = useState<FashionCondition>(existingItem?.condition ?? 'good');
  const [imageUrl, setImageUrl] = useState(existingItem?.imageUrl ?? '');
  const [notes, setNotes] = useState(existingItem?.notes ?? existingItem?.description ?? '');
  const [buyingLink, setBuyingLink] = useState((existingItem?.metadata?.buyingLink as string) ?? '');

  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(
    existingItem?.season ?? ['All']
  );
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    existingItem?.occasion ?? ['Casual']
  );

  const pickImage = async (useCamera = false) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera/photos access to upload clothing images.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const toggleSeason = (s: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleOccasion = (occ: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occ) ? prev.filter((item) => item !== occ) : [...prev, occ]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please provide a name for this clothing item.');
      return;
    }

    const payload: Partial<FashionItem> & { id?: string } = {
      ...(existingItem ? { id: existingItem.id } : {}),
      name: name.trim(),
      brand: brand.trim() || null,
      category,
      subcategory: subcategory.trim() || null,
      color: color.trim() || null,
      size: size.trim() || null,
      price: price ? Number(price) : null,
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
        router.back();
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'Could not save clothing item.');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Status Selector: Wardrobe vs Wishlist */}
        <Segmented
          options={[
            { value: 'wardrobe', label: 'Wardrobe (Owned)' },
            { value: 'wishlist', label: 'Wishlist (Plan to buy)' },
          ]}
          value={status}
          onChange={(val) => setStatus(val as FashionStatus)}
        />

        {/* Image Picker Box */}
        <GlassCard style={styles.imageBox}>
          {imageUrl ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} contentFit="cover" />
              <Pressable
                onPress={() => setImageUrl('')}
                style={[styles.removeImgBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <Ionicons name="trash" size={16} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadButtonsRow}>
              <Pressable
                onPress={() => pickImage(false)}
                style={[styles.photoActionBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="images-outline" size={24} color={moduleColors.fashion} />
                <Text style={{ fontSize: 12, fontWeight: '700' }}>Choose Photo</Text>
              </Pressable>

              <Pressable
                onPress={() => pickImage(true)}
                style={[styles.photoActionBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="camera-outline" size={24} color={moduleColors.fashion} />
                <Text style={{ fontSize: 12, fontWeight: '700' }}>Take Photo</Text>
              </Pressable>
            </View>
          )}

          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="Or enter image URL..."
            placeholderTextColor={colors.textMuted}
            style={[styles.urlInput, { borderColor: colors.border, color: colors.text }]}
          />
        </GlassCard>

        {/* Core Fields */}
        <GlassCard style={{ gap: spacing.md, padding: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>ITEM NAME *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Linen Blend Overshirt"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>BRAND / STORE</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Zara, Uniqlo, Nike"
              placeholderTextColor={colors.textMuted}
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          {/* Category Selector */}
          <View style={{ gap: 6 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>CATEGORY</Text>
            <ChipRow>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  color={moduleColors.fashion}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </ChipRow>
          </View>

          {/* Price, Color & Size */}
          <View style={styles.formRow}>
            <View style={[styles.formCol, { flex: 1 }]}>
              <Text variant="caption" muted style={styles.fieldLabel}>PRICE (₹)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="2499"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={[styles.formCol, { flex: 1 }]}>
              <Text variant="caption" muted style={styles.fieldLabel}>COLOR</Text>
              <TextInput
                value={color}
                onChangeText={setColor}
                placeholder="e.g. Navy, Black"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={[styles.formCol, { flex: 0.8 }]}>
              <Text variant="caption" muted style={styles.fieldLabel}>SIZE</Text>
              <TextInput
                value={size}
                onChangeText={setSize}
                placeholder="M / 32"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>
          </View>
        </GlassCard>

        {/* Condition Selector */}
        {status === 'wardrobe' ? (
          <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
            <Text variant="caption" muted style={styles.fieldLabel}>CONDITION & LAUNDRY</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {CONDITIONS.map((cond) => (
                <Chip
                  key={cond.value}
                  label={cond.label}
                  selected={condition === cond.value}
                  color={cond.color}
                  onPress={() => setCondition(cond.value as FashionCondition)}
                />
              ))}
            </View>
          </GlassCard>
        ) : null}

        {/* Seasons & Occasion */}
        <GlassCard style={{ gap: spacing.md, padding: spacing.lg }}>
          <View style={{ gap: 6 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>SEASON ROTATION</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {SEASONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={selectedSeasons.includes(s)}
                  color="#38bdf8"
                  onPress={() => toggleSeason(s)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>OCCASIONS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {OCCASIONS.map((occ) => (
                <Chip
                  key={occ}
                  label={occ}
                  selected={selectedOccasions.includes(occ)}
                  color="#a855f7"
                  onPress={() => toggleOccasion(occ)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Shopping Link (Wishlist) */}
        <GlassCard style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text variant="caption" muted style={styles.fieldLabel}>STORE / BUYING LINK</Text>
          <TextInput
            value={buyingLink}
            onChangeText={setBuyingLink}
            placeholder="https://myntra.com/..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
        </GlassCard>

        {/* Notes */}
        <GlassCard style={{ gap: spacing.sm, padding: spacing.lg }}>
          <Text variant="caption" muted style={styles.fieldLabel}>NOTES / FIT ADVICE</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Pair with white sneakers, fits slightly oversized..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
        </GlassCard>

        {/* Submit Button */}
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={saveMutation.isPending}
          style={[styles.submitBtn, { backgroundColor: moduleColors.fashion }]}>
          {saveMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                {existingItem ? 'Update Clothing Item' : 'Save to Wardrobe'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  imageBox: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  previewWrap: {
    position: 'relative',
    width: 160,
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  photoActionBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  urlInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formCol: {
    gap: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
});
