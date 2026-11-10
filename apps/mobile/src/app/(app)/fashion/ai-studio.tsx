import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { categoryIcon, categoryLabel } from '@/components/fashion/labels';
import { Heading, RingCard } from '@/components/fashion/section-kit';
import { FashionImage } from '@/components/fashion/shared';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useFashionItems, useSaveOutfit } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { api } from '@/lib/api';
import { useNotify } from '@/providers/notify';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

type StudioTab = 'outfits' | 'critique' | 'gaps';

// The English value is what the AI endpoint receives; only the label is translated.
const OCCASIONS = [
  { value: 'Casual', key: 'casual' },
  { value: 'Work & Office', key: 'work' },
  { value: 'Evening / Party', key: 'evening' },
  { value: 'Date Night', key: 'date' },
  { value: 'Active / Sporty', key: 'active' },
] as const;
const VIBES = [
  { value: 'Minimalist', key: 'minimalist' },
  { value: 'Monochrome', key: 'monochrome' },
  { value: 'Smart Casual', key: 'smartCasual' },
  { value: 'Streetwear', key: 'streetwear' },
  { value: 'Tailored', key: 'tailored' },
  { value: 'Warm Earthy', key: 'warmEarthy' },
] as const;

interface GeneratedOutfit {
  id: string;
  name: string;
  vibe: string;
  occasion: string;
  itemIds: string[];
  pieces?: FashionItem[];
  stylingTips?: string;
  colorTheory?: string;
  harmonyScore?: number;
}

interface StyleCritique {
  harmonyScore: number;
  verdict: string;
  colorHarmony: string;
  silhouetteAndProportions: string;
  elevationDirectives: string[];
  suggestedAddition?: string;
}

interface GapItem {
  category: string;
  recommendedItem: string;
  why: string;
  priority: string;
}

interface GapAnalysis {
  versatilityScore: number;
  strengths: string[];
  missingEssentials: GapItem[];
}

export default function AiStylingStudioScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('fashion');
  const { colors, accent } = useTheme();
  const a = accent('fashion');

  const [tab, setTab] = useState<StudioTab>('outfits');

  // Generate tab states
  const [occasion, setOccasion] = useState('Casual');
  const [vibe, setVibe] = useState('Minimalist');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);

  // Critique tab states
  const [selectedPieceIds, setSelectedPieceIds] = useState<string[]>([]);
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [critique, setCritique] = useState<StyleCritique | null>(null);

  // Gaps tab states
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);

  const { data: allItems } = useFashionItems();
  const wardrobeItems = useMemo(() => (allItems ?? []).filter((i) => i.status === 'wardrobe'), [allItems]);

  const saveOutfitMutation = useSaveOutfit();

  const handleGenerateOutfits = async () => {
    if (wardrobeItems.length === 0) {
      notify.warning(t('studio.notify.emptyWardrobe'));
      return;
    }

    try {
      setIsGenerating(true);
      const res = await api.post<{ success: boolean; outfits?: GeneratedOutfit[]; message?: string }>('/api/fashion/ai-designer', {
        action: 'generate_outfits',
        params: { occasion, vibe },
      });

      if (res.outfits && res.outfits.length > 0) {
        setOutfits(res.outfits);
        notify.success(t('studio.notify.created', { count: res.outfits.length }));
      } else {
        notify.info(res.message || t('studio.notify.none'));
      }
    } catch (err: any) {
      notify.error(err?.message || t('studio.notify.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedOutfit = async (outfit: GeneratedOutfit) => {
    try {
      const pieceIds = outfit.pieces ? outfit.pieces.map((p) => p.id) : outfit.itemIds || [];
      await saveOutfitMutation.mutateAsync({
        name: outfit.name,
        occasion: outfit.occasion,
        vibe: outfit.vibe,
        itemIds: pieceIds,
        notes: outfit.stylingTips || t('studio.generatedNote'),
      });
      notify.success(t('studio.notify.saved', { name: outfit.name }));
    } catch (err: any) {
      notify.error(err?.message || t('studio.notify.saveFailed'));
    }
  };

  const handleTogglePieceSelection = (id: string) => {
    setSelectedPieceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleCritiqueLook = async () => {
    if (selectedPieceIds.length < 2) {
      notify.warning(t('studio.notify.pickTwo'));
      return;
    }

    try {
      setIsCritiquing(true);
      const selectedItems = wardrobeItems.filter((i) => selectedPieceIds.includes(i.id));
      const res = await api.post<{ success: boolean; critique?: StyleCritique }>('/api/fashion/ai-designer', {
        action: 'critique_look',
        params: {
          items: selectedItems.map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            color: i.color,
          })),
        },
      });

      if (res.critique) {
        setCritique(res.critique);
      }
    } catch (err: any) {
      notify.error(err?.message || t('studio.notify.critiqueFailed'));
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleAnalyzeGaps = async () => {
    try {
      setIsAnalyzingGaps(true);
      const res = await api.post<{ success: boolean; analysis?: GapAnalysis }>('/api/fashion/ai-designer', {
        action: 'analyze_gaps',
      });

      if (res.analysis) {
        setGapAnalysis(res.analysis);
      }
    } catch (err: any) {
      notify.error(err?.message || t('studio.notify.gapsFailed'));
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  return (
    <Screen topInset={false}>
      <Stack.Screen
        options={{
          title: t('studio.title'),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="sparkles" size={16} color={a.solid} />
              <Text variant="caption" weight="bold" style={{ color: a.solid }}>
                {t('studio.badge')}
              </Text>
            </View>
          ),
        }}
      />

      <Segmented<StudioTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'outfits', label: t('studio.tabs.outfits') },
          { value: 'critique', label: t('studio.tabs.critique') },
          { value: 'gaps', label: t('studio.tabs.gaps') },
        ]}
      />

      {tab === 'outfits' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <RingCard accent="fashion">
            <Heading title={t('studio.params.title')} subtitle={t('studio.params.subtitle')} />

            <Text variant="overline" muted style={styles.fieldLabel}>
              {t('studio.params.occasion')}
            </Text>
            <ChipRow>
              {OCCASIONS.map((occ) => (
                <Chip key={occ.value} label={t(`studio.occasions.${occ.key}`)} selected={occasion === occ.value} onPress={() => setOccasion(occ.value)} />
              ))}
            </ChipRow>

            <Text variant="overline" muted style={[styles.fieldLabel, { marginTop: spacing.md }]}>
              {t('studio.params.vibe')}
            </Text>
            <ChipRow>
              {VIBES.map((vb) => (
                <Chip key={vb.value} label={t(`studio.vibes.${vb.key}`)} selected={vibe === vb.value} onPress={() => setVibe(vb.value)} />
              ))}
            </ChipRow>

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={isGenerating ? t('studio.generating') : t('studio.generate')}
                onPress={handleGenerateOutfits}
                disabled={isGenerating}
                loading={isGenerating}
                leftIcon="sparkles"
              />
            </View>
          </RingCard>

          {outfits.length > 0 && (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <Text variant="title" weight="bold">
                {t('studio.curated')}
              </Text>

              {outfits.map((look, idx) => (
                <RingCard key={look.id || idx} accent="fashion">
                  <View style={styles.outfitHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">
                        {look.name}
                      </Text>
                      <Text variant="caption" style={{ color: colors.textMuted }}>
                        {look.occasion} • {look.vibe}
                      </Text>
                    </View>
                    {look.harmonyScore ? (
                      <View style={[styles.scoreBadge, { backgroundColor: a.soft }]}>
                        <Ionicons name="sparkles" size={12} color={a.solid} />
                        <Text variant="caption" weight="bold" style={{ color: a.solid }}>
                          {look.harmonyScore}%
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Piece Thumbnails */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pieceRow}>
                    {(look.pieces || []).map((piece) => (
                      <View key={piece.id} style={styles.pieceCard}>
                        <FashionImage uri={piece.imageUrl} style={{ width: 72, height: 72, borderRadius: radius.md }} />
                        <Text variant="caption" numberOfLines={1} style={styles.pieceName}>
                          {piece.name}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Styling Tips */}
                  {look.stylingTips ? (
                    <View style={[styles.tipBox, { backgroundColor: colors.cardMuted }]}>
                      <Ionicons name="bulb-outline" size={16} color={a.solid} />
                      <Text variant="caption" style={{ flex: 1, color: colors.text }}>
                        {look.stylingTips}
                      </Text>
                    </View>
                  ) : null}

                  {/* Color Theory */}
                  {look.colorTheory ? (
                    <Text variant="caption" style={{ color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs }}>
                      {t('studio.colorHarmony', { text: look.colorTheory })}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: spacing.md }}>
                    <Button
                      variant="outline"
                      title={t('studio.save')}
                      leftIcon="bookmark"
                      onPress={() => handleSaveGeneratedOutfit(look)}
                    />
                  </View>
                </RingCard>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'critique' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <RingCard accent="fashion">
            <Heading title={t('studio.pick.title')} subtitle={t('studio.pick.subtitle')} />

            <View style={styles.gridContainer}>
              {wardrobeItems.map((item) => {
                const isSelected = selectedPieceIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleTogglePieceSelection(item.id)}
                    style={[
                      styles.selectableItem,
                      { borderColor: colors.border },
                      isSelected && { borderColor: a.solid, borderWidth: 2, backgroundColor: a.soft },
                    ]}>
                    <FashionImage uri={item.imageUrl} style={{ width: 64, height: 64, borderRadius: radius.md }} />
                    <Text variant="caption" numberOfLines={1} style={{ textAlign: 'center', marginTop: spacing.xs }}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkIcon, { backgroundColor: a.solid }]}>
                        <Ionicons name="checkmark" size={12} color={a.onSolid} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={isCritiquing ? t('studio.analyzing') : t('studio.analyze', { count: selectedPieceIds.length })}
                onPress={handleCritiqueLook}
                disabled={isCritiquing || selectedPieceIds.length < 2}
                loading={isCritiquing}
                leftIcon="color-wand"
              />
            </View>
          </RingCard>

          {critique && (
            <RingCard accent="fashion">
              <View style={styles.outfitHeader}>
                <Heading title={t('studio.verdict')} subtitle={critique.verdict} />
                <View style={[styles.scoreBadge, { backgroundColor: a.soft }]}>
                  <Text variant="headline" style={{ color: a.solid }}>
                    {critique.harmonyScore}
                  </Text>
                  <Text variant="caption" style={{ color: a.solid }}>
                    /100
                  </Text>
                </View>
              </View>

              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={[styles.tipBox, { backgroundColor: colors.cardMuted }]}>
                  <Ionicons name="contrast-outline" size={16} color={a.solid} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" weight="bold">
                      {t('studio.colorCoordination')}
                    </Text>
                    <Text variant="caption" style={{ color: colors.textMuted }}>
                      {critique.colorHarmony}
                    </Text>
                  </View>
                </View>

                <View style={[styles.tipBox, { backgroundColor: colors.cardMuted }]}>
                  <Ionicons name="body-outline" size={16} color={a.solid} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" weight="bold">
                      {t('studio.silhouette')}
                    </Text>
                    <Text variant="caption" style={{ color: colors.textMuted }}>
                      {critique.silhouetteAndProportions}
                    </Text>
                  </View>
                </View>

                {critique.elevationDirectives?.length > 0 && (
                  <View style={{ marginTop: spacing.xs }}>
                    <Text variant="overline" muted style={styles.fieldLabel}>
                      {t('studio.elevate')}
                    </Text>
                    {critique.elevationDirectives.map((dir, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.xs }}>
                        <Ionicons name="arrow-up-circle" size={14} color={a.solid} style={{ marginTop: 2 }} />
                        <Text variant="caption" style={{ flex: 1, color: colors.text }}>
                          {dir}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </RingCard>
          )}
        </ScrollView>
      )}

      {tab === 'gaps' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <RingCard accent="fashion">
            <Heading title={t('studio.gaps.title')} subtitle={t('studio.gaps.subtitle')} />

            <Button
              title={isAnalyzingGaps ? t('studio.gaps.running') : t('studio.gaps.run')}
              onPress={handleAnalyzeGaps}
              disabled={isAnalyzingGaps}
              loading={isAnalyzingGaps}
              leftIcon="analytics"
            />
          </RingCard>

          {gapAnalysis && (
            <View style={{ gap: spacing.md }}>
              <RingCard accent="fashion">
                <View style={styles.outfitHeader}>
                  <View>
                    <Text variant="headline">
                      {t('studio.gaps.score')}
                    </Text>
                    <Text variant="caption" style={{ color: colors.textMuted }}>
                      {t('studio.gaps.scoreHint')}
                    </Text>
                  </View>
                  <Text variant="display" style={{ color: a.solid }}>
                    {gapAnalysis.versatilityScore}%
                  </Text>
                </View>

                {gapAnalysis.strengths?.length > 0 && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text variant="overline" muted style={styles.fieldLabel}>
                      {t('studio.gaps.strengths')}
                    </Text>
                    {gapAnalysis.strengths.map((str, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs }}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text variant="caption" style={{ color: colors.text }}>
                          {str}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </RingCard>

              {gapAnalysis.missingEssentials?.map((gap, i) => (
                <RingCard key={i} accent="fashion">
                  <View style={styles.outfitHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="headline">
                        {gap.recommendedItem}
                      </Text>
                      <Text variant="caption" style={{ color: colors.textMuted }}>
                        {t('studio.gaps.category', { name: gap.category })}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: gap.priority === 'high' ? colors.errorContainer : colors.warningContainer }]}>
                      <Text variant="overline" style={{ color: gap.priority === 'high' ? colors.errorText : colors.warningText }}>
                        {gap.priority}
                      </Text>
                    </View>
                  </View>

                  <Text variant="caption" style={{ color: colors.text, marginTop: spacing.sm }}>
                    {gap.why}
                  </Text>
                </RingCard>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
  },
  outfitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pieceRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pieceCard: {
    width: 76,
    alignItems: 'center',
  },
  pieceName: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  selectableItem: {
    width: 76,
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    position: 'relative',
  },
  checkIcon: {
    position: 'absolute',
    top: 2,
    end: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

