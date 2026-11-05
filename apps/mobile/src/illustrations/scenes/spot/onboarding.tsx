import { useId, type ReactNode } from 'react';
import { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, sparklePath, sparkles, spotScene, tones, type Tones } from './kit';

/** The six module glyphs, drawn small and white inside a coloured disc, centred on (0, 0). */
function glyph(kind: string, w: string): ReactNode {
  switch (kind) {
    case 'finance':
      return (
        <G>
          <Circle r={7} fill="none" stroke={w} strokeWidth={2.2} />
          <Path d="M0 -3.4 V3.4" stroke={w} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      );
    case 'fitness':
      return (
        <G>
          <Rect x={-8.5} y={-1.2} width={17} height={2.4} rx={1.2} fill={w} />
          <Rect x={-9} y={-5.5} width={3.6} height={11} rx={1.6} fill={w} />
          <Rect x={5.4} y={-5.5} width={3.6} height={11} rx={1.6} fill={w} />
        </G>
      );
    case 'food':
      return (
        <G>
          <Path d="M0 -4 C6 -8 10 -2 8 3 C6 8 2 8 0 6.4 C-2 8 -6 8 -8 3 C-10 -2 -6 -8 0 -4 Z" fill={w} />
          <Path d="M0 -4 C0 -7 2 -9 5 -9.5" stroke={w} strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'notes':
      return (
        <G>
          <Rect x={-6.5} y={-8} width={13} height={16} rx={2.6} fill="none" stroke={w} strokeWidth={2} />
          <Path d="M-3 -3 H3 M-3 1 H3 M-3 5 H0" stroke={w} strokeWidth={1.8} strokeLinecap="round" />
        </G>
      );
    case 'fashion':
      return (
        <G>
          <Path d="M-8.5 5.5 L0 -1 L8.5 5.5 Z" fill="none" stroke={w} strokeWidth={2.2} strokeLinejoin="round" />
          <Path d="M0 -1 V-3.6 C0 -6.4 3.4 -6.4 3.4 -9.2" stroke={w} strokeWidth={2} strokeLinecap="round" fill="none" />
        </G>
      );
    default:
      return <Path d="M0 -9 C-7 -1 -7 5 0 5 C7 5 7 -1 0 -9 Z" fill={w} />;
  }
}

const MODULES = ['finance', 'fitness', 'food', 'notes', 'fashion', 'skincare'] as const;

function moduleColors(t: Tones, p: SceneProps['p']) {
  return {
    finance: [t.s(p.good, 400, 300), t.goodLo],
    fitness: [t.s(p.bad, 400, 300), t.badLo],
    food: [t.warm, t.warmLo],
    notes: [t.s(p.brand, 400, 300), t.brandLo],
    fashion: [t.rose, t.roseLo],
    skincare: [t.sky, t.skyLo],
  } as const;
}

/** Six module badges orbiting the assistant. */
function OrbitSatellites({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const colors = moduleColors(t, p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        {MODULES.map((m) => (
          <Grad key={m} id={id} name={m} from={colors[m][0]} to={colors[m][1]} x2="1" y2="1" />
        ))}
      </Defs>
      {MODULES.map((m, i) => {
        const a = (i / MODULES.length) * 2 * Math.PI - Math.PI / 2;
        const x = 120 + Math.cos(a) * 66;
        const y = 90 + Math.sin(a) * 62;
        return (
          <G key={m} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
            <Circle cx={1.5} cy={3} r={17} fill={t.shadow} opacity={t.d ? 0.5 : 0.18} />
            <Circle r={17} fill={ref(id, m)} />
            <Circle r={17} fill="none" stroke={t.white} strokeWidth={1.4} opacity={0.35} />
            {glyph(m, t.white)}
          </G>
        );
      })}
    </Canvas>
  );
}

function OrbitHub({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <RadialGradient id={`${id}-hub`} cx="0.35" cy="0.3" rx="0.85" ry="0.85">
          <Stop offset="0" stopColor={t.s(p.accent, 300, 200)} />
          <Stop offset="0.55" stopColor={t.main} />
          <Stop offset="1" stopColor={t.deep} />
        </RadialGradient>
      </Defs>
      <Circle cx={120} cy={90} r={66} fill="none" stroke={t.hi} strokeWidth={1.6} strokeDasharray="3 6" strokeLinecap="round" opacity={0.7} />
      <Circle cx={120} cy={90} r={40} fill="none" stroke={t.hi} strokeWidth={2} opacity={0.4} />
      <Circle cx={120} cy={90} r={31} fill={`url(#${id}-hub)`} />
      <Circle cx={120} cy={90} r={31} fill="none" stroke={t.white} strokeWidth={1.4} opacity={0.35} />
      <Path d="M107 108 L120 70 L133 108" fill="none" stroke={t.white} strokeWidth={6.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M112 97 H128" stroke={t.white} strokeWidth={5} strokeLinecap="round" />
      <Path d={sparklePath(143, 70, 6, 0.2)} fill={t.white} />
    </Canvas>
  );
}

export const onboardingEverything = spotScene('Modules orbiting the assistant', 0, [
  { id: 'hub', Component: OrbitHub, motion: { scale: 0.03, period: 5 } },
  { id: 'orbit', Component: OrbitSatellites, motion: { scale: 0.025, dy: -2, period: 6, delay: 0.8 } },
  { id: 'float', Component: sparkles([[30, 92, 5], [212, 150, 6]]), motion: { scale: 0.22, period: 3 } },
]);

/** A short conversation: a question, an answer with a mini chart, and the assistant typing. */
function AskArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const bubble = (x: number, y: number, w: number, h: number) => (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={14} fill={t.shadow} opacity={t.d ? 0.5 : 0.18} transform="translate(2 4)" />
      <Rect x={x} y={y} width={w} height={h} rx={14} fill={ref(id, 'theirs')} stroke={t.edge} strokeWidth={1} />
    </G>
  );
  const avatar = (cx: number, cy: number) => (
    <G>
      <Circle cx={cx} cy={cy} r={14} fill={ref(id, 'orb')} />
      <Path d={sparklePath(cx, cy, 8, 0.2)} fill={t.white} />
    </G>
  );
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="theirs" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="mine" from={t.hi} to={t.lo} x2="1" y2="1" />
        <Grad id={id} name="orb" from={t.hi} to={t.deep} x2="1" y2="1" />
      </Defs>
      {/* answer */}
      {avatar(34, 50)}
      {bubble(56, 24, 140, 56)}
      <Rect x={66} y={34} width={52} height={5} rx={2.5} fill={t.line} />
      <Rect x={66} y={44} width={34} height={5} rx={2.5} fill={t.mute} />
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={72 + i * 17} y={72 - [10, 17, 13, 22][i]} width={10} height={[10, 17, 13, 22][i]} rx={2.6} fill={[t.hi, t.main, t.hi, t.lo][i]} />
      ))}
      <Path d="M150 66 L164 56 L176 60 L188 46" stroke={t.warm} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={188} cy={46} r={3.4} fill={t.warm} />
      {/* question */}
      <G>
        <Rect x={100} y={92} width={110} height={32} rx={14} fill={t.shadow} opacity={t.d ? 0.5 : 0.18} transform="translate(2 4)" />
        <Rect x={100} y={92} width={110} height={32} rx={14} fill={ref(id, 'mine')} />
        <Rect x={112} y={104} width={64} height={5} rx={2.5} fill={t.white} opacity={0.95} />
        <Rect x={112} y={112} width={36} height={4} rx={2} fill={t.white} opacity={0.6} />
      </G>
      {/* typing */}
      {avatar(34, 148)}
      {bubble(56, 134, 64, 28)}
      <Circle cx={74} cy={148} r={4} fill={t.main} />
      <Circle cx={88} cy={148} r={4} fill={t.hi} />
      <Circle cx={102} cy={148} r={4} fill={t.soft} />
    </Canvas>
  );
}

export const onboardingAsk = spotScene('Question, answer and typing bubbles', 1, [
  { id: 'art', Component: AskArt },
  { id: 'float', Component: sparkles([[224, 74, 7], [212, 150, 5], [150, 146, 4]]), motion: { scale: 0.22, dy: -3, period: 3 } },
]);

const CLOUD = 'M156 76 C142 76 138 58 152 54 C152 38 172 34 180 46 C186 30 212 34 214 54 C228 54 232 76 216 76 Z';

/** A phone that keeps working, a cloud that is out of reach, and a sync badge that waits. */
function OfflineArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="body" from={t.dark} to={t.darkLo} />
        <Grad id={id} name="screen" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="head" from={t.hi} to={t.lo} x2="1" y2="0" />
        <Grad id={id} name="ok" from={t.s(p.good, 400, 300)} to={t.goodLo} x2="1" y2="1" />
      </Defs>
      <SoftShadow cx={96} cy={154} rx={48} ry={5} color={t.shadow} o={t.shadowO} />
      {/* cloud, dashed to say "later" */}
      <G opacity={0.95}>
        <Path d={CLOUD} fill={t.softer} stroke={t.hi} strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />
      </G>
      {/* sync arrows */}
      <G opacity={0.9}>
        <Path d="M142 112 A18 18 0 0 1 172 100" fill="none" stroke={t.main} strokeWidth={4} strokeLinecap="round" />
        <Path d="M174 92 L175 106 L162 103 Z" fill={t.main} />
        <Path d="M178 122 A18 18 0 0 1 148 134" fill="none" stroke={t.warm} strokeWidth={4} strokeLinecap="round" />
        <Path d="M146 142 L145 128 L158 131 Z" fill={t.warm} />
      </G>
      {/* phone */}
      <G>
        <Rect x={46} y={24} width={78} height={128} rx={16} fill={t.shadow} opacity={t.d ? 0.5 : 0.2} transform="translate(3 5)" />
        <Rect x={46} y={24} width={78} height={128} rx={16} fill={ref(id, 'body')} />
        <Rect x={51} y={29} width={68} height={118} rx={12} fill={ref(id, 'screen')} />
        <Rect x={75} y={33} width={20} height={5} rx={2.5} fill={t.dark} />
        <Rect x={58} y={46} width={54} height={20} rx={7} fill={ref(id, 'head')} />
        <Circle cx={69} cy={56} r={4.6} fill={t.white} opacity={0.9} />
        <Rect x={78} y={53} width={26} height={4} rx={2} fill={t.white} opacity={0.9} />
        <Rect x={78} y={60} width={16} height={3.4} rx={1.7} fill={t.white} opacity={0.6} />
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Circle cx={66} cy={84 + i * 20} r={6} fill={i === 0 ? t.softer : t.mute} />
            <Path d={`M63 ${84 + i * 20} l2.4 2.4 l4 -4.6`} stroke={i === 0 ? t.main : t.line} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Rect x={78} y={81 + i * 20} width={[30, 24, 28][i]} height={4} rx={2} fill={t.line} />
            <Rect x={78} y={88 + i * 20} width={[18, 14, 20][i]} height={3.2} rx={1.6} fill={t.mute} />
          </G>
        ))}
      </G>
      {/* done badge */}
      <Circle cx={122} cy={34} r={14} fill={t.blobTop} />
      <Circle cx={122} cy={34} r={11} fill={ref(id, 'ok')} />
      <Path d="M116.5 34.5 l4 4 l7 -8" stroke={t.white} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Canvas>
  );
}

function OfflineSparkles({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Sparkle x={30} y={118} r={6} fill={t.warm} />
      <Sparkle x={210} y={110} r={7} fill={t.hi} />
    </Canvas>
  );
}

export const onboardingOffline = spotScene('Phone working offline with a waiting cloud', 2, [
  { id: 'art', Component: OfflineArt },
  { id: 'float', Component: OfflineSparkles, motion: { scale: 0.22, dy: -3, period: 3 } },
]);
