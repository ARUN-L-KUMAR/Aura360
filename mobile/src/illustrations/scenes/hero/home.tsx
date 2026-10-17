import { useId, type ReactNode } from 'react';
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { ScenePalette } from '../../palette';
import type { SceneProps } from '../../types';
import { Bird, Cloud, Frame, Grad, HEART_PATH, PineTree, RoundTree, Sparkle, VIEW_H, VIEW_W, sparklePath } from './shared';

export const HOME_VARIANTS = ['morning', 'day', 'evening', 'night'] as const;
type Time = (typeof HOME_VARIANTS)[number];

type Kit = {
  time: Time;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  /** Sun or moon body, its halo and where it sits. */
  body: string;
  bodyShade: string;
  halo: string;
  bodyX: number;
  bodyY: number;
  bodyR: number;
  cloud: string;
  cloudShade: string;
  cloudOpacity: number;
  bird: string;
  star: string;
  hillFar: string;
  hillFarTop: string;
  hillMid: string;
  hillMidTop: string;
  hillNear: string;
  hillNearTop: string;
  leaf: string;
  leafLight: string;
  leafAlt: string;
  trunk: string;
  wall: string;
  roof: string;
  window: string;
  path: string;
  flower: string;
  flowerAlt: string;
};

function timeOf(variant?: string): Time {
  return (HOME_VARIANTS as readonly string[]).includes(variant ?? '') ? (variant as Time) : 'day';
}

/** All the colour decisions for a time of day in the current scheme. Every value comes from the palette ramps. */
function kitFor(p: ScenePalette, variant?: string): Kit {
  const time = timeOf(variant);
  const d = p.isDark;
  const base = { time, bird: d ? p.neutral[200] : p.neutral[700], star: p.paper };

  if (time === 'night') {
    return {
      ...base,
      skyTop: d ? p.neutral[950] : p.brand[900],
      skyMid: d ? p.brand[900] : p.brand[800],
      skyBottom: d ? p.brand[800] : p.brand[600],
      body: p.neutral[100],
      bodyShade: p.neutral[300],
      halo: p.brand[300],
      bodyX: 318,
      bodyY: 52,
      bodyR: 20,
      cloud: p.brand[700],
      cloudShade: p.brand[800],
      cloudOpacity: 0.55,
      hillFar: d ? p.brand[800] : p.brand[700],
      hillFarTop: d ? p.brand[700] : p.brand[600],
      hillMid: d ? p.brand[900] : p.brand[800],
      hillMidTop: d ? p.brand[800] : p.brand[700],
      hillNear: d ? p.neutral[950] : p.brand[900],
      hillNearTop: d ? p.neutral[900] : p.brand[800],
      leaf: d ? p.good[900] : p.brand[900],
      leafLight: d ? p.good[800] : p.brand[800],
      leafAlt: d ? p.brand[900] : p.brand[800],
      trunk: p.neutral[900],
      wall: p.brand[800],
      roof: p.brand[900],
      window: p.warm[300],
      path: p.brand[700],
      flower: p.rose[300],
      flowerAlt: p.warm[300],
    };
  }

  if (time === 'evening') {
    return {
      ...base,
      skyTop: d ? p.brand[900] : p.brand[300],
      skyMid: d ? p.rose[800] : p.rose[200],
      skyBottom: d ? p.warm[700] : p.warm[200],
      body: p.warm[300],
      bodyShade: p.warm[400],
      halo: d ? p.warm[500] : p.warm[300],
      bodyX: 292,
      bodyY: 116,
      bodyR: 24,
      cloud: d ? p.brand[700] : p.rose[100],
      cloudShade: d ? p.brand[800] : p.rose[300],
      cloudOpacity: d ? 0.5 : 0.95,
      hillFar: d ? p.brand[800] : p.brand[300],
      hillFarTop: d ? p.rose[700] : p.rose[300],
      hillMid: d ? p.brand[900] : p.brand[400],
      hillMidTop: d ? p.brand[800] : p.brand[300],
      hillNear: d ? p.neutral[950] : p.brand[700],
      hillNearTop: d ? p.brand[900] : p.brand[600],
      leaf: d ? p.brand[900] : p.brand[800],
      leafLight: d ? p.brand[800] : p.brand[600],
      leafAlt: d ? p.good[900] : p.brand[700],
      trunk: d ? p.neutral[950] : p.brand[900],
      wall: d ? p.rose[800] : p.rose[200],
      roof: d ? p.brand[900] : p.brand[800],
      window: p.warm[300],
      path: d ? p.rose[800] : p.warm[200],
      flower: p.rose[300],
      flowerAlt: p.warm[300],
    };
  }

  if (time === 'morning') {
    return {
      ...base,
      skyTop: d ? p.brand[900] : p.sky[300],
      skyMid: d ? p.rose[900] : p.rose[100],
      skyBottom: d ? p.warm[800] : p.warm[200],
      body: p.warm[200],
      bodyShade: p.warm[300],
      halo: d ? p.warm[500] : p.warm[200],
      bodyX: 126,
      bodyY: 112,
      bodyR: 20,
      cloud: d ? p.brand[700] : p.paper,
      cloudShade: d ? p.brand[800] : p.rose[200],
      cloudOpacity: d ? 0.5 : 0.95,
      hillFar: d ? p.brand[800] : p.sky[200],
      hillFarTop: d ? p.rose[800] : p.rose[200],
      hillMid: d ? p.good[900] : p.good[200],
      hillMidTop: d ? p.good[800] : p.good[100],
      hillNear: d ? p.neutral[900] : p.good[400],
      hillNearTop: d ? p.good[900] : p.good[300],
      leaf: d ? p.good[800] : p.good[500],
      leafLight: d ? p.good[700] : p.good[300],
      leafAlt: d ? p.good[700] : p.good[400],
      trunk: d ? p.warm[900] : p.warm[700],
      wall: d ? p.rose[800] : p.paper,
      roof: d ? p.rose[600] : p.rose[400],
      window: p.warm[300],
      path: d ? p.warm[800] : p.warm[100],
      flower: p.rose[300],
      flowerAlt: p.warm[300],
    };
  }

  return {
    ...base,
    skyTop: d ? p.sky[900] : p.sky[300],
    skyMid: d ? p.sky[800] : p.sky[100],
    skyBottom: d ? p.sky[700] : p.sky[50],
    body: p.warm[200],
    bodyShade: p.warm[300],
    halo: d ? p.warm[400] : p.warm[200],
    bodyX: 322,
    bodyY: 46,
    bodyR: 19,
    cloud: d ? p.sky[600] : p.paper,
    cloudShade: d ? p.sky[700] : p.sky[200],
    cloudOpacity: d ? 0.4 : 1,
    hillFar: d ? p.sky[800] : p.sky[200],
    hillFarTop: d ? p.sky[700] : p.sky[100],
    hillMid: d ? p.good[900] : p.good[300],
    hillMidTop: d ? p.good[800] : p.good[200],
    hillNear: d ? p.neutral[900] : p.good[500],
    hillNearTop: d ? p.good[900] : p.good[400],
    leaf: d ? p.good[800] : p.good[600],
    leafLight: d ? p.good[700] : p.good[400],
    leafAlt: d ? p.good[700] : p.good[500],
    trunk: d ? p.warm[900] : p.warm[700],
    wall: d ? p.sky[700] : p.paper,
    roof: d ? p.rose[600] : p.rose[400],
    window: d ? p.warm[300] : p.sky[300],
    path: d ? p.warm[800] : p.warm[100],
    flower: p.rose[300],
    flowerAlt: p.warm[300],
  };
}

const STARS: readonly (readonly [number, number, number, number])[] = [
  [24, 20, 1.3, 0.9], [58, 46, 0.9, 0.6], [88, 18, 1.1, 0.8], [120, 38, 0.8, 0.5], [152, 14, 1.2, 0.9], [182, 52, 0.9, 0.6],
  [214, 26, 1.3, 0.85], [246, 12, 0.9, 0.7], [262, 44, 1, 0.6], [372, 22, 1.2, 0.85], [398, 54, 0.9, 0.6], [352, 80, 0.8, 0.5],
  [28, 76, 0.9, 0.55], [72, 92, 0.8, 0.45], [196, 90, 0.8, 0.45], [286, 22, 0.9, 0.6], [408, 18, 0.8, 0.5],
];

/** Back layer: the time-of-day sky, the sun or moon with its halo, and the stars at night. */
export function HomeSky({ width, height, p, variant }: SceneProps) {
  const id = useId();
  const k = kitFor(p, variant);
  const night = k.time === 'night';
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-sky`} from={k.skyTop} to={k.skyBottom} />
        <RadialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={k.halo} stopOpacity={night ? 0.5 : 0.85} />
          <Stop offset="1" stopColor={k.halo} stopOpacity={0} />
        </RadialGradient>
        <Grad id={`${id}-haze`} from={k.skyMid} to={k.skyMid} fromOpacity={0} toOpacity={p.isDark ? 0.5 : 0.75} />
      </Defs>
      <Rect width={VIEW_W} height={VIEW_H} fill={`url(#${id}-sky)`} />
      <Rect x="0" y="70" width={VIEW_W} height="80" fill={`url(#${id}-haze)`} />
      {night
        ? STARS.map(([x, y, r, o], i) =>
            i % 5 === 0 ? <Sparkle key={i} cx={x} cy={y} r={r * 3.2} fill={k.star} opacity={o} /> : <Circle key={i} cx={x} cy={y} r={r} fill={k.star} opacity={o} />,
          )
        : null}
      <Circle cx={k.bodyX} cy={k.bodyY} r={k.bodyR * 2.8} fill={`url(#${id}-halo)`} />
      <Circle cx={k.bodyX} cy={k.bodyY} r={k.bodyR * 1.6} fill={k.halo} opacity={night ? 0.14 : 0.3} />
      {night ? null : <Circle cx={k.bodyX} cy={k.bodyY} r={k.bodyR} fill={k.body} />}
      {night ? (
        <>
          <Path
            d={`M${k.bodyX} ${k.bodyY - k.bodyR} A${k.bodyR} ${k.bodyR} 0 0 0 ${k.bodyX} ${k.bodyY + k.bodyR} A${k.bodyR * 0.52} ${k.bodyR} 0 0 1 ${k.bodyX} ${k.bodyY - k.bodyR} Z`}
            fill={k.body}
            transform={`rotate(-24 ${k.bodyX} ${k.bodyY})`}
          />
        </>
      ) : (
        <Circle cx={k.bodyX - k.bodyR * 0.25} cy={k.bodyY - k.bodyR * 0.25} r={k.bodyR * 0.5} fill={k.bodyShade} opacity={0.35} />
      )}
    </Frame>
  );
}

/** Drifting clouds and birds. */
export function HomeClouds({ width, height, p, variant }: SceneProps) {
  const k = kitFor(p, variant);
  const night = k.time === 'night';
  return (
    <Frame width={width} height={height}>
      <Cloud x={52} y={36} s={0.85} fill={k.cloud} shade={k.cloudShade} opacity={k.cloudOpacity} />
      <Cloud x={262} y={86} s={0.75} fill={k.cloud} shade={k.cloudShade} opacity={k.cloudOpacity * 0.9} />
      <Cloud x={352} y={62} s={0.6} fill={k.cloud} shade={k.cloudShade} opacity={k.cloudOpacity * 0.95} />
      <Cloud x={394} y={96} s={0.9} fill={k.cloud} shade={k.cloudShade} opacity={k.cloudOpacity * 0.9} />
      {night ? null : (
        <G>
          <Bird x={60} y={88} s={1.1} color={k.bird} />
          <Bird x={78} y={78} s={0.8} color={k.bird} />
          <Bird x={46} y={74} s={0.7} color={k.bird} />
        </G>
      )}
    </Frame>
  );
}

function House({ x, y, s = 1, k }: { x: number; y: number; s?: number; k: Kit }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Rect x={4} y={-18} width={3} height={7} fill={k.roof} />
      <Path d="M5.5 -20 C2 -25 9 -27 5 -33" fill="none" stroke={k.cloud} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      <Rect x={-8} y={-10} width={16} height={10} rx={1.2} fill={k.wall} />
      <Path d="M-11 -9.5 L0 -19 L11 -9.5 Z" fill={k.roof} />
      <Rect x={-2} y={-6} width={4} height={6} rx={1} fill={k.roof} opacity={0.9} />
      <Rect x={3.6} y={-8} width={3} height={3} rx={0.6} fill={k.window} />
      <Rect x={-6.6} y={-8} width={3} height={3} rx={0.6} fill={k.window} />
    </G>
  );
}

const FAR_TREES: readonly (readonly [number, number, number])[] = [
  [44, 114, 0.5], [58, 112, 0.6], [72, 111, 0.5], [232, 108, 0.55], [246, 107, 0.6], [380, 112, 0.5], [394, 110, 0.58],
];

/** Parallax hills: a far ridge with pines and a middle slope with a hamlet and a winding path. */
export function HomeHills({ width, height, p, variant }: SceneProps) {
  const id = useId();
  const k = kitFor(p, variant);
  const far = 'M0 122 C34 104 80 100 128 114 C172 127 214 108 262 104 C312 100 364 116 420 108 L420 200 L0 200 Z';
  const mid = 'M0 150 C46 130 104 128 156 142 C212 158 262 130 322 130 C370 130 400 142 420 138 L420 200 L0 200 Z';
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-far`} from={k.hillFarTop} to={k.hillFar} />
        <Grad id={`${id}-mid`} from={k.hillMidTop} to={k.hillMid} />
      </Defs>
      <Path d="M0 112 L28 94 L52 106 L92 78 L132 108 L150 100 L170 114 L250 114 L296 82 L336 108 L362 94 L420 112 L420 140 L0 140 Z" fill={k.hillFarTop} stroke={k.hillFarTop} strokeWidth={5} strokeLinejoin="round" opacity={0.5} />
      <Path d={far} fill={`url(#${id}-far)`} />
      <Path d={far.replace(/ L420 200 L0 200 Z$/, '')} fill="none" stroke={k.hillFarTop} strokeWidth={1.2} opacity={0.9} />
      {FAR_TREES.map(([x, y, s]) => (
        <PineTree key={x} x={x} y={y} s={s} leaf={k.hillMid} leafLight={k.hillMidTop} trunk={k.hillMid} />
      ))}
      <Path d={mid} fill={`url(#${id}-mid)`} />
      <Path d={mid.replace(/ L420 200 L0 200 Z$/, '')} fill="none" stroke={k.hillMidTop} strokeWidth={1.4} opacity={0.9} />
      <Path d="M286 133 C282 146 254 150 238 160 C226 168 220 178 214 192 L246 192 C250 180 256 172 268 164 C284 152 306 148 310 134 Z" fill={k.path} opacity={0.9} />
      <House x={318} y={134} s={1.15} k={k} />
      <House x={346} y={138} s={0.85} k={k} />
      <RoundTree x={298} y={138} s={0.95} leaf={k.leaf} leafLight={k.leafLight} trunk={k.trunk} />
      <RoundTree x={366} y={136} s={0.8} leaf={k.leafAlt} leafLight={k.leafLight} trunk={k.trunk} />
      <PineTree x={92} y={144} s={0.9} leaf={k.leaf} leafLight={k.leafLight} trunk={k.trunk} />
      <PineTree x={108} y={148} s={0.7} leaf={k.leafAlt} leafLight={k.leafLight} trunk={k.trunk} />
      <RoundTree x={170} y={152} s={0.8} leaf={k.leafAlt} leafLight={k.leafLight} trunk={k.trunk} />
    </Frame>
  );
}

type BadgeProps = { x: number; y: number; r: number; k: Kit; p: ScenePalette; children: ReactNode };

function Badge({ x, y, r, k, p, children }: BadgeProps) {
  const iconScale = r / 12;
  const night = k.time === 'night' || p.isDark;
  return (
    <G transform={`translate(${x} ${y})`}>
      <Circle cx={0} cy={r * 0.28} r={r} fill={p.shadow} opacity={0.12} />
      <Circle cx={0} cy={0} r={r} fill={night ? p.brand[800] : p.paper} opacity={0.82} />
      <Circle cx={0} cy={0} r={r} fill="none" stroke={night ? p.brand[600] : p.neutral[100]} strokeWidth={1} opacity={0.5} />
      <G transform={`scale(${iconScale})`} opacity={0.92}>{children}</G>
    </G>
  );
}

/** Two small floating tokens (heart and dumbbell). */
export function HomeTokensA({ width, height, p, variant }: SceneProps) {
  const k = kitFor(p, variant);
  return (
    <Frame width={width} height={height}>
      <Badge x={150} y={28} r={11} k={k} p={p}>
        <G transform="scale(0.8)">
          <Path d={HEART_PATH} fill={p.rose[500]} />
        </G>
      </Badge>
      <Badge x={104} y={62} r={12} k={k} p={p}>
        <G transform="rotate(-30)">
          <Rect x={-7} y={-1.2} width={14} height={2.4} rx={1.2} fill={p.neutral[500]} />
          <Rect x={-9} y={-5} width={4} height={10} rx={1.6} fill={p.warm[500]} />
          <Rect x={5} y={-5} width={4} height={10} rx={1.6} fill={p.warm[500]} />
        </G>
      </Badge>
    </Frame>
  );
}

/** Two small floating tokens (coin and leaf). */
export function HomeTokensB({ width, height, p, variant }: SceneProps) {
  const k = kitFor(p, variant);
  return (
    <Frame width={width} height={height}>
      <Badge x={240} y={38} r={11} k={k} p={p}>
        <Path d="M-6 5 C-6 -4 0 -8 7 -7 C7 0 3 6 -6 5 Z" fill={p.good[500]} />
        <Path d="M-6 5 C-2 1 1 -2 4 -5" fill="none" stroke={p.good[100]} strokeWidth={1.2} strokeLinecap="round" />
      </Badge>
      <Badge x={196} y={64} r={12} k={k} p={p}>
        <Circle cx={0} cy={0} r={7.4} fill={p.warm[400]} />
        <Circle cx={0} cy={0} r={5.2} fill={p.warm[200]} />
        <Path d={sparklePath(0, 0, 3.2)} fill={p.warm[500]} />
      </Badge>
    </Frame>
  );
}

const FLOWERS: readonly (readonly [number, number, boolean])[] = [
  [104, 186, true], [118, 190, false], [262, 188, false], [278, 184, true], [370, 182, true], [388, 188, false], [330, 190, true],
];

/** Foreground: the near meadow, a framing tree, grass tufts and flowers. Never shifted by parallax. */
export function HomeForeground({ width, height, p, variant }: SceneProps) {
  const id = useId();
  const k = kitFor(p, variant);
  const near = 'M0 176 C60 162 130 164 200 174 C268 184 340 166 420 168 L420 200 L0 200 Z';
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-near`} from={k.hillNearTop} to={k.hillNear} />
      </Defs>
      <Ellipse cx={46} cy={178} rx={34} ry={5} fill={p.shadow} opacity={0.3} />
      <Path d={near} fill={`url(#${id}-near)`} />
      <G transform="translate(40 180)">
        <Path d="M-4.5 0 C-3 -10 -2.6 -18 -2.2 -28 L2.2 -28 C2.6 -18 3 -10 4.5 0 Z" fill={k.trunk} />
        <Circle cx={0} cy={-44} r={21} fill={k.leaf} />
        <Circle cx={-15} cy={-34} r={13} fill={k.leafAlt} />
        <Circle cx={15} cy={-36} r={14} fill={k.leaf} />
        <Circle cx={-6} cy={-53} r={10} fill={k.leafLight} opacity={0.7} />
        <Circle cx={10} cy={-48} r={5} fill={k.leafLight} opacity={0.45} />
      </G>
      {FLOWERS.map(([x, y, warm]) => (
        <G key={x}>
          <Path d={`M${x} ${y + 6} L${x} ${y}`} stroke={k.leaf} strokeWidth={1.2} strokeLinecap="round" />
          <Circle cx={x} cy={y} r={2.4} fill={warm ? k.flower : k.flowerAlt} />
          <Circle cx={x} cy={y} r={0.9} fill={k.window} />
        </G>
      ))}
      {[150, 214, 300, 352, 404].map((x) => (
        <Path key={x} d={`M${x - 5} 200 Q${x - 4} 190 ${x - 7} 186 Q${x - 1} 189 ${x} 200 Q${x + 1} 190 ${x + 7} 187 Q${x + 4} 192 ${x + 5} 200 Z`} fill={k.leafLight} opacity={0.8} />
      ))}
    </Frame>
  );
}
