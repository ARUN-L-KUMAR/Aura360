import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ScenePalette } from '../../palette';

/** Every hero scene is drawn on this 420 x 200 canvas (aspect 2.1) and scaled to the banner through the viewBox. */
export const VIEW_W = 420;
export const VIEW_H = 200;
export const HERO_ASPECT = VIEW_W / VIEW_H;

export function Frame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
      {children}
    </Svg>
  );
}

type GradProps = { id: string; from: string; to: string; fromOpacity?: number; toOpacity?: number; horizontal?: boolean; diagonal?: boolean };

/** A two-stop linear gradient (top to bottom unless told otherwise). */
export function Grad({ id, from, to, fromOpacity = 1, toOpacity = 1, horizontal, diagonal }: GradProps) {
  const x2 = horizontal || diagonal ? '1' : '0';
  const y2 = horizontal ? '0' : '1';
  return (
    <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <Stop offset="0" stopColor={from} stopOpacity={fromOpacity} />
      <Stop offset="1" stopColor={to} stopOpacity={toOpacity} />
    </LinearGradient>
  );
}

/** Four-point sparkle centred on (cx, cy) with arm length r. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.18;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/** Heart centred on the origin, about 18 wide. Place it with a transform. */
export const HEART_PATH = 'M0 8 C-11 0 -10 -9 -4.6 -9 C-2.2 -9 -0.6 -7.6 0 -6 C0.6 -7.6 2.2 -9 4.6 -9 C10 -9 11 0 0 8 Z';

type CloudProps = { x: number; y: number; s?: number; fill: string; shade: string; opacity?: number };

/** A soft three-lobe cloud with a shaded underside, about 60 x 26 at s = 1, anchored at its centre. */
export function Cloud({ x, y, s = 1, fill, shade, opacity = 1 }: CloudProps) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <Rect x={-30} y={-2} width={60} height={14} rx={7} fill={shade} />
      <Circle cx={-14} cy={-1} r={10} fill={fill} />
      <Circle cx={2} cy={-8} r={13} fill={fill} />
      <Circle cx={17} cy={-1} r={9} fill={fill} />
      <Rect x={-30} y={-2} width={60} height={11} rx={5.5} fill={fill} />
    </G>
  );
}

type BirdProps = { x: number; y: number; s?: number; color: string };

/** A bird as two curved strokes. */
export function Bird({ x, y, s = 1, color }: BirdProps) {
  return (
    <Path
      d={`M${x - 6 * s} ${y - 1 * s} Q${x - 3 * s} ${y - 5.5 * s} ${x} ${y} Q${x + 3 * s} ${y - 5.5 * s} ${x + 6 * s} ${y - 1 * s}`}
      fill="none"
      stroke={color}
      strokeWidth={1.4 * s}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

type CoinProps = { cx: number; cy: number; r: number; p: ScenePalette; id?: string };

/** A front-facing gold coin: rim, face, inner ring, a small embossed sparkle and a highlight. */
export function Coin({ cx, cy, r, p }: CoinProps) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={p.warm[500]} />
      <Circle cx={cx} cy={cy} r={r * 0.9} fill={p.warm[300]} />
      <Circle cx={cx} cy={cy} r={r * 0.68} fill="none" stroke={p.warm[500]} strokeWidth={r * 0.1} opacity={0.7} />
      <Path d={sparklePath(cx, cy, r * 0.42)} fill={p.warm[100]} />
      <Path
        d={`M${cx - r * 0.7} ${cy - r * 0.2} A${r * 0.74} ${r * 0.74} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.72}`}
        fill="none"
        stroke={p.warm[50]}
        strokeWidth={r * 0.12}
        strokeLinecap="round"
        opacity={0.8}
      />
    </G>
  );
}

type SparkleProps = { cx: number; cy: number; r: number; fill: string; opacity?: number };

export function Sparkle({ cx, cy, r, fill, opacity = 1 }: SparkleProps) {
  return <Path d={sparklePath(cx, cy, r)} fill={fill} opacity={opacity} />;
}

type TreeProps = { x: number; y: number; s?: number; leaf: string; leafLight: string; trunk: string };

/** A round tree standing on (x, y), about 22 tall at s = 1. */
export function RoundTree({ x, y, s = 1, leaf, leafLight, trunk }: TreeProps) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x={-1.6} y={-9} width={3.2} height={9} rx={1.2} fill={trunk} />
      <Circle cx={0} cy={-15} r={9} fill={leaf} />
      <Circle cx={-2.6} cy={-17.6} r={5.2} fill={leafLight} opacity={0.75} />
    </G>
  );
}

/** A pine / cone tree standing on (x, y), about 26 tall at s = 1. */
export function PineTree({ x, y, s = 1, leaf, leafLight, trunk }: TreeProps) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x={-1.4} y={-6} width={2.8} height={6} rx={1} fill={trunk} />
      <Path d="M0 -26 L8 -10 Q8 -7 5 -7 L-5 -7 Q-8 -7 -8 -10 Z" fill={leaf} />
      <Path d="M0 -26 L-8 -10 Q-8 -7 -5 -7 L0 -7 Z" fill={leafLight} opacity={0.5} />
    </G>
  );
}

type ShadowProps = { cx: number; cy: number; rx: number; ry?: number; p: ScenePalette; opacity?: number };

/** A soft ground shadow. */
export function GroundShadow({ cx, cy, rx, ry = rx * 0.22, p, opacity = 0.45 }: ShadowProps) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.shadow} opacity={opacity} />;
}
