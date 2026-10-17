import { useId } from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { ScenePalette } from '../../palette';
import type { SceneProps } from '../../types';
import { Frame, Grad, HEART_PATH, Sparkle, VIEW_H, VIEW_W } from './shared';

const RAY_COUNT = 14;
const RAY_ORIGIN_X = 214;
const RAY_ORIGIN_Y = 100;

/** Wedge-shaped rays fanning out from a point (long enough to leave the canvas). */
function rays(): string[] {
  const out: string[] = [];
  const reach = 420;
  for (let i = 0; i < RAY_COUNT; i += 1) {
    if (i % 2 === 1) continue;
    const a0 = (i / RAY_COUNT) * Math.PI * 2;
    const a1 = ((i + 1) / RAY_COUNT) * Math.PI * 2;
    const x0 = RAY_ORIGIN_X + Math.cos(a0) * reach;
    const y0 = RAY_ORIGIN_Y + Math.sin(a0) * reach;
    const x1 = RAY_ORIGIN_X + Math.cos(a1) * reach;
    const y1 = RAY_ORIGIN_Y + Math.sin(a1) * reach;
    out.push(`M${RAY_ORIGIN_X} ${RAY_ORIGIN_Y} L${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} Z`);
  }
  return out;
}

const RAYS = rays();

/** Back layer: accent gradient, energy rays, a glow behind the focal point. */
export function FitnessBackdrop({ width, height, p }: SceneProps) {
  const id = useId();
  const d = p.isDark;
  const glow = d ? p.accent[500] : p.warm[100];
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-bg`} from={d ? p.accent[800] : p.accent[300]} to={d ? p.accent[900] : p.accent[500]} />
        <RadialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={glow} stopOpacity={d ? 0.55 : 0.95} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={VIEW_W} height={VIEW_H} fill={`url(#${id}-bg)`} />
      {RAYS.map((r) => (
        <Path key={r} d={r} fill={d ? p.accent[600] : p.warm[100]} opacity={d ? 0.22 : 0.3} />
      ))}
      <Circle cx={RAY_ORIGIN_X} cy={RAY_ORIGIN_Y} r={150} fill={`url(#${id}-glow)`} />
    </Frame>
  );
}

const TRACK_TOP_Y = 150;
const LANE_BOTTOM_X = [-150, -30, 90, 214, 338, 458, 578];

/** Ground plane with a running track in perspective: lane lines run toward the heart. */
export function FitnessTrack({ width, height, p }: SceneProps) {
  const id = useId();
  const d = p.isDark;
  const vx = 214;
  const topAt = (bx: number) => vx + ((bx - vx) * 0.2);
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-ground`} from={d ? p.accent[700] : p.accent[600]} to={d ? p.accent[800] : p.accent[700]} />
        <Grad id={`${id}-track`} from={d ? p.accent[600] : p.accent[500]} to={d ? p.accent[700] : p.accent[600]} />
      </Defs>
      <Rect x="0" y={TRACK_TOP_Y} width={VIEW_W} height={VIEW_H - TRACK_TOP_Y} fill={`url(#${id}-ground)`} />
      <Path d={`M0 ${TRACK_TOP_Y} H${VIEW_W}`} stroke={d ? p.accent[500] : p.accent[400]} strokeWidth={1.4} opacity={0.9} />
      <Path d={`M${topAt(-150)} ${TRACK_TOP_Y} L-150 ${VIEW_H} L578 ${VIEW_H} L${topAt(578)} ${TRACK_TOP_Y} Z`} fill={`url(#${id}-track)`} />
      {LANE_BOTTOM_X.map((bx, i) => (
        <Path
          key={bx}
          d={`M${topAt(bx)} ${TRACK_TOP_Y} L${bx} ${VIEW_H}`}
          stroke={p.paper}
          strokeWidth={i === 0 || i === LANE_BOTTOM_X.length - 1 ? 2 : 1.4}
          opacity={i === 0 || i === LANE_BOTTOM_X.length - 1 ? 0.8 : 0.55}
        />
      ))}
      <Rect x="0" y={TRACK_TOP_Y - 2} width={VIEW_W} height={14} fill={d ? p.accent[600] : p.accent[300]} opacity={0.2} />
    </Frame>
  );
}

function Dumbbell({ p }: { p: ScenePalette }) {
  const d = p.isDark;
  const plate = d ? p.neutral[600] : p.neutral[800];
  const plateLight = d ? p.neutral[400] : p.neutral[600];
  const bar = d ? p.neutral[300] : p.neutral[400];
  return (
    <G>
      <Rect x={-58} y={-5} width={116} height={10} rx={5} fill={bar} />
      {[-44, -34, -24, 24, 34, 44].map((x) => (
        <Path key={x} d={`M${x} -4 L${x + 3} 4`} stroke={p.neutral[600]} strokeWidth={1.1} opacity={0.5} />
      ))}
      {[-1, 1].map((side) => (
        <G key={side} transform={`scale(${side} 1)`}>
          <Rect x={52} y={-18} width={9} height={36} rx={4.5} fill={plate} />
          <Rect x={40} y={-30} width={14} height={60} rx={6} fill={plate} />
          <Rect x={43} y={-27} width={4} height={54} rx={2} fill={plateLight} opacity={0.7} />
          <Rect x={30} y={-22} width={11} height={44} rx={5} fill={p.accent[d ? 400 : 600]} />
          <Rect x={32.5} y={-19} width={3} height={38} rx={1.5} fill={p.paper} opacity={0.35} />
        </G>
      ))}
    </G>
  );
}

function Kettlebell({ p }: { p: ScenePalette }) {
  const id = useId();
  const d = p.isDark;
  return (
    <G>
      <Defs>
        <Grad id={`${id}-kb`} from={d ? p.brand[400] : p.brand[500]} to={d ? p.brand[600] : p.brand[700]} diagonal />
      </Defs>
      <Path d="M-14 -16 C-14 -42 14 -42 14 -16" fill="none" stroke={p.brand[800]} strokeWidth={9} strokeLinecap="round" />
      <Path d="M-14 -16 C-14 -42 14 -42 14 -16" fill="none" stroke={d ? p.brand[500] : p.brand[600]} strokeWidth={5} strokeLinecap="round" />
      <Path d="M-26 22 C-34 4 -26 -18 0 -18 C26 -18 34 4 26 22 Q0 28 -26 22 Z" fill={`url(#${id}-kb)`} />
      <Path d="M-18 -4 C-17 -10 -12 -13 -7 -13" fill="none" stroke={p.brand[200]} strokeWidth={3} strokeLinecap="round" opacity={0.75} />
      <Rect x={-9} y={0} width={18} height={9} rx={4.5} fill={p.brand[300]} opacity={0.28} />
    </G>
  );
}

function Sneaker({ p }: { p: ScenePalette }) {
  const d = p.isDark;
  const upper = d ? p.neutral[100] : p.paper;
  const shade = d ? p.neutral[300] : p.neutral[200];
  const sole = d ? p.neutral[200] : p.neutral[100];
  const trim = p.brand[d ? 400 : 600];
  return (
    <G>
      <Path d="M-34 -6 L-34 -27 Q-34 -34 -27 -34 L-19 -34 Q-16 -22 -6 -20 L6 -27 Q10 -29 14 -27 L32 -17 Q44 -12 44 -6 Z" fill={upper} />
      <Path d="M24 -19 L32 -17 Q44 -12 44 -6 L22 -6 Q26 -12 24 -19 Z" fill={shade} />
      <Path d="M-34 -6 L-34 -27 Q-34 -34 -27 -34 L-24 -34 Q-24 -16 -18 -6 Z" fill={trim} />
      <Path d="M-14 -10 Q4 -12 20 -22" fill="none" stroke={p.accent[d ? 400 : 500]} strokeWidth={4} strokeLinecap="round" />
      <Path d="M-19 -34 Q-12 -37 -4 -30" fill="none" stroke={shade} strokeWidth={3} strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <Path key={i} d={`M${-2 + i * 8} ${-23 + i * 3.2} L${2 + i * 8} ${-30 + i * 3.2}`} stroke={trim} strokeWidth={2.2} strokeLinecap="round" />
      ))}
      <Rect x={-38} y={-9} width={86} height={9} rx={4.5} fill={sole} />
      <Rect x={-38} y={-3.4} width={86} height={3.4} rx={1.7} fill={p.neutral[d ? 500 : 300]} />
      <Path d="M-30 -6.4 H40" stroke={p.accent[d ? 300 : 400]} strokeWidth={1.4} strokeLinecap="round" />
      {[
        [-56, -12, 14],
        [-62, -21, 20],
        [-52, -30, 12],
      ].map(([x, y, w]) => (
        <Path key={y} d={`M${x} ${y} h${w}`} stroke={p.paper} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
      ))}
    </G>
  );
}

/** Mid layer: dumbbell, kettlebell and a runner standing on the ground plane. */
export function FitnessObjects({ width, height, p }: SceneProps) {
  const d = p.isDark;
  const shade = d ? p.neutral[950] : p.accent[900];
  return (
    <Frame width={width} height={height}>
      <Ellipse cx={86} cy={176} rx={64} ry={7} fill={shade} opacity={0.4} />
      <G transform="translate(86 152) rotate(-7)">
        <Dumbbell p={p} />
      </G>
      <Ellipse cx={252} cy={178} rx={34} ry={6.5} fill={shade} opacity={0.4} />
      <G transform="translate(252 154)">
        <Kettlebell p={p} />
      </G>
      <Ellipse cx={358} cy={181} rx={50} ry={6} fill={shade} opacity={0.45} />
      <G transform="translate(362 177) rotate(-6) scale(1.05)">
        <Sneaker p={p} />
      </G>
    </Frame>
  );
}

const PULSE = 'M70 96 H150 L160 96 L168 72 L182 122 L196 58 L208 106 L214 96 H350';

/** The big heart with its pulse line running through it. Beats gently (scale) in the registry. */
export function FitnessHeart({ width, height, p }: SceneProps) {
  const id = useId();
  const d = p.isDark;
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-heart`} from={p.bad[d ? 300 : 400]} to={p.bad[d ? 500 : 600]} diagonal />
        <LinearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={p.paper} stopOpacity={0} />
          <Stop offset="0.25" stopColor={p.paper} stopOpacity={1} />
          <Stop offset="0.75" stopColor={p.paper} stopOpacity={1} />
          <Stop offset="1" stopColor={p.paper} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <G transform="translate(214 84) scale(4.6)">
        <Path d={HEART_PATH} fill={p.bad[800]} opacity={0.22} transform="translate(0 1.4)" />
        <Path d={HEART_PATH} fill={`url(#${id}-heart)`} />
        <Path d="M-7.2 -6.2 C-9 -4 -9 -1 -7.6 1.2" fill="none" stroke={p.bad[100]} strokeWidth={1.1} strokeLinecap="round" opacity={0.85} />
      </G>
      <Path d={PULSE} fill="none" stroke={p.shadow} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.2} transform="translate(0 3)" />
      <Path d={PULSE} fill="none" stroke={`url(#${id}-fade)`} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

function Bolt({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  return <Path d="M3 -10 L-6 2 L-1 2 L-3 10 L6 -2 L1 -2 Z" fill={fill} transform={`translate(${cx} ${cy}) scale(${s})`} strokeLinejoin="round" stroke={fill} strokeWidth={1.2} opacity={0.95} />;
}

/** Floating energy: bolts, mini hearts, a sweat drop and sparkles. */
export function FitnessSparks({ width, height, p }: SceneProps) {
  const c = p.isDark ? p.accent[200] : p.accent[700];
  return (
    <Frame width={width} height={height}>
      <Bolt cx={300} cy={42} s={1.5} fill={p.warm[300]} />
      <Bolt cx={120} cy={34} s={1.1} fill={p.warm[300]} />
      <G transform="translate(52 62) scale(1.1)">
        <Path d={HEART_PATH} fill={p.bad[p.isDark ? 300 : 400]} />
      </G>
      <G transform="translate(372 66) scale(0.8)">
        <Path d={HEART_PATH} fill={p.bad[p.isDark ? 300 : 400]} />
      </G>
      <Path d="M262 20 C258 28 256 32 256 35 A6 6 0 0 0 268 35 C268 32 266 28 262 20 Z" fill={p.sky[p.isDark ? 300 : 200]} />
      <Sparkle cx={170} cy={22} r={7} fill={c} />
      <Sparkle cx={394} cy={30} r={8} fill={c} opacity={0.9} />
      <Sparkle cx={24} cy={112} r={6} fill={c} opacity={0.85} />
      <Sparkle cx={338} cy={100} r={5} fill={p.isDark ? p.warm[100] : p.warm[600]} />
      <Circle cx={220} cy={14} r={2} fill={c} opacity={0.8} />
      <Circle cx={84} cy={22} r={2.2} fill={c} opacity={0.8} />
      <Circle cx={404} cy={98} r={2.2} fill={c} opacity={0.8} />
    </Frame>
  );
}
