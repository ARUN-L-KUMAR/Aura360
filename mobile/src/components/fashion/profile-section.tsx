import { useRef, useState, type ReactNode } from 'react';
import { View, type TextInput } from 'react-native';

import { failureMessage } from '@/components/finance/failure-message';
import { RefreshError } from '@/components/finance/load-error';
import { Button } from '@/components/ui/button';
import { ChipGroup, Chip } from '@/components/ui/chip';
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFashionProfile, useSaveFashionProfile } from '@/features/fashion/hooks';
import type { FashionProfileData } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';
import { fitLabel, styleLabel } from './labels';
import { Heading, RingCard } from './section-kit';
import { parseAmount, useListPadding } from './shared';

interface ProfileSectionProps {
  header?: ReactNode;
}

const STYLE_OPTIONS = ['Minimalist', 'Streetwear', 'Old money', 'Smart casual', 'Athleisure', 'Classic or formal', 'Vintage', 'Monochrome'];
/** Stored values; labels are looked up where they are drawn. */
const FIT_VALUES = ['Slim', 'Regular', 'Relaxed', 'Oversized'];
const SHOE_SYSTEMS = (['UK', 'US', 'EU'] as const).map((s) => ({ value: s, label: s }));

type Unit = 'cm' | 'in';
type Measure = 'height' | 'chest' | 'waist' | 'shoulders' | 'inseam' | 'neck' | 'weight';

const MEASURES: { key: Exclude<Measure, 'weight'>; cm: string; inch: string }[] = [
  { key: 'height', cm: '178', inch: '70' },
  { key: 'chest', cm: '100', inch: '40' },
  { key: 'waist', cm: '82', inch: '32' },
  { key: 'shoulders', cm: '46', inch: '18' },
  { key: 'inseam', cm: '78', inch: '30' },
  { key: 'neck', cm: '39', inch: '15' },
];

const text = (value: unknown) => (value ? String(value) : '');

export function ProfileSection({ header }: ProfileSectionProps) {
  const profileQuery = useFashionProfile();
  const { t } = useTranslation('fashion');
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
        {loadError ? (
          profile ? (
            <RefreshError error={loadError} onRetry={() => void refetch()} retrying={isRefetching} />
          ) : (
            <ErrorState size="inline" error={loadError} title={errorKindFromError(loadError) === 'generic' ? t('errors.loadItems') : undefined} onRetry={() => void refetch()} retrying={isRefetching} />
          )
        ) : null}
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
  const { t } = useTranslation('fashion');
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

  const unitOptions: { value: Unit; label: string }[] = [
    { value: 'cm', label: t('profile.units.cm') },
    { value: 'in', label: t('profile.units.in') },
  ];
  const fitOptions = FIT_VALUES.map((fit) => ({ value: fit, label: fitLabel(fit) }));

  const parsed = Object.fromEntries(Object.entries(measures).map(([key, value]) => [key, parseAmount(value)])) as Record<Measure, ReturnType<typeof parseAmount>>;
  const hasInvalid = Object.values(parsed).some((p) => !p.valid);

  const handleSave = () => {
    if (hasInvalid) {
      setShowErrors(true);
      notify.warning(t('profile.checkMeasures'));
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
      onSuccess: () => notify.success(t('profile.saved')),
      onError: (err) => notify.error(failureMessage(err, t('errors.saveProfile'))),
    });
  };

  const measureError = (key: Measure) => (showErrors && !parsed[key].valid ? t('profile.measureInvalid') : undefined);

  return (
    <>
      <RingCard padding="sm">
        <Heading overline={t('profile.sizesOverline')} title={t('profile.sizesTitle')} subtitle={t('profile.sizesHint')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            ref={sizeTopRef}
            containerStyle={{ flex: 1 }}
            label={t('profile.topSize')}
            placeholder={t('profile.topPlaceholder')}
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
            label={t('profile.bottomSize')}
            placeholder={t('profile.bottomPlaceholder')}
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
          <Text variant="label" accessibilityRole="header">
            {t('profile.shoeSystem')}
          </Text>
          <Segmented options={SHOE_SYSTEMS} value={shoeSystem} onChange={setShoeSystem} accessibilityLabel={t('profile.shoeSystem')} />
          <Input
            ref={sizeShoesRef}
            label={t('profile.shoeSize')}
            placeholder={t('profile.shoePlaceholder', { system: shoeSystem })}
            value={sizeShoes}
            onChangeText={setSizeShoes}
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => measureRefs.current[0]?.focus()}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" accessibilityRole="header">
            {t('profile.fitTop')}
          </Text>
          <Segmented options={fitOptions} value={preferredFitTop} onChange={setPreferredFitTop} accessibilityLabel={t('profile.fitTop')} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" accessibilityRole="header">
            {t('profile.fitBottom')}
          </Text>
          <Segmented options={fitOptions} value={preferredFitBottom} onChange={setPreferredFitBottom} accessibilityLabel={t('profile.fitBottom')} />
        </View>
      </RingCard>

      <RingCard padding="sm">
        <Heading overline={t('profile.measuresOverline')} title={t('profile.measuresTitle')} subtitle={t('profile.measuresHint')} />
        <Segmented options={unitOptions} value={unit} onChange={setUnit} accessibilityLabel={t('profile.unit')} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {MEASURES.map((m, index) => (
            <View key={m.key} style={{ width: '47%', flexGrow: 1 }}>
              <Input
                ref={(el) => {
                  measureRefs.current[index] = el;
                }}
                label={t('profile.measureLabel', { measure: t(`profile.measures.${m.key}` as const), unit: t(`profile.units.${unit}` as const) })}
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
      </RingCard>

      <RingCard padding="sm">
        <Heading overline={t('profile.styleOverline')} title={t('profile.styleTitle')} subtitle={t('profile.styleHint')} />
        <ChipGroup>
          {STYLE_OPTIONS.map((tag) => (
            <Chip key={tag} label={styleLabel(tag)} accent="fashion" selected={styleTags.includes(tag)} onPress={() => toggleStyleTag(tag)} />
          ))}
        </ChipGroup>
      </RingCard>

      <View style={{ marginTop: layout.itemGap }}>
        <Button title={t('profile.save')} leftIcon="checkmark" loading={saveProfile.isPending} onPress={handleSave} />
      </View>
    </>
  );
}
