import { useId } from 'react';
import { Circle, Defs, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, sparkles, spotScene, tones } from './kit';

/** A magnifying glass over a few blank pages, with a dotted trail that leads nowhere yet. */
function NoResultsPages({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="paper" from={t.cardHi} to={t.cardLo} />
      </Defs>
      <SoftShadow cx={116} cy={153} rx={70} ry={6} color={t.shadow} o={t.shadowO} />
      <G transform="rotate(-10 84 92)">
        <Rect x={48} y={42} width={64} height={88} rx={9} fill={t.shadow} opacity={t.d ? 0.45 : 0.16} transform="translate(2 4)" />
        <Rect x={48} y={42} width={64} height={88} rx={9} fill={ref(id, 'paper')} stroke={t.edge} strokeWidth={1} />
        <Rect x={57} y={54} width={34} height={5} rx={2.5} fill={t.main} />
        <Rect x={57} y={66} width={46} height={4} rx={2} fill={t.line} />
        <Rect x={57} y={75} width={40} height={4} rx={2} fill={t.mute} />
        <Rect x={57} y={84} width={44} height={4} rx={2} fill={t.mute} />
      </G>
      <G transform="rotate(7 108 96)">
        <Rect x={78} y={50} width={60} height={84} rx={9} fill={t.shadow} opacity={t.d ? 0.45 : 0.16} transform="translate(2 4)" />
        <Rect x={78} y={50} width={60} height={84} rx={9} fill={ref(id, 'paper')} stroke={t.edge} strokeWidth={1} />
        <Rect x={86} y={62} width={26} height={5} rx={2.5} fill={t.hi} />
        <Rect x={86} y={74} width={42} height={4} rx={2} fill={t.mute} />
        <Rect x={86} y={83} width={36} height={4} rx={2} fill={t.mute} />
      </G>
      <Path d="M38 146 C58 154 70 130 94 134 C112 137 118 148 140 142" fill="none" stroke={t.main} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 7.5" />
      <Circle cx={38} cy={146} r={5.5} fill="none" stroke={t.main} strokeWidth={2.4} />
      <Circle cx={38} cy={146} r={1.8} fill={t.main} />
    </Canvas>
  );
}

function Magnifier({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="ring" from={t.hi} to={t.lo} x2="1" y2="1" />
        <Grad id={id} name="lens" from={t.cardHi} to={t.softer} x2="1" y2="1" />
        <Grad id={id} name="handle" from={t.dark} to={t.darkLo} />
      </Defs>
      <G transform="translate(150 78) rotate(45)">
        <Rect x={34} y={-6} width={46} height={12} rx={6} fill={ref(id, 'handle')} />
        <Rect x={32} y={-8} width={11} height={16} rx={4} fill={t.deep} />
      </G>
      <Circle cx={150} cy={78} r={36} fill={t.shadow} opacity={t.d ? 0.4 : 0.14} transform="translate(3 5)" />
      <Circle cx={150} cy={78} r={34} fill={ref(id, 'lens')} opacity={0.92} />
      <Circle cx={150} cy={78} r={34} fill="none" stroke={ref(id, 'ring')} strokeWidth={9} />
      <Path d="M129 66 A24 24 0 0 1 144 55" stroke={t.white} strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M141 70 C141 58 160 58 160 70 C160 79 150 79 150 88" fill="none" stroke={t.main} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={150} cy={97} r={3.2} fill={t.main} />
    </Canvas>
  );
}

export const genericNoResults = spotScene('Magnifier over blank pages', 1, [
  { id: 'art', Component: NoResultsPages },
  { id: 'glass', Component: Magnifier, motion: { dy: -5, dx: -3, period: 4.2 } },
  { id: 'float', Component: sparkles([[206, 44, 7], [46, 40, 5]]), motion: { scale: 0.2, period: 3 } },
]);

const CLOUD = 'M62 124 C40 124 34 96 56 90 C54 66 84 58 98 74 C108 50 150 52 156 80 C182 76 192 108 172 124 Z';

/** A cloud crossed out, with the wifi arcs fading above. */
function OfflineCloud({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="cloud" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="slash" from={t.hi} to={t.deep} x2="1" y2="1" />
      </Defs>
      <SoftShadow cx={114} cy={153} rx={66} ry={6} color={t.shadow} o={t.shadowO} />
      <Path d={CLOUD} fill={t.shadow} opacity={t.d ? 0.45 : 0.16} transform="translate(3 6)" />
      <Path d={CLOUD} fill={ref(id, 'cloud')} stroke={t.edge} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M62 124 C40 124 34 96 56 90" fill="none" stroke={t.cardHi} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Path d="M80 52 L156 138" stroke={t.blobTop} strokeWidth={14} strokeLinecap="round" />
      <Path d="M80 52 L156 138" stroke={ref(id, 'slash')} strokeWidth={7} strokeLinecap="round" />
    </Canvas>
  );
}

function WifiArcs({ width, height, p }: SceneProps) {
  const t = tones(p);
  const cx = 192;
  const cy = 62;
  const arc = (r: number) => `M${cx - r * 0.7071} ${cy + 8 - r * 0.7071} A${r} ${r} 0 0 1 ${cx + r * 0.7071} ${cy + 8 - r * 0.7071}`;
  return (
    <Canvas width={width} height={height}>
      <Path d={arc(26)} fill="none" stroke={t.hi} strokeWidth={5} strokeLinecap="round" opacity={0.3} strokeDasharray="14 9" />
      <Path d={arc(17)} fill="none" stroke={t.hi} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
      <Path d={arc(8)} fill="none" stroke={t.main} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={cx} cy={cy + 8} r={3.6} fill={t.main} />
      <Sparkle x={44} y={56} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const genericOffline = spotScene('Cloud with a slash and fading signal', 0, [
  { id: 'art', Component: OfflineCloud },
  { id: 'signal', Component: WifiArcs, motion: { scale: 0.08, dy: -3, period: 3 } },
]);

/** A plug and a wall socket that have come apart, with a spark in the gap. */
function ErrorPlug({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="plug" from={t.hi} to={t.lo} />
        <Grad id={id} name="plate" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="prong" from={t.metalHi} to={t.metalLo} />
      </Defs>
      <SoftShadow cx={118} cy={153} rx={74} ry={6} color={t.shadow} o={t.shadowO} />
      {/* socket */}
      <G transform="translate(-4 0)">
        <Rect x={146} y={54} width={62} height={72} rx={16} fill={t.shadow} opacity={t.d ? 0.45 : 0.16} transform="translate(3 5)" />
        <Rect x={146} y={54} width={62} height={72} rx={16} fill={ref(id, 'plate')} stroke={t.edge} strokeWidth={1.2} />
        <Circle cx={177} cy={90} r={24} fill={t.mute} opacity={0.7} />
        <Circle cx={177} cy={90} r={24} fill="none" stroke={t.edge} strokeWidth={1.4} />
        <Rect x={166} y={80} width={6.5} height={18} rx={3.2} fill={t.dark} />
        <Rect x={182} y={80} width={6.5} height={18} rx={3.2} fill={t.dark} />
        <Circle cx={158} cy={64} r={2} fill={t.line} />
        <Circle cx={196} cy={116} r={2} fill={t.line} />
      </G>
      {/* cable and plug */}
      <G transform="rotate(-8 70 100)">
        <Path d="M40 104 C14 104 10 138 34 144 C54 148 70 142 84 150" fill="none" stroke={t.dark} strokeWidth={8} strokeLinecap="round" />
        <Path d="M40 104 C14 104 10 138 34 144" fill="none" stroke={t.metalLo} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
        <Rect x={40} y={82} width={52} height={44} rx={13} fill={ref(id, 'plug')} />
        <Rect x={46} y={86} width={5} height={36} rx={2.5} fill={t.white} opacity={0.3} />
        <Rect x={64} y={90} width={3} height={28} rx={1.5} fill={t.deep} opacity={0.4} />
        <Rect x={72} y={90} width={3} height={28} rx={1.5} fill={t.deep} opacity={0.4} />
        <Rect x={90} y={89} width={22} height={7} rx={3.2} fill={ref(id, 'prong')} />
        <Rect x={90} y={111} width={22} height={7} rx={3.2} fill={ref(id, 'prong')} />
      </G>
    </Canvas>
  );
}

function SparkBolt({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Path transform="translate(-8 0)" d="M136 62 L120 94 H131 L124 124 L148 86 H136 L144 62 Z" fill={t.warm} stroke={t.warmLo} strokeWidth={1.6} strokeLinejoin="round" />
      <Path transform="translate(-8 0)" d="M121 50 L117 40 M150 52 L156 44 M114 70 L104 66 M160 74 L170 70" stroke={t.bad} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={108} cy={128} r={2.6} fill={t.warm} />
      <Circle cx={160} cy={120} r={2.2} fill={t.bad} />
    </Canvas>
  );
}

export const genericError = spotScene('Unplugged plug with a spark', 2, [
  { id: 'art', Component: ErrorPlug },
  { id: 'spark', Component: SparkBolt, motion: { scale: 0.1, dy: -3, period: 2.4 } },
]);

/** A padlock and its key. */
function SessionLock({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="body" from={t.hi} to={t.lo} />
        <Grad id={id} name="shackle" from={t.metalHi} to={t.metalLo} x2="1" y2="0" />
      </Defs>
      <SoftShadow cx={104} cy={153} rx={58} ry={6} color={t.shadow} o={t.shadowO} />
      <Path d="M82 88 V62 C82 30 126 30 126 62 V88" fill="none" stroke={t.metalLo} strokeWidth={14} strokeLinecap="round" />
      <Path d="M82 88 V62 C82 30 126 30 126 62 V88" fill="none" stroke={ref(id, 'shackle')} strokeWidth={10} strokeLinecap="round" />
      <Rect x={62} y={82} width={84} height={68} rx={16} fill={t.shadow} opacity={t.d ? 0.4 : 0.15} transform="translate(3 5)" />
      <Rect x={62} y={82} width={84} height={68} rx={16} fill={ref(id, 'body')} />
      <Path d="M62 98 a16 16 0 0 1 16 -16 H130 a16 16 0 0 1 16 16 V102 H62 Z" fill={t.white} opacity={0.12} />
      <Rect x={70} y={90} width={6} height={52} rx={3} fill={t.white} opacity={0.22} />
      <Circle cx={104} cy={108} r={9} fill={t.deep} />
      <Path d="M99 113 H109 L111.5 134 H96.5 Z" fill={t.deep} />
      <Circle cx={104} cy={108} r={3.6} fill={t.white} opacity={0.35} />
    </Canvas>
  );
}

function SessionKey({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="gold" from={t.warmHi} to={t.warmLo} x2="1" y2="1" />
      </Defs>
      <G transform="translate(190 66) rotate(120)">
        <Rect x={10} y={-4} width={54} height={8} rx={4} fill={ref(id, 'gold')} />
        <Rect x={46} y={2} width={7} height={11} rx={2.4} fill={ref(id, 'gold')} />
        <Rect x={57} y={2} width={7} height={8} rx={2.4} fill={ref(id, 'gold')} />
        <Circle r={15} fill="none" stroke={t.warmLo} strokeWidth={9} />
        <Circle r={15} fill="none" stroke={ref(id, 'gold')} strokeWidth={6.4} />
        <Path d="M-10 -8 A12 12 0 0 1 -2 -13" stroke={t.warmHi} strokeWidth={2} strokeLinecap="round" fill="none" />
      </G>
      <Sparkle x={44} y={46} r={7} fill={t.warm} />
      <Sparkle x={208} y={128} r={5} fill={t.hi} />
    </Canvas>
  );
}

export const genericSession = spotScene('Padlock and key', 3, [
  { id: 'art', Component: SessionLock },
  { id: 'key', Component: SessionKey, motion: { dy: -5, scale: 0.03, period: 3.6 } },
]);
