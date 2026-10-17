import { memo } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { IconDisc } from '@/components/onboarding/icon-disc';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

/**
 * The three onboarding illustrations, drawn from tokens only (accent discs, SVG rings, plain views): no image assets.
 * All are decorative and hidden from screen readers; the slide's headline and text carry the meaning.
 */

const STAGE = spacing.xxxl * 5; // 240
const SATELLITE = spacing.xxxl; // 48
const HUB = spacing.xxxl * 2; // 96
const ORBIT = (STAGE - SATELLITE) / 2; // 96
const RING_STROKE = 2;
const DASH = spacing.sm;

const ORBIT_MODULES: ModuleKey[] = ['finance', 'fitness', 'food', 'notes', 'fashion', 'skincare'];

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** A dashed circle, centred in a STAGE-sized square. */
function DashedRing({ radiusPx }: { radiusPx: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill}>
      <Circle
        cx={STAGE / 2}
        cy={STAGE / 2}
        r={radiusPx}
        stroke={colors.borderStrong}
        strokeWidth={RING_STROKE}
        strokeDasharray={`${DASH} ${DASH}`}
        fill="none"
      />
    </Svg>
  );
}

/** Slide 1: the assistant hub with the six everyday modules orbiting it. */
export const OrbitIllustration = memo(function OrbitIllustration() {
  return (
    <View {...HIDDEN} style={styles.stage}>
      <DashedRing radiusPx={ORBIT} />
      <IconDisc icon="sparkles" size={HUB} accent="ai" />
      {ORBIT_MODULES.map((key, i) => {
        const angle = (i / ORBIT_MODULES.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <IconDisc
            key={key}
            icon={modules[key].icon}
            size={SATELLITE}
            accent={key}
            style={[styles.absolute, { transform: [{ translateX: Math.cos(angle) * ORBIT }, { translateY: Math.sin(angle) * ORBIT }] }]}
          />
        );
      })}
    </View>
  );
});

const BAR = spacing.sm;
const AVATAR = spacing.xxl;

function Bars({ widths, color }: { widths: DimensionValue[]; color: string }) {
  return (
    <View style={styles.bars}>
      {widths.map((width, i) => (
        <View key={i} style={[styles.bar, { width, backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** Slide 2: a short chat, Aura answering a question. */
export const ChatIllustration = memo(function ChatIllustration() {
  const { colors, accent } = useTheme();
  const ai = accent('ai');
  return (
    <View {...HIDDEN} style={[styles.chat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.chatRow}>
        <IconDisc icon="sparkles" size={AVATAR} accent="ai" />
        <View style={[styles.bubble, styles.fill, { backgroundColor: ai.soft, borderColor: ai.border }]}>
          <Bars widths={['90%', '60%']} color={ai.border} />
        </View>
      </View>
      <View style={[styles.bubble, styles.mine, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <Bars widths={['100%']} color={colors.primaryText} />
      </View>
      <View style={styles.chatRow}>
        <IconDisc icon="sparkles" size={AVATAR} accent="ai" />
        <View style={[styles.bubble, styles.fill, { backgroundColor: ai.soft, borderColor: ai.border }]}>
          <Bars widths={['100%', '85%', '40%']} color={ai.border} />
        </View>
      </View>
    </View>
  );
});

/** Slide 3: a phone-sized hub that keeps working while the cloud is away, with a sync badge. */
export const OfflineIllustration = memo(function OfflineIllustration() {
  return (
    <View {...HIDDEN} style={styles.stage}>
      <DashedRing radiusPx={STAGE / 2 - RING_STROKE} />
      <IconDisc icon="cloud-offline-outline" size={HUB + spacing.xxl} accent="saved" />
      <IconDisc icon="phone-portrait-outline" size={SATELLITE} accent="time" style={[styles.absolute, styles.topStart]} />
      <IconDisc icon="checkmark-done-outline" size={SATELLITE} accent="finance" style={[styles.absolute, styles.topEnd]} />
      <IconDisc icon="sync-outline" size={SATELLITE} accent="ai" style={[styles.absolute, styles.bottomEnd]} />
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  topStart: { top: spacing.xl, start: spacing.xl },
  topEnd: { top: spacing.xl, end: spacing.xl },
  bottomEnd: { bottom: spacing.xl, end: spacing.xl },
  chat: {
    width: '100%',
    maxWidth: STAGE + SATELLITE,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  chatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  fill: { flex: 1 },
  bubble: { padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  mine: { alignSelf: 'flex-end', width: '60%' },
  bars: { gap: spacing.sm },
  bar: { height: BAR, borderRadius: radius.pill },
});
