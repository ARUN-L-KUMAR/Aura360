import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useFashionProfile, useSaveFashionProfile } from '@/features/fashion/hooks';
import type { FashionProfileData } from '@/features/fashion/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

interface ProfileSectionProps {
  header?: React.ReactNode;
}

const STYLE_OPTIONS = [
  'Minimalist',
  'Streetwear',
  'Old Money',
  'Smart Casual',
  'Athleisure',
  'Classic / Formal',
  'Vintage',
  'Monochrome',
];

const FIT_OPTIONS = ['Slim', 'Regular', 'Relaxed', 'Oversized'];

export function ProfileSection({ header }: ProfileSectionProps) {
  const { colors } = useTheme();
  const { data: profile, isLoading } = useFashionProfile();
  const saveProfile = useSaveFashionProfile();

  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [shoulders, setShoulders] = useState('');
  const [inseam, setInseam] = useState('');
  const [neck, setNeck] = useState('');

  const [sizeTop, setSizeTop] = useState('');
  const [sizeBottom, setSizeBottom] = useState('');
  const [sizeShoes, setSizeShoes] = useState('');
  const [shoeSystem, setShoeSystem] = useState<'UK' | 'US' | 'EU'>('UK');

  const [preferredFitTop, setPreferredFitTop] = useState('Regular');
  const [preferredFitBottom, setPreferredFitBottom] = useState('Regular');

  const [styleTags, setStyleTags] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      if (profile.height) setHeight(String(profile.height));
      if (profile.weight) setWeight(String(profile.weight));
      if (profile.chest) setChest(String(profile.chest));
      if (profile.waist) setWaist(String(profile.waist));
      if (profile.hips) setHips(String(profile.hips));
      if (profile.shoulders) setShoulders(String(profile.shoulders));
      if (profile.inseam) setInseam(String(profile.inseam));
      if (profile.neck) setNeck(String(profile.neck));

      if (profile.sizeTop) setSizeTop(profile.sizeTop);
      if (profile.sizeBottom) setSizeBottom(profile.sizeBottom);
      if (profile.sizeShoes) setSizeShoes(profile.sizeShoes);
      if (profile.shoeSizeSystem) setShoeSystem(profile.shoeSizeSystem);

      if (profile.preferredFitTop) setPreferredFitTop(profile.preferredFitTop);
      if (profile.preferredFitBottom) setPreferredFitBottom(profile.preferredFitBottom);

      if (Array.isArray(profile.styleTags)) setStyleTags(profile.styleTags);
    }
  }, [profile]);

  const toggleStyleTag = (tag: string) => {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    const payload: FashionProfileData = {
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      chest: chest ? Number(chest) : null,
      waist: waist ? Number(waist) : null,
      hips: hips ? Number(hips) : null,
      shoulders: shoulders ? Number(shoulders) : null,
      inseam: inseam ? Number(inseam) : null,
      neck: neck ? Number(neck) : null,
      sizeTop,
      sizeBottom,
      sizeShoes,
      shoeSizeSystem: shoeSystem,
      preferredFitTop,
      preferredFitBottom,
      styleTags,
    };

    saveProfile.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Saved!', 'Your fit measurements and styling profile have been updated.');
      },
      onError: (err) => {
        Alert.alert('Error', err instanceof Error ? err.message : 'Could not save profile.');
      },
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {header ? header : null}

      {/* Hero Profile Intro */}
      <GlassCard glowColor="#ec4899" style={styles.introCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={[styles.iconBox, { backgroundColor: '#ec489920' }]}>
            <Ionicons name="sparkles" size={20} color="#ec4899" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 17, fontWeight: '700' }}>
              My Fit & Size Profile
            </Text>
            <Text variant="caption" muted>
              Record your measurements for instant size recommendations when shopping
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Sizing Standards Card */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.lg }}>
        <Text variant="caption" muted style={styles.sectionHeaderLabel}>
          STANDARD APPAREL SIZES
        </Text>

        <View style={styles.inputGrid}>
          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Top Size (Shirts/Tees)</Text>
            <TextInput
              value={sizeTop}
              onChangeText={setSizeTop}
              placeholder="e.g. M, L, 40"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Bottom Size (Waist)</Text>
            <TextInput
              value={sizeBottom}
              onChangeText={setSizeBottom}
              placeholder="e.g. 32, 34"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>
        </View>

        {/* Shoes */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" muted style={styles.fieldLabel}>Shoe Size</Text>
            <View style={[styles.systemToggle, { backgroundColor: colors.accent }]}>
              {(['UK', 'US', 'EU'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setShoeSystem(s)}
                  style={[
                    styles.systemBtn,
                    shoeSystem === s && { backgroundColor: colors.card },
                  ]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: shoeSystem === s ? colors.text : colors.textMuted }}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TextInput
            value={sizeShoes}
            onChangeText={setSizeShoes}
            placeholder={`e.g. 8.5, 9 (${shoeSystem})`}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
        </View>
      </GlassCard>

      {/* Measurements Card */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="caption" muted style={styles.sectionHeaderLabel}>
            BODY MEASUREMENTS ({unit.toUpperCase()})
          </Text>

          <View style={[styles.systemToggle, { backgroundColor: colors.accent }]}>
            <Pressable
              onPress={() => setUnit('cm')}
              style={[styles.systemBtn, unit === 'cm' && { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: unit === 'cm' ? colors.text : colors.textMuted }}>
                CM
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setUnit('in')}
              style={[styles.systemBtn, unit === 'in' && { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: unit === 'in' ? colors.text : colors.textMuted }}>
                IN
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGrid}>
          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Height ({unit === 'cm' ? 'cm' : 'in'})</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '178' : '70'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Chest ({unit})</Text>
            <TextInput
              value={chest}
              onChangeText={setChest}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '100' : '40'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Waist ({unit})</Text>
            <TextInput
              value={waist}
              onChangeText={setWaist}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '82' : '32'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Shoulders ({unit})</Text>
            <TextInput
              value={shoulders}
              onChangeText={setShoulders}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '46' : '18'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Inseam ({unit})</Text>
            <TextInput
              value={inseam}
              onChangeText={setInseam}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '78' : '30'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text variant="caption" muted style={styles.fieldLabel}>Neck ({unit})</Text>
            <TextInput
              value={neck}
              onChangeText={setNeck}
              keyboardType="numeric"
              placeholder={unit === 'cm' ? '39' : '15'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>
        </View>
      </GlassCard>

      {/* Style & Aesthetic Preferences */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.lg }}>
        <Text variant="caption" muted style={styles.sectionHeaderLabel}>
          STYLE VIBES & AESTHETICS
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {STYLE_OPTIONS.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={styleTags.includes(tag)}
              color="#ec4899"
              onPress={() => toggleStyleTag(tag)}
            />
          ))}
        </View>
      </GlassCard>

      {/* Save Button */}
      <Pressable
        accessibilityRole="button"
        onPress={handleSave}
        disabled={saveProfile.isPending}
        style={[styles.saveBtn, { backgroundColor: moduleColors.fashion }]}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
          {saveProfile.isPending ? 'Saving...' : 'Save My Fit Profile'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 88,
  },
  introCard: {
    padding: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inputCol: {
    width: '48%',
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
  },
  systemToggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius.sm,
  },
  systemBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm - 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
});
