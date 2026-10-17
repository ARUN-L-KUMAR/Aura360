import { useId } from 'react';
import { Circle, Defs, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, sparkles, spotScene, tones } from './kit';

/** Notebook with spiral rings and a pencil leaning on it. */
function NotebookArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="cover" from={t.hi} to={t.lo} />
        <Grad id={id} name="page" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="wood" from={t.warmHi} to={t.warm} />
        <Grad id={id} name="pencil" from={t.warm} to={t.warmLo} />
        <Grad id={id} name="ring" from={t.metalHi} to={t.metalLo} x2="1" y2="0" />
      </Defs>
      <SoftShadow cx={116} cy={152} rx={56} ry={6} color={t.shadow} o={t.shadowO} />
      {/* pages peeking out from behind the cover */}
      <Rect x={84} y={40} width={92} height={112} rx={9} fill={t.edge} />
      <Rect x={81} y={38} width={92} height={112} rx={9} fill={ref(id, 'page')} />
      {/* cover */}
      <Rect x={74} y={32} width={92} height={114} rx={10} fill={ref(id, 'cover')} />
      <Path d="M74 42 a10 10 0 0 1 10 -10 H98 V146 H84 a10 10 0 0 1 -10 -10 Z" fill={t.deep} opacity={0.28} />
      <Rect x={74} y={32} width={92} height={5} rx={2.5} fill={t.hi} opacity={0.55} />
      {/* title label */}
      <Rect x={104} y={58} width={50} height={36} rx={7} fill={ref(id, 'page')} />
      <Rect x={112} y={67} width={34} height={5} rx={2.5} fill={t.main} />
      <Rect x={112} y={77} width={24} height={4} rx={2} fill={t.line} />
      <Rect x={112} y={84} width={30} height={4} rx={2} fill={t.line} />
      {/* doodle on the cover */}
      <Circle cx={129} cy={118} r={9} fill={t.deep} opacity={0.35} />
      <Path d="M124 118 l4 4 l8 -9" stroke={t.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* bookmark ribbon */}
      <Path d="M150 32 V64 L158 57 L166 64 V32 Z" fill={t.warm} />
      <Path d="M150 32 V64 L158 57 V32 Z" fill={t.warmLo} opacity={0.35} />
      {/* spiral rings */}
      {[46, 62, 78, 94, 110, 126].map((y) => (
        <G key={y}>
          <Rect x={64} y={y} width={26} height={7} rx={3.5} fill={ref(id, 'ring')} />
          <Circle cx={90} cy={y + 3.5} r={2.6} fill={t.deep} />
        </G>
      ))}
      {/* pencil */}
      <G transform="translate(176 114) rotate(-42)">
        <Rect x={-30} y={-7} width={62} height={14} rx={2} fill={ref(id, 'pencil')} />
        <Rect x={-30} y={-7} width={62} height={4} rx={2} fill={t.warmHi} opacity={0.55} />
        <Rect x={-30} y={3} width={62} height={4} fill={t.warmLo} opacity={0.5} />
        <Path d="M-30 -7 H-38 a7 7 0 0 0 -7 7 a7 7 0 0 0 7 7 H-30 Z" fill={t.rose} />
        <Rect x={-32} y={-7} width={5} height={14} fill={ref(id, 'ring')} />
        <Path d="M32 -7 L54 0 L32 7 Z" fill={ref(id, 'wood')} />
        <Path d="M46 -2.6 L54 0 L46 2.6 Z" fill={t.ink} />
      </G>
    </Canvas>
  );
}

export const notesEmpty = spotScene('Notebook and pencil', 0, [
  { id: 'art', Component: NotebookArt },
  { id: 'float', Component: sparkles([[196, 56, 9], [58, 40, 5]]), motion: { scale: 0.18, dy: -3, period: 3.2 } },
]);

/** Browser-style page card with a big bookmark ribbon and a chain link. */
function SavedArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="card" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="ribbon" from={t.hi} to={t.lo} />
        <Grad id={id} name="img" from={t.soft} to={t.hi} x2="1" y2="1" />
        <Grad id={id} name="link" from={t.warm} to={t.warmLo} x2="1" y2="1" />
      </Defs>
      <SoftShadow cx={116} cy={152} rx={58} ry={6} color={t.shadow} o={t.shadowO} />
      {/* back card */}
      <G transform="translate(120 90) rotate(7)">
        <Rect x={-44} y={-52} width={88} height={104} rx={10} fill={t.edge} opacity={0.9} />
      </G>
      {/* front card */}
      <G transform="translate(112 90) rotate(-5)">
        <Rect x={-48} y={-56} width={96} height={112} rx={11} fill={ref(id, 'card')} />
        <Path d="M-48 -45 a11 11 0 0 1 11 -11 H37 a11 11 0 0 1 11 11 V-34 H-48 Z" fill={t.softer} />
        <Circle cx={-37} cy={-45} r={2.6} fill={t.hi} />
        <Circle cx={-28} cy={-45} r={2.6} fill={t.warm} />
        <Circle cx={-19} cy={-45} r={2.6} fill={t.good} />
        <Rect x={-38} y={-24} width={76} height={42} rx={7} fill={ref(id, 'img')} />
        <Path d="M-38 18 V6 L-18 -8 L-2 6 L12 -4 L38 14 V18 a7 7 0 0 1 -7 0 Z" fill={t.main} opacity={0.55} />
        <Circle cx={22} cy={-10} r={6} fill={t.cardHi} opacity={0.9} />
        <Rect x={-38} y={28} width={60} height={5} rx={2.5} fill={t.line} />
        <Rect x={-38} y={38} width={40} height={5} rx={2.5} fill={t.mute} />
      </G>
      {/* bookmark ribbon */}
      <G>
        <Path d="M150 28 H182 a4 4 0 0 1 4 4 V86 L166 70 L146 86 V32 a4 4 0 0 1 4 -4 Z" fill={ref(id, 'ribbon')} />
        <Path d="M146 32 a4 4 0 0 1 4 -4 H160 V78 L146 86 Z" fill={t.deep} opacity={0.25} />
        <Path d="M166 40 l3.2 6.5 l7.1 1 l-5.2 5 l1.3 7.1 l-6.4 -3.4 l-6.4 3.4 l1.3 -7.1 l-5.2 -5 l7.1 -1 Z" fill={t.white} />
      </G>
      {/* chain link */}
      <G transform="translate(58 134) rotate(-32)">
        <Rect x={-26} y={-11} width={36} height={22} rx={11} fill="none" stroke={t.edge} strokeWidth={8} />
        <Rect x={-26} y={-11} width={36} height={22} rx={11} fill="none" stroke={ref(id, 'link')} strokeWidth={5.5} />
        <Rect x={-4} y={-11} width={36} height={22} rx={11} fill="none" stroke={t.edge} strokeWidth={8} />
        <Rect x={-4} y={-11} width={36} height={22} rx={11} fill="none" stroke={t.main} strokeWidth={5.5} />
        <Path d="M-20 -6 H-12" stroke={t.cardHi} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
      </G>
    </Canvas>
  );
}

function HeartPop({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Path transform="translate(8 16)" d="M200 56 c-4 -8 -16 -4 -14 5 c2 7 14 13 14 13 s12 -6 14 -13 c2 -9 -10 -13 -14 -5 Z" fill={t.rose} />
      <Sparkle x={52} y={50} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const savedEmpty = spotScene('Bookmark, page and link', 1, [
  { id: 'art', Component: SavedArt },
  { id: 'float', Component: HeartPop, motion: { dy: -5, scale: 0.08, period: 3.4 } },
]);
