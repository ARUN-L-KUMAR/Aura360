import { useId } from 'react';
import { Circle, Defs, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, spotScene, tones } from './kit';

/** A bell with soft sound waves. */
function BellArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const wave = (r: number, dir: 1 | -1) => {
    const x = 120 + dir * r * 0.88;
    const dy = r * 0.47;
    return `M${x} ${92 - dy} A${r} ${r} 0 0 ${dir === 1 ? 1 : 0} ${x} ${92 + dy}`;
  };
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="bell" from={t.hi} to={t.lo} x2="1" y2="0" />
        <Grad id={id} name="rim" from={t.deep} to={t.lo} />
        <Grad id={id} name="clap" from={t.warm} to={t.warmLo} />
      </Defs>
      <SoftShadow cx={120} cy={154} rx={50} ry={5} color={t.shadow} o={t.shadowO} />
      {[58, 76].map((r, i) => (
        <G key={r}>
          <Path d={wave(r, 1)} fill="none" stroke={t.hi} strokeWidth={5.5} strokeLinecap="round" opacity={i === 0 ? 0.7 : 0.35} />
          <Path d={wave(r, -1)} fill="none" stroke={t.hi} strokeWidth={5.5} strokeLinecap="round" opacity={i === 0 ? 0.7 : 0.35} />
        </G>
      ))}
      <Circle cx={120} cy={32} r={7} fill={t.deep} />
      <Path d="M120 36 C96 36 86 56 86 78 V104 L72 122 V128 H168 V122 L154 104 V78 C154 56 144 36 120 36 Z" fill={t.shadow} opacity={t.d ? 0.4 : 0.16} transform="translate(3 5)" />
      <Path d="M120 36 C96 36 86 56 86 78 V104 L72 122 V128 H168 V122 L154 104 V78 C154 56 144 36 120 36 Z" fill={ref(id, 'bell')} />
      <Path d="M100 52 C92 60 92 72 92 84" stroke={t.white} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.4} />
      <Rect x={72} y={120} width={96} height={10} rx={5} fill={ref(id, 'rim')} />
      <Path d="M108 134 H132 C130 144 126 148 120 148 C114 148 110 144 108 134 Z" fill={ref(id, 'clap')} />
    </Canvas>
  );
}

function BellBadge({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Circle cx={152} cy={46} r={16} fill={t.blobTop} />
      <Circle cx={152} cy={46} r={12.5} fill={t.bad} />
      <Rect x={150} y={39} width={4} height={9} rx={2} fill={t.white} />
      <Circle cx={152} cy={52.5} r={2.2} fill={t.white} />
      <Sparkle x={44} y={46} r={6} fill={t.warm} />
      <Sparkle x={204} y={128} r={6} fill={t.hi} />
    </Canvas>
  );
}

export const permissionsNotifications = spotScene('Bell with soft waves', 2, [
  { id: 'art', Component: BellArt, motion: { dy: -3, period: 4 } },
  { id: 'float', Component: BellBadge, motion: { scale: 0.1, dy: -2, period: 2.4 } },
]);

/** A shield with a fingerprint and a scan beam. */
function ShieldArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const SHIELD = 'M120 24 L170 42 V86 C170 120 148 142 120 154 C92 142 70 120 70 86 V42 Z';
  const prints: [number, number][] = [
    [7, 12],
    [14, 22],
    [21, 28],
    [28, 18],
  ];
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="shield" from={t.hi} to={t.deep} x1="0" y1="0" x2="0.4" y2="1" />
      </Defs>
      <SoftShadow cx={120} cy={156} rx={52} ry={5} color={t.shadow} o={t.shadowO} />
      <Path d={SHIELD} fill={t.shadow} opacity={t.d ? 0.4 : 0.16} transform="translate(3 5)" />
      <Path d={SHIELD} fill={ref(id, 'shield')} />
      <Path d="M120 24 L170 42 V86 C170 120 148 142 120 154 Z" fill={t.deep} opacity={0.25} />
      <Path d="M120 34 L162 49 V86 C162 114 144 133 120 144 C96 133 78 114 78 86 V49 Z" fill="none" stroke={t.white} strokeWidth={1.6} opacity={0.4} />
      <G transform="translate(120 92)">
        {prints.map(([r, tail], i) => (
          <Path
            key={r}
            d={`M${-r} ${tail} V0 A${r} ${r} 0 0 1 ${r} 0 V${tail - (i % 2 === 0 ? 4 : 0)}`}
            fill="none"
            stroke={t.white}
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeDasharray={i === 2 ? '40 7 40' : undefined}
          />
        ))}
        <Path d="M0 2 V24" stroke={t.white} strokeWidth={3.4} strokeLinecap="round" />
      </G>
    </Canvas>
  );
}

function ScanBeam({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Rect x={84} y={66} width={72} height={9} rx={4.5} fill={t.warm} opacity={0.22} />
      <Rect x={86} y={68} width={68} height={5} rx={2.5} fill={t.warm} opacity={0.5} />
      <Rect x={90} y={69.4} width={60} height={2.2} rx={1.1} fill={t.warmHi} />
      <G>
        <Circle cx={170} cy={132} r={15} fill={t.blobTop} />
        <Circle cx={170} cy={132} r={12} fill={t.good} />
        <Path d="M164 132.5 l4 4 l7 -8" stroke={t.white} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>
      <Sparkle x={44} y={50} r={6} fill={t.warm} />
      <Sparkle x={204} y={46} r={7} fill={t.hi} />
    </Canvas>
  );
}

export const permissionsBiometrics = spotScene('Shield with a fingerprint', 3, [
  { id: 'art', Component: ShieldArt },
  { id: 'scan', Component: ScanBeam, motion: { scale: 0.04, period: 3 } },
]);
