import { useId, type ComponentType, type ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Ramp, Shade } from '../../../theme/colors';
import type { ScenePalette } from '../../palette';
import type { SceneDef, SceneLayer, SceneProps } from '../../types';

/**
 * Shared pieces for the spot illustrations (empty states, errors, onboarding, permissions). Every spot scene is drawn
 * on a 240 x 180 canvas: a soft backdrop blob, the main objects, and one small floating detail that the app may animate.
 * Pure SVG, colours only from the ScenePalette.
 */
export const VIEW_W = 240;
export const VIEW_H = 180;
export const ASPECT = VIEW_W / VIEW_H;

export function Canvas({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {children}
    </Svg>
  );
}

/** Resolved colours for one scene: the accent family, paper surfaces, lines and a few partner hues. */
export function tones(p: ScenePalette) {
  const d = p.isDark;
  const a = p.accent;
  /** A shade of any ramp: `s(ramp, light, dark)`. */
  const s = (ramp: Ramp, light: Shade, dark: Shade) => (d ? ramp[dark] : ramp[light]);
  return {
    d,
    s,
    blobTop: d ? a[800] : a[100],
    blobBot: d ? a[900] : a[200],
    main: s(a, 500, 400),
    hi: s(a, 400, 300),
    lo: s(a, 600, 500),
    deep: s(a, 700, 600),
    soft: s(a, 200, 700),
    softer: s(a, 100, 800),
    cardHi: d ? p.neutral[600] : p.neutral[50],
    cardLo: d ? p.neutral[700] : p.neutral[100],
    edge: d ? p.neutral[500] : p.neutral[200],
    line: d ? p.neutral[500] : p.neutral[300],
    mute: d ? p.neutral[600] : p.neutral[200],
    ink: p.ink,
    shadow: p.shadow,
    shadowO: d ? 0.55 : 0.4,
    warm: s(p.warm, 400, 300),
    warmLo: s(p.warm, 500, 400),
    warmHi: s(p.warm, 200, 200),
    rose: s(p.rose, 400, 300),
    roseLo: s(p.rose, 500, 400),
    sky: s(p.sky, 400, 300),
    skyLo: s(p.sky, 500, 400),
    good: s(p.good, 500, 400),
    goodLo: s(p.good, 600, 500),
    bad: s(p.bad, 500, 400),
    badLo: s(p.bad, 600, 500),
    brand: s(p.brand, 500, 400),
    brandLo: s(p.brand, 600, 500),
    white: p.neutral[50],
    snow: d ? p.neutral[300] : p.neutral[50],
    metalHi: d ? p.neutral[300] : p.neutral[200],
    metalLo: d ? p.neutral[500] : p.neutral[400],
    dark: d ? p.neutral[900] : p.neutral[800],
    darkLo: d ? p.neutral[950] : p.neutral[900],
  };
}
export type Tones = ReturnType<typeof tones>;

/** A two-stop linear gradient definition (top to bottom by default). Reference it with `ref(id, name)`. */
export function Grad({ id, name, from, to, x1 = '0', y1 = '0', x2 = '0', y2 = '1' }: { id: string; name: string; from: string; to: string; x1?: string; y1?: string; x2?: string; y2?: string }) {
  return (
    <LinearGradient id={`${id}-${name}`} x1={x1} y1={y1} x2={x2} y2={y2}>
      <Stop offset="0" stopColor={from} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  );
}
export const ref = (id: string, name: string) => `url(#${id}-${name})`;

/** A soft ground shadow built from stacked ellipses (no blur filters, so it also renders in the preview harness). */
export function SoftShadow({ cx, cy, rx, ry = 7, color, o = 0.4 }: { cx: number; cy: number; rx: number; ry?: number; color: string; o?: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={o * 0.35} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.82} ry={ry * 0.78} fill={color} opacity={o * 0.4} />
      <Ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.55} fill={color} opacity={o * 0.5} />
    </G>
  );
}

/** A four-point sparkle centred on (x, y). */
export function sparklePath(x: number, y: number, r: number, pinch = 0.12) {
  const k = r * pinch;
  return `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`;
}
export function Sparkle({ x, y, r, fill, opacity = 1 }: { x: number; y: number; r: number; fill: string; opacity?: number }) {
  return <Path d={sparklePath(x, y, r)} fill={fill} opacity={opacity} />;
}

/** Backdrop shapes (a soft blob) in four silhouettes, so neighbouring screens do not look stamped from one mould. */
const BLOBS = [
  'M36 96 C28 58 70 26 120 28 C176 30 214 62 208 106 C202 148 160 160 116 158 C68 156 44 136 36 96 Z',
  'M32 88 C34 50 80 24 126 30 C180 36 212 70 206 112 C200 150 150 162 106 156 C62 150 30 128 32 88 Z',
  'M40 108 C26 70 62 30 114 28 C170 26 216 58 206 100 C198 138 168 160 122 160 C78 160 50 140 40 108 Z',
  'M44 84 C48 46 92 26 136 32 C186 38 214 72 204 112 C194 148 148 160 104 156 C60 152 40 120 44 84 Z',
];

/** Backdrop layer: the blob (two tones), a ground shadow and a few quiet decorations. `kind` 0-3 picks the silhouette. */
export function backdrop(kind: number): ComponentType<SceneProps> {
  return function Backdrop({ width, height, p }: SceneProps) {
    const id = useId();
    const t = tones(p);
    const i = kind % BLOBS.length;
    const flip = kind % 2 === 1;
    const dx = flip ? 1 : -1;
    return (
      <Canvas width={width} height={height}>
        <Defs>
          <Grad id={id} name="blob" from={t.blobTop} to={t.blobBot} />
          <RadialGradient id={`${id}-halo`} cx="0.5" cy="0.4" rx="0.5" ry="0.5">
            <Stop offset="0" stopColor={t.d ? p.accent[700] : p.paper} stopOpacity={t.d ? 0.55 : 0.9} />
            <Stop offset="1" stopColor={t.d ? p.accent[700] : p.paper} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={BLOBS[i]} fill={ref(id, 'blob')} />
        <Ellipse cx={120} cy={88} rx={66} ry={56} fill={`url(#${id}-halo)`} />
        <SoftShadow cx={120} cy={154} rx={70} ry={7} color={t.shadow} o={t.shadowO} />
        <Sparkle x={120 + dx * 92} y={46} r={7} fill={t.hi} opacity={0.9} />
        <Circle cx={120 - dx * 92} cy={52} r={4} fill="none" stroke={t.hi} strokeWidth={2} opacity={0.8} />
        <Circle cx={120 + dx * 98} cy={120} r={3} fill={t.main} opacity={0.55} />
        <Circle cx={120 - dx * 100} cy={132} r={2.2} fill={t.hi} opacity={0.7} />
        <Circle cx={120 - dx * 88} cy={110} r={1.6} fill={t.main} opacity={0.5} />
      </Canvas>
    );
  };
}

/** Float layer: two sparkles that the app can pulse. */
export function sparkles(spots: [number, number, number][]): ComponentType<SceneProps> {
  return function Sparkles({ width, height, p }: SceneProps) {
    const t = tones(p);
    return (
      <Canvas width={width} height={height}>
        {spots.map(([x, y, r], i) => (
          <Sparkle key={i} x={x} y={y} r={r} fill={i % 2 === 0 ? t.warm : t.hi} />
        ))}
      </Canvas>
    );
  };
}

/** Assemble a scene: backdrop, one or more art layers, and a floating detail with mild motion. */
export function spotScene(note: string, back: number, layers: SceneLayer[]): SceneDef {
  return { aspect: ASPECT, note, layers: [{ id: 'back', Component: backdrop(back) }, ...layers] };
}

/** A sneaker in side view, heading left, drawn at the origin of a 60 x 38 box. Used by fashion and fitness. */
export function Sneaker({ t, x, y, s = 1, rot = 0, body, trim }: { t: Tones; x: number; y: number; s?: number; rot?: number; body: string; trim: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Path d="M0 24 V8 Q0 2 6 3 L18 6 Q24 16 36 18 L50 22 Q60 26 60 32 V34 H0 Z" fill={body} />
      <Path d="M18 6 Q24 16 36 18 L40 12 Q32 12 28 4 Z" fill={trim} opacity={0.5} />
      <Path d="M30 20 L36 10 M36 22 L42 12 M42 24 L47 15" stroke={t.cardHi} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M0 24 Q20 30 60 30 V34 H0 Z" fill={trim} opacity={0.35} />
      <Rect x={-1} y={30} width={62} height={9} rx={4.5} fill={t.cardHi} />
      <Rect x={-1} y={36} width={62} height={3} rx={1.5} fill={t.edge} />
      <Path d="M8 14 Q14 10 20 18" stroke={t.cardHi} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8} />
    </G>
  );
}
