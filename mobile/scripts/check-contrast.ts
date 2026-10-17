/**
 * Verifies WCAG AA contrast for every semantic colour pair in the theme.
 *
 *   npm run check:contrast
 *
 * Text pairs need 4.5:1, icon / control-boundary pairs need 3:1. Exits 1 when any pair fails.
 * Runs under plain Node (>= 22.18) because theme/colors.ts has no React Native imports.
 */
import { categoryAccent, palettes, type ColorScheme, type ModuleKey, categoryRamps, type ThemeColors } from '../src/theme/colors.ts';

const channel = (hex: string, i: number) => {
  const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

type Pair = [fg: string, bg: string, min: number, label: string];
let failures = 0;
let checked = 0;

function check(scheme: ColorScheme, pairs: Pair[]) {
  for (const [fg, bg, min, label] of pairs) {
    checked++;
    const r = ratio(fg, bg);
    if (r + 1e-9 < min) {
      failures++;
      console.log(`FAIL ${scheme.padEnd(5)} ${r.toFixed(2).padStart(5)} < ${min}  ${label}  (${fg} on ${bg})`);
    }
  }
}

for (const scheme of ['light', 'dark'] as const) {
  const c: ThemeColors = palettes[scheme];
  // glassSolid is what overlays (tab bar, app bar, sheets) paint when blur is unavailable.
  const surfaces: (keyof ThemeColors)[] = ['background', 'card', 'cardMuted', 'glassSolid'];
  const pairs: Pair[] = [];

  for (const s of surfaces) {
    for (const t of ['text', 'textSecondary', 'textMuted', 'primaryAccent', 'successText', 'warningText', 'errorText', 'infoText'] as const) {
      pairs.push([c[t], c[s], 4.5, `${t} on ${s}`]);
    }
    for (const t of ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info'] as const) {
      pairs.push([c[t], c[s], 3, `${t} (icon/UI) on ${s}`]);
    }
  }
  for (const s of ['background', 'card', 'glassSolid'] as const) {
    pairs.push([c.borderStrong, c[s], 3, `borderStrong on ${s}`], [c.focusRing, c[s], 3, `focusRing on ${s}`]);
  }
  pairs.push(
    [c.primaryText, c.primary, 4.5, 'primaryText on primary'],
    [c.secondaryText, c.secondary, 4.5, 'secondaryText on secondary'],
    [c.tertiaryText, c.tertiary, 4.5, 'tertiaryText on tertiary'],
    [c.onPrimaryContainer, c.primaryContainer, 4.5, 'onPrimaryContainer on primaryContainer'],
    [c.onTertiaryContainer, c.tertiaryContainer, 4.5, 'onTertiaryContainer on tertiaryContainer'],
    [c.accentForeground, c.accent, 4.5, 'accentForeground on accent'],
    [c.textInverse, c.text, 4.5, 'textInverse on text'],
  );
  for (const k of ['success', 'warning', 'error', 'info'] as const) {
    const cap = k[0].toUpperCase() + k.slice(1);
    pairs.push(
      [c[`on${cap}` as keyof ThemeColors], c[k], 4.5, `on${cap} on ${k}`],
      [c[`on${cap}Container` as keyof ThemeColors], c[`${k}Container` as keyof ThemeColors], 4.5, `on${cap}Container on ${k}Container`],
      [c[k], c[`${k}Container` as keyof ThemeColors], 3, `${k} (icon/check) on ${k}Container`],
      [c[`${k}Text` as keyof ThemeColors], c[`${k}Container` as keyof ThemeColors], 4.5, `${k}Text on ${k}Container`],
    );
  }
  pairs.push([c.onDanger, c.danger, 4.5, 'onDanger on danger']);

  // Shared UI library combinations that the generic loops above do not reach.
  pairs.push(
    [c.primaryAccent, c.cardMuted, 4.5, 'primaryAccent on cardMuted (ghost button pressed)'],
    [c.textInverse, c.textSecondary, 4.5, 'textInverse on textSecondary (neutral count badge)'],
    [c.borderStrong, c.cardMuted, 3, 'borderStrong on cardMuted (toggle thumb off, segmented thumb edge)'],
    [c.primary, c.cardMuted, 3, 'primary on cardMuted (progress fill on track)'],
    [c.onPrimaryContainer, c.cardMuted, 4.5, 'onPrimaryContainer on cardMuted'],
  );

  for (const key of Object.keys(categoryRamps) as ModuleKey[]) {
    const a = categoryAccent(key, scheme);
    pairs.push(
      [a.onSolid, a.solid, 4.5, `accent ${key}: onSolid on solid`],
      [a.text, c.card, 4.5, `accent ${key}: text on card`],
      [a.text, a.soft, 4.5, `accent ${key}: text on soft`],
      [a.solid, c.card, 3, `accent ${key}: solid on card`],
      [a.solid, c.background, 3, `accent ${key}: solid on background`],
      [a.solid, c.cardMuted, 3, `accent ${key}: solid on cardMuted (progress track)`],
      [a.text, c.cardMuted, 4.5, `accent ${key}: text on cardMuted`],
      [a.text, c.glassSolid, 4.5, `accent ${key}: text on glassSolid`],
    );
  }
  check(scheme, pairs);
}

console.log(`${checked - failures}/${checked} pairs pass WCAG AA.`);
process.exit(failures ? 1 : 0);
