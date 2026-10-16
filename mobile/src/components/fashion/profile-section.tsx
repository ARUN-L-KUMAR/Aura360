import { useRef, useState, type ReactNode } from 'react';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup, Chip } from '@/components/ui/chip';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFashionProfile, useSaveFashionProfile } from '@/features/fashion/hooks';
import type { FashionProfileData } from '@/features/fashion/types';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';
import { parseAmount, useListPadding } from './shared';

interface ProfileSectionProps {
  header?: ReactNode;
}

const STYLE_OPTIONS = ['Minimalist', 'Streetwear', 'Old money', 'Smart casual', 'Athleisure', 'Classic or formal', 'Vintage', 'Monochrome'];
const FIT_OPTIONS = ['Slim', 'Regular', 'Relaxed', 'Oversized'].map((fit) => ({ value: fit, label: fit }));
const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
];
const SHOE_SYSTEMS = (['UK', 'US', 'EU'] as const).map((s) => ({ value: s, label: s }));

type Unit = 'cm' | 'in';
type Measure = 'height' | 'chest' | 'waist' | 'shoulders' | 'inseam' | 'neck' | 'weight';

const MEASURES: { key: Measure; label: string; cm: string; inch: string }[] = [
  { key: 'height', label: 'Height', cm: '178', inch: '70' },
  { key: 'chest', label: 'Chest', cm: '100', inch: '40' },
  { key: 'waist', label: 'Waist', cm: '82', inch: '32' },
  { key: 'shoulders', label: 'Shoulders', cm: '46', inch: '18' },
  { key: 'inseam', label: 'Inseam', cm: '78', inch: '30' },
  { key: 'neck', label: 'Neck', cm: '39', inch: '15' },
];

const text = (value: unknown) => (value ? String(value) : '');

export function ProfileSection({ header }: ProfileSectionProps) {
  const profileQuery = useFashionProfile();
  const { paddingBottom } = useListPadding();
  const { data: profile, isPending, isError, error, refetch, isRefetching } = profileQuery;

  // A missing profile (404) just means a new user: show the empty form. Other failures show a retry above the form.
  const loadError = isError && errorKindFromError(error) !== 'notFound' ? error : null;

  let body: ReactNode;
  if (isPending && profileQuery.fetchStatus !== 'paused') {
    body = (
      <>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </>
    );
  } else {
    body = (
      <>
        {loadError ? <ErrorState size="inline" error={loadError} onRetry={() => void refetch()} retrying={isRefetching} /> : null}
        {/* Remount with fresh values whenever the saved profile changes on the server. */}
        <ProfileForm key={JSON.stringify(profile ?? null)} profile={profile} />
      </>
    );
  }

  return (
    <Screen onRefresh={() => void refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom }}>
      {header}
      {body}
    </Screen>
  );
}

function ProfileForm({ profile }: { profile: FashionProfileData | undefined }) {
  const notify = useNotify();
  const saveProfile = useSaveFashionProfile();

  const [unit, setUnit] = useState<Unit>('cm');
  const [measures, setMeasures] = useState<Record<Measure, string>>({
    height: text(profile?.height),
    weight: text(profile?.weight),
    chest: text(profile?.chest),
    waist: text(profile?.waist),
    shoulders: text(profile?.shoulders),
    inseam: text(profile?.inseam),
    neck: text(profile?.neck),
  });
  const [sizeTop, setSizeTop] = useState(profile?.sizeTop ?? '');
  const [sizeBottom, setSizeBottom] = useState(profile?.sizeBottom ?? '');
  const [sizeShoes, setSizeShoes] = useState(profile?.sizeShoes ?? '');
  const [shoeSystem, setShoeSystem] = useState<'UK' | 'US' | 'EU'>(profile?.shoeSizeSystem ?? 'UK');
  const [preferredFitTop, setPreferredFitTop] = useState(profile?.preferredFitTop || 'Regular');
  const [preferredFitBottom, setPreferredFitBottom] = useState(profile?.preferredFitBottom || 'Regular');
  const [styleTags, setStyleTags] = useState<string[]>(() => (Array.isArray(profile?.styleTags) ? [...(profile?.styleTags ?? [])] : []));
  const [showErrors, setShowErrors] = useState(false);

  const sizeTopRef = useRef<TextInput>(null);
  const sizeBottomRef = useRef<TextInput>(null);
  const sizeShoesRef = useRef<TextInput>(null);
  const measureRefs = useRef<(TextInput | null)[]>([]);

  const setMeasure = (key: Measure, value: string) => setMeasures((prev) => ({ ...prev, [key]: value }));
  const toggleStyleTag = (tag: string) => setStyleTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const parsed = Object.fromEntries(Object.entries(measures).map(([key, value]) => [key, parseAmount(value)])) as Record<Measure, ReturnType<typeof parseAmount>>;
  const hasInvalid = Object.values(parsed).some((p) => !p.valid);

  const handleSave = () => {
    if (hasInvalid) {
      setShowErrors(true);
      notify.warning('Check the highlighted measurements');
      return;
    }
    const payload: FashionProfileData = {
      height: parsed.height.value,
      weight: parsed.weight.value,
      chest: parsed.chest.value,
      waist: parsed.waist.value,
      hips: profile?.hips || null,
      shoulders: parsed.shoulders.value,
      inseam: parsed.inseam.value,
      neck: parsed.neck.value,
      sizeTop,
      sizeBottom,
      sizeShoes,
      shoeSizeSystem: shoeSystem,
      preferredFitTop,
      preferredFitBottom,
      styleTags,
    };
    saveProfile.mutate(payload, {
      onSuccess: () => notify.success('Fit profile saved'),
      onError: (err) => notify.error(err),
    });
  };

  const measureError = (key: Measure) => (showErrors && !parsed[key].valid ? 'Enter a number, like 70 or 70.5' : undefined);

  return (
    <>
      <Card style={{ gap: spacing.lg }}>
        <SectionHeader title="Standard sizes" subtitle="The sizes you usually buy." />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            ref={sizeTopRef}
            containerStyle={{ flex: 1 }}
            label="Top size"
            placeholder="M, L or 40"
            value={sizeTop}
            onChangeText={setSizeTop}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => sizeBottomRef.current?.focus()}
          />
          <Input
            ref={sizeBottomRef}
            containerStyle={{ flex: 1 }}
            label="Bottom size"
            placeholder="32 or 34"
            value={sizeBottom}
            onChangeText={setSizeBottom}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => sizeShoesRef.current?.focus()}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Shoe size system</Text>
          <Segmented options={SHOE_SYSTEMS} value={shoeSystem} onChange={setShoeSystem} accessibilityLabel="Shoe size system" />
          <Input
            ref={sizeShoesRef}
            label="Shoe size"
            placeholder={`8.5 or 9 (${shoeSystem})`}
            value={sizeShoes}
            onChangeText={setSizeShoes}
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => measureRefs.current[0]?.focus()}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Preferred fit for tops</Text>
          <Segmented options={FIT_OPTIONS} value={preferredFitTop} onChange={setPreferredFitTop} accessibilityLabel="Preferred fit for tops" />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">Preferred fit for bottoms</Text>
          <Segmented options={FIT_OPTIONS} value={preferredFitBottom} onChange={setPreferredFitBottom} accessibilityLabel="Preferred fit for bottoms" />
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SectionHeader title="Body measurements" subtitle="Used for size suggestions when you shop." />
        <Segmented options={UNIT_OPTIONS} value={unit} onChange={setUnit} accessibilityLabel="Measurement unit" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {MEASURES.map((m, index) => (
            <View key={m.key} style={{ width: '47%', flexGrow: 1 }}>
              <Input
                ref={(el) => {
                  measureRefs.current[index] = el;
                }}
                label={`${m.label} (${unit})`}
                placeholder={unit === 'cm' ? m.cm : m.inch}
                value={measures[m.key]}
                onChangeText={(value) => setMeasure(m.key, value)}
                error={measureError(m.key)}
                keyboardType="decimal-pad"
                returnKeyType={index === MEASURES.length - 1 ? 'done' : 'next'}
                submitBehavior={index === MEASURES.length - 1 ? "blurAndSubmit" : "submit"}
                onSubmitEditing={() => measureRefs.current[index + 1]?.focus()}
              />
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Style" subtitle="Pick the looks you gravitate towards." />
        <ChipGroup>
          {STYLE_OPTIONS.map((tag) => (
            <Chip key={tag} label={tag} accent="fashion" selected={styleTags.includes(tag)} onPress={() => toggleStyleTag(tag)} />
          ))}
        </ChipGroup>
      </Card>

      <View style={{ marginTop: layout.itemGap }}>
        <Button title="Save fit profile" leftIcon="checkmark" loading={saveProfile.isPending} onPress={handleSave} />
      </View>
    </>
  );
}
