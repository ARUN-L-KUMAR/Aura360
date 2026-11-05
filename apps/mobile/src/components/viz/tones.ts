import { useMemo } from 'react';

import { withAlpha } from '@/components/ui/logic';
import { useTheme, type ModuleKey } from '@/theme';

/** Opacity of the less emphasised bars / segments next to a highlighted one. */
const MUTED_ALPHA = 0.5;

export type VizTones = {
  /** Main data colour: the module accent, or the brand colour when no module is given. */
  solid: string;
  /** Text / icon colour that reads on `solid`. */
  onSolid: string;
  /** Tinted surface (icon chip, soft fills). */
  soft: string;
  /** Accent-coloured text or thin strokes on a card surface (>= 4.5:1). */
  text: string;
  /** Lighter tone that reads when drawn on top of `solid` (the second lap of a ring). */
  lap: string;
  /** Quiet, still visible version of `solid` for secondary data. */
  muted: string;
  /** Empty part of a ring or donut. */
  track: string;
};

/** Colours shared by the visualisation components, all derived from the theme tokens. */
export function useVizTones(accentKey?: ModuleKey): VizTones {
  const { colors, scheme, accent } = useTheme();
  return useMemo(() => {
    const a = accentKey ? accent(accentKey) : null;
    const solid = a ? a.solid : colors.primary;
    return {
      solid,
      onSolid: a ? a.onSolid : colors.primaryText,
      soft: a ? a.soft : colors.primaryContainer,
      text: a ? a.text : colors.primaryAccent,
      lap: scheme === 'light' ? (a ? a.border : colors.primaryContainer) : a ? a.text : colors.primaryAccent,
      muted: withAlpha(solid, MUTED_ALPHA),
      track: colors.border,
    };
  }, [accentKey, accent, colors, scheme]);
}

/** Order that spreads neighbouring segments across the hue wheel. */
const DONUT_ORDER: readonly ModuleKey[] = ['finance', 'fitness', 'skincare', 'fashion', 'saved', 'food', 'time', 'notes', 'ai'];

/**
 * `count` distinguishable tones for donut segments or legend dots, derived from the module accents (every accent has the
 * same contrast guarantees on the card). The first is the chart's own accent; the rest walk around the hue wheel. More
 * than nine segments repeat from the start, so group the long tail into "other" instead.
 */
export function useDonutColors(count: number, accentKey?: ModuleKey): string[] {
  const { colors, accent } = useTheme();
  return useMemo(() => {
    const first = accentKey ? accent(accentKey).solid : colors.primary;
    const rest = DONUT_ORDER.filter((key) => key !== accentKey).map((key) => accent(key).solid);
    const palette = [first, ...rest];
    const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
    return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
  }, [count, accentKey, accent, colors]);
}
