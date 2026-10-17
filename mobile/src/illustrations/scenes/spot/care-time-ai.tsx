import { useId } from 'react';
import { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, sparklePath, sparkles, spotScene, tones } from './kit';

/** A dropper bottle, a pump bottle and a cream jar. */
function ProductsArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="glass" from={t.hi} to={t.lo} />
        <Grad id={id} name="rose" from={t.rose} to={t.roseLo} />
        <Grad id={id} name="jar" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="lid" from={t.hi} to={t.deep} />
        <Grad id={id} name="gold" from={t.warmHi} to={t.warmLo} x2="1" y2="0" />
        <Grad id={id} name="bulb" from={t.dark} to={t.darkLo} x2="1" y2="0" />
      </Defs>
      <SoftShadow cx={118} cy={153} rx={74} ry={6} color={t.shadow} o={t.shadowO} />
      {/* leaves behind the jar */}
      <G>
        <Path d="M186 112 C176 100 178 84 192 76 C202 88 198 104 186 112 Z" fill={t.good} />
        <Path d="M186 112 C184 100 188 88 192 76" stroke={t.goodLo} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        <Path d="M190 114 C196 102 210 98 218 102 C214 114 202 118 190 114 Z" fill={t.s(p.good, 400, 300)} />
      </G>
      {/* pump bottle */}
      <G>
        <Rect x={32} y={90} width={32} height={60} rx={10} fill={ref(id, 'rose')} />
        <Rect x={37} y={94} width={5} height={44} rx={2.5} fill={t.cardHi} opacity={0.35} />
        <Rect x={44} y={80} width={8} height={12} rx={2} fill={ref(id, 'gold')} />
        <Rect x={46.5} y={70} width={3} height={12} rx={1.5} fill={t.metalLo} />
        <Rect x={38} y={62} width={20} height={9} rx={4} fill={ref(id, 'gold')} />
        <Rect x={28} y={64} width={14} height={4.5} rx={2.2} fill={ref(id, 'gold')} />
        <Rect x={40} y={110} width={24} height={22} rx={5} fill={t.cardHi} opacity={0.9} />
        <Circle cx={52} cy={118} r={3.4} fill={t.roseLo} />
        <Rect x={44} y={125} width={16} height={3} rx={1.5} fill={t.line} />
      </G>
      {/* dropper bottle */}
      <G>
        <Rect x={72} y={70} width={52} height={80} rx={14} fill={ref(id, 'glass')} />
        <Path d="M72 100 H124 V136 a14 14 0 0 1 -14 14 H86 a14 14 0 0 1 -14 -14 Z" fill={t.deep} opacity={0.22} />
        <Rect x={78} y={76} width={6} height={64} rx={3} fill={t.cardHi} opacity={0.4} />
        <Rect x={80} y={94} width={36} height={38} rx={7} fill={t.cardHi} />
        <Path d="M98 104 C90 108 90 118 98 122 C106 118 106 108 98 104 Z" fill={t.main} />
        <Path d="M98 106 V120" stroke={t.cardHi} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
        <Rect x={86} y={124} width={24} height={3} rx={1.5} fill={t.line} />
        <Rect x={85} y={58} width={26} height={16} rx={4} fill={ref(id, 'gold')} />
        <Rect x={88} y={30} width={20} height={32} rx={10} fill={ref(id, 'bulb')} />
        <Rect x={92} y={34} width={4} height={18} rx={2} fill={t.cardHi} opacity={0.35} />
      </G>
      {/* cream jar */}
      <G>
        <Rect x={132} y={112} width={62} height={38} rx={10} fill={ref(id, 'jar')} stroke={t.edge} strokeWidth={1} />
        <Rect x={129} y={96} width={68} height={20} rx={7} fill={ref(id, 'lid')} />
        <Rect x={133} y={99} width={60} height={4} rx={2} fill={t.cardHi} opacity={0.3} />
        <Rect x={146} y={124} width={36} height={4} rx={2} fill={t.main} />
        <Rect x={152} y={133} width={24} height={3.4} rx={1.7} fill={t.line} />
      </G>
    </Canvas>
  );
}

function DropletFloat({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="drop" from={t.hi} to={t.lo} x2="1" y2="1" />
      </Defs>
      <Path d="M162 34 C146 56 146 70 162 70 C178 70 178 56 162 34 Z" fill={ref(id, 'drop')} />
      <Path d="M156 54 C153 60 154 65 158 67" stroke={t.cardHi} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M206 62 C201 69 201 74 206 74 C211 74 211 69 206 62 Z" fill={t.hi} opacity={0.9} />
      <Sparkle x={44} y={44} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const skincareProducts = spotScene('Serum, pump bottle and cream jar', 3, [
  { id: 'art', Component: ProductsArt },
  { id: 'float', Component: DropletFloat, motion: { dy: -6, scale: 0.05, period: 3.4 } },
]);

/** An alarm clock and an hourglass. */
function TimeArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  const hand = (deg: number, len: number) => {
    const a = (deg * Math.PI) / 180;
    return `M0 0 L${(Math.sin(a) * len).toFixed(2)} ${(-Math.cos(a) * len).toFixed(2)}`;
  };
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="bezel" from={t.hi} to={t.lo} />
        <Grad id={id} name="face" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="bell" from={t.deep} to={t.lo} />
        <Grad id={id} name="glass" from={t.cardHi} to={t.cardLo} x2="1" y2="0" />
        <Grad id={id} name="plate" from={t.warm} to={t.warmLo} />
        <Grad id={id} name="sand" from={t.warmHi} to={t.warm} />
      </Defs>
      <SoftShadow cx={118} cy={153} rx={74} ry={6} color={t.shadow} o={t.shadowO} />
      {/* alarm clock */}
      <G>
        <Ellipse cx={74} cy={52} rx={15} ry={9} fill={ref(id, 'bell')} transform="rotate(-32 74 52)" />
        <Ellipse cx={126} cy={52} rx={15} ry={9} fill={ref(id, 'bell')} transform="rotate(32 126 52)" />
        <Rect x={96} y={38} width={8} height={9} rx={2} fill={t.metalLo} />
        <Rect x={90} y={34} width={20} height={6} rx={3} fill={t.metalHi} />
        <Path d="M78 134 L70 150 M122 134 L130 150" stroke={t.deep} strokeWidth={6} strokeLinecap="round" />
        <Circle cx={100} cy={92} r={52} fill={ref(id, 'bezel')} />
        <Circle cx={100} cy={92} r={44} fill={ref(id, 'face')} />
        <Circle cx={100} cy={92} r={44} fill="none" stroke={t.deep} strokeWidth={1.4} opacity={0.35} />
        {ticks.map((i) => {
          const a = (i * 30 * Math.PI) / 180;
          const major = i % 3 === 0;
          const r1 = 37;
          const r2 = major ? 30 : 33;
          return (
            <Path
              key={i}
              d={`M${(100 + Math.sin(a) * r1).toFixed(2)} ${(92 - Math.cos(a) * r1).toFixed(2)} L${(100 + Math.sin(a) * r2).toFixed(2)} ${(92 - Math.cos(a) * r2).toFixed(2)}`}
              stroke={major ? t.ink : t.line}
              strokeWidth={major ? 3 : 1.8}
              strokeLinecap="round"
            />
          );
        })}
        <Path d="M100 62 A30 30 0 0 1 126 107" fill="none" stroke={t.warm} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        <G transform="translate(100 92)">
          <Path d={hand(-60, 19)} stroke={t.ink} strokeWidth={4.5} strokeLinecap="round" />
          <Path d={hand(60, 28)} stroke={t.ink} strokeWidth={3.4} strokeLinecap="round" />
          <Path d={hand(150, 30)} stroke={t.rose} strokeWidth={1.8} strokeLinecap="round" />
          <Circle r={5} fill={t.main} />
          <Circle r={1.8} fill={t.cardHi} />
        </G>
      </G>
      {/* hourglass */}
      <G>
        <Rect x={158} y={64} width={4} height={72} rx={2} fill={t.metalLo} />
        <Rect x={194} y={64} width={4} height={72} rx={2} fill={t.metalLo} />
        <Path d="M162 70 H194 C194 90 184 98 181 104 L175 104 C172 98 162 90 162 70 Z" fill={ref(id, 'glass')} stroke={t.edge} strokeWidth={1.2} />
        <Path d="M175 104 L181 104 C184 110 194 118 194 136 H162 C162 118 172 110 175 104 Z" fill={ref(id, 'glass')} stroke={t.edge} strokeWidth={1.2} />
        <Path d="M168 82 H188 C185 90 181 94 179 100 H177 C175 94 171 90 168 82 Z" fill={ref(id, 'sand')} />
        <Path d="M178 100 V122" stroke={t.warm} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M165 135 C170 126 174 120 178 116 C182 120 186 126 191 135 Z" fill={ref(id, 'sand')} />
        <Rect x={154} y={58} width={48} height={9} rx={4.5} fill={ref(id, 'plate')} />
        <Rect x={154} y={134} width={48} height={9} rx={4.5} fill={ref(id, 'plate')} />
        <Rect x={158} y={59.5} width={20} height={2.4} rx={1.2} fill={t.warmHi} opacity={0.8} />
      </G>
    </Canvas>
  );
}

export const timeLogs = spotScene('Alarm clock and hourglass', 0, [
  { id: 'art', Component: TimeArt },
  { id: 'float', Component: sparkles([[208, 50, 8], [38, 70, 5]]), motion: { scale: 0.2, dy: -3, period: 3.2 } },
]);

/** Chat bubbles around the assistant. */
function BubblesArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="mine" from={t.hi} to={t.lo} x2="1" y2="1" />
        <Grad id={id} name="theirs" from={t.cardHi} to={t.cardLo} />
      </Defs>
      <G>
        <Path d="M30 34 a14 14 0 0 1 14 -14 H98 a14 14 0 0 1 14 14 V52 a14 14 0 0 1 -14 14 H62 L46 80 V66 H44 a14 14 0 0 1 -14 -14 Z" fill={t.shadow} opacity={t.d ? 0.5 : 0.18} transform="translate(2 4)" />
        <Path d="M30 34 a14 14 0 0 1 14 -14 H98 a14 14 0 0 1 14 14 V52 a14 14 0 0 1 -14 14 H62 L46 80 V66 H44 a14 14 0 0 1 -14 -14 Z" fill={ref(id, 'theirs')} stroke={t.edge} strokeWidth={1} />
        <Circle cx={55} cy={43} r={4.6} fill={t.main} />
        <Circle cx={71} cy={43} r={4.6} fill={t.hi} />
        <Circle cx={87} cy={43} r={4.6} fill={t.soft} />
      </G>
      <G>
        <Path d="M146 60 a14 14 0 0 1 14 -14 H190 a14 14 0 0 1 14 14 V74 a14 14 0 0 1 -14 14 H192 V102 L176 88 H160 a14 14 0 0 1 -14 -14 Z" fill={t.shadow} opacity={t.d ? 0.5 : 0.18} transform="translate(2 4)" />
        <Path d="M146 60 a14 14 0 0 1 14 -14 H190 a14 14 0 0 1 14 14 V74 a14 14 0 0 1 -14 14 H192 V102 L176 88 H160 a14 14 0 0 1 -14 -14 Z" fill={ref(id, 'mine')} />
        <Rect x={156} y={58} width={38} height={4.6} rx={2.3} fill={t.white} opacity={0.95} />
        <Rect x={156} y={68} width={24} height={4.6} rx={2.3} fill={t.white} opacity={0.7} />
      </G>
    </Canvas>
  );
}

function OrbArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <RadialGradient id={`${id}-orb`} cx="0.35" cy="0.3" rx="0.85" ry="0.85">
          <Stop offset="0" stopColor={t.s(p.accent, 300, 200)} />
          <Stop offset="0.5" stopColor={t.main} />
          <Stop offset="1" stopColor={t.deep} />
        </RadialGradient>
      </Defs>
      <Circle cx={120} cy={106} r={52} fill="none" stroke={t.hi} strokeWidth={1.6} opacity={0.35} />
      <Circle cx={120} cy={106} r={43} fill="none" stroke={t.hi} strokeWidth={2.2} opacity={0.5} />
      <Circle cx={120} cy={106} r={33} fill={`url(#${id}-orb)`} />
      <Ellipse cx={109} cy={92} rx={14} ry={8} fill={t.white} opacity={0.3} transform="rotate(-30 109 92)" />
      <Path d={sparklePath(121, 108, 17, 0.2)} fill={t.white} />
      <Path d={sparklePath(135, 92, 6, 0.2)} fill={t.white} opacity={0.85} />
    </Canvas>
  );
}

export const aiChat = spotScene('Assistant orb and chat bubbles', 1, [
  { id: 'bubbles', Component: BubblesArt, motion: { dy: -2, period: 5, delay: 1 } },
  { id: 'orb', Component: OrbArt, motion: { dy: -5, scale: 0.02, period: 4.4 } },
  { id: 'float', Component: sparkles([[48, 108, 6], [204, 128, 7], [160, 28, 5]]), motion: { scale: 0.22, period: 3, delay: 0.5 } },
]);
