import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useFashionItems, useSaveOutfit } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { radius, spacing, useTheme } from '@/theme';

export default function FashionOutfitModal() {
  const router = useRouter();
  const { colors } = useTheme();

  const { data: allItems = [] } = useFashionItems();
  const saveOutfit = useSaveOutfit();

  const wardrobeItems = useMemo(
    () => allItems.filter((i) => i.status === 'wardrobe'),
    [allItems]
  );

  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give this outfit combination a name.');
      return;
    }
    if (selectedItemIds.length === 0) {
      Alert.alert('No Items Selected', 'Select at least one clothing piece for this outfit look.');
      return;
    }

    saveOutfit.mutate(
      {
        name: name.trim(),
        itemIds: selectedItemIds,
        occasion: occasion.trim() || null,
        vibe: vibe.trim() || null,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          Alert.alert('Error', err instanceof Error ? err.message : 'Could not create outfit.');
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Basic Info Card */}
        <GlassCard style={{ gap: spacing.md, padding: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <Text variant="caption" muted style={styles.fieldLabel}>LOOK NAME *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Summer Date Night, Casual Friday"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" muted style={styles.fieldLabel}>OCCASION</Text>
              <TextInput
                value={occasion}
                onChangeText={setOccasion}
                placeholder="e.g. Casual, Party"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption" muted style={styles.fieldLabel}>STYLE VIBE</Text>
              <TextInput
                value={vibe}
                onChangeText={setVibe}
                placeholder="e.g. Minimalist, Cozy"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>
          </View>
        </GlassCard>

        {/* Item Selector Grid */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading" style={{ fontSize: 16, fontWeight: '700' }}>
              Select Pieces from Wardrobe
            </Text>
            <Text variant="caption" style={{ color: '#8b5cf6', fontWeight: '800' }}>
              {selectedItemIds.length} SELECTED
            </Text>
          </View>

          <View style={styles.itemsGrid}>
            {wardrobeItems.map((item) => {
              const isSelected = selectedItemIds.includes(item.id);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleItem(item.id)}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? '#8b5cf6' : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="shirt-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Selected check circle */}
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        backgroundColor: isSelected ? '#8b5cf6' : 'rgba(0,0,0,0.3)',
                      },
                    ]}>
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </View>

                  <View style={{ padding: 6, gap: 2 }}>
                    <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700' }}>
                      {item.name}
                    </Text>
                    <Text variant="caption" muted numberOfLines={1} style={{ fontSize: 10 }}>
                      {item.category}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={saveOutfit.isPending}
          style={[styles.saveBtn, { backgroundColor: '#8b5cf6' }]}>
          {saveOutfit.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
                Assemble Look ({selectedItemIds.length} pieces)
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl + 20,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: 14,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemCard: {
    width: '31%',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: 90,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
});
