import { useId } from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, Sneaker, SoftShadow, Sparkle, ref, spotScene, tones } from './kit';

/** A plate with a fresh salad, a fork and a spoon. */
function MealArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="plate" from={t.cardHi} to={t.cardLo} x1="0" y1="0" x2="1" y2="1" />
        <Grad id={id} name="dish" from={t.cardLo} to={t.cardHi} x1="0" y1="0" x2="1" y2="1" />
        <Grad id={id} name="leaf" from={t.s(p.good, 400, 400)} to={t.goodLo} />
        <Grad id={id} name="leaf2" from={t.s(p.good, 300, 300)} to={t.good} />
        <Grad id={id} name="tomato" from={t.s(p.bad, 400, 300)} to={t.badLo} />
        <Grad id={id} name="steel" from={t.metalHi} to={t.metalLo} x2="1" y2="0" />
      </Defs>
      <SoftShadow cx={120} cy={153} rx={62} ry={6} color={t.shadow} o={t.shadowO} />
      <Circle cx={124} cy={96} r={54} fill={t.shadow} opacity={t.d ? 0.5 : 0.2} />
      <Circle cx={120} cy={90} r={54} fill={ref(id, 'plate')} stroke={t.edge} strokeWidth={1.4} />
      <Circle cx={120} cy={90} r={40} fill={ref(id, 'dish')} stroke={t.edge} strokeWidth={1.2} />
      {/* salad */}
      <G transform="translate(120 90) scale(1.18)">
        <G transform="rotate(-30)">
          <Ellipse cx={-6} cy={-14} rx={22} ry={11} fill={ref(id, 'leaf2')} />
          <Path d="M-26 -14 H12" stroke={t.goodLo} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
        </G>
        <G transform="rotate(35)">
          <Ellipse cx={4} cy={10} rx={24} ry={12} fill={ref(id, 'leaf')} />
          <Path d="M-16 10 H26" stroke={t.s(p.good, 300, 300)} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        </G>
        <G transform="rotate(-100)">
          <Ellipse cx={0} cy={-12} rx={18} ry={9} fill={ref(id, 'leaf2')} />
        </G>
        {/* egg half */}
        <Ellipse cx={12} cy={-8} rx={15} ry={12} fill={t.cardHi} stroke={t.edge} strokeWidth={1} />
        <Circle cx={12} cy={-8} r={6.5} fill={t.warm} />
        <Circle cx={10} cy={-10} r={2} fill={t.warmHi} opacity={0.8} />
        {/* tomatoes */}
        <Circle cx={-18} cy={4} r={10} fill={ref(id, 'tomato')} />
        <Path d="M-23 -1 Q-18 -5 -12 -1" stroke={t.good} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Circle cx={-21} cy={2} r={2} fill={t.cardHi} opacity={0.55} />
        <Circle cx={20} cy={20} r={9} fill={ref(id, 'tomato')} />
        <Circle cx={20} cy={20} r={5} fill={t.bad} opacity={0.5} />
        <Circle cx={17} cy={17} r={1.8} fill={t.cardHi} opacity={0.55} />
        <Circle cx={-4} cy={26} r={3} fill={t.warm} />
        <Circle cx={4} cy={30} r={2.6} fill={t.warmLo} />
        <Circle cx={32} cy={2} r={2.6} fill={t.warm} />
      </G>
      {/* fork */}
      <G transform="translate(44 92) rotate(6)">
        <Rect x={-3.2} y={-6} width={6.4} height={58} rx={3.2} fill={ref(id, 'steel')} />
        <Path d="M-9 -34 V-10 Q-9 -2 0 0 Q9 -2 9 -10 V-34 H5.6 V-14 H1.8 V-34 H-1.8 V-14 H-5.6 V-34 Z" fill={ref(id, 'steel')} />
        <Path d="M-9 -34 H-5.6 V-14" stroke={t.cardHi} strokeWidth={1} fill="none" opacity={0.7} />
      </G>
      {/* spoon */}
      <G transform="translate(198 92) rotate(-6)">
        <Rect x={-3.2} y={-8} width={6.4} height={60} rx={3.2} fill={ref(id, 'steel')} />
        <Ellipse cx={0} cy={-26} rx={10.5} ry={16} fill={ref(id, 'steel')} />
        <Ellipse cx={-2.6} cy={-29} rx={4} ry={8} fill={t.cardHi} opacity={0.5} />
      </G>
    </Canvas>
  );
}

function LeafFloat({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <G transform="translate(190 40) rotate(28)">
        <Path d="M0 0 C-14 -8 -14 -30 0 -40 C14 -30 14 -8 0 0 Z" fill={t.good} />
        <Path d="M0 0 V-34" stroke={t.goodLo} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M0 -10 L-6 -16 M0 -18 L6 -24 M0 -22 L-5 -28" stroke={t.goodLo} strokeWidth={1.2} strokeLinecap="round" />
      </G>
      <Sparkle x={52} y={36} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const foodMeals = spotScene('Plate with fork and spoon', 0, [
  { id: 'art', Component: MealArt },
  { id: 'float', Component: LeafFloat, motion: { dy: -5, scale: 0.05, period: 3.6 } },
]);

/** A hex dumbbell and a running shoe. */
function WorkoutArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="plate" from={t.hi} to={t.lo} />
        <Grad id={id} name="plate2" from={t.main} to={t.deep} />
        <Grad id={id} name="bar" from={t.metalHi} to={t.metalLo} />
        <Grad id={id} name="shoe" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="shoe2" from={t.sky} to={t.skyLo} />
      </Defs>
      <SoftShadow cx={150} cy={152} rx={50} ry={6} color={t.shadow} o={t.shadowO} />
      <G transform="translate(98 70) rotate(-24)">
        <Rect x={-56} y={-4.5} width={112} height={9} rx={4.5} fill={ref(id, 'bar')} />
        <Rect x={-18} y={-7} width={36} height={14} rx={5} fill={t.dark} />
        {[-12, -6, 0, 6, 12].map((x) => (
          <Path key={x} d={`M${x} -6 L${x + 3} 6`} stroke={t.metalLo} strokeWidth={1.2} opacity={0.7} />
        ))}
        {/* plates, left then right */}
        {[-1, 1].map((side) => (
          <G key={side}>
            <Rect x={side * 38 - 6} y={-19} width={12} height={38} rx={4.5} fill={ref(id, 'plate2')} />
            <Rect x={side * 26 - 8} y={-27} width={16} height={54} rx={6} fill={ref(id, 'plate')} />
            <Rect x={side * 26 - 6} y={-25} width={5} height={50} rx={2.5} fill={t.cardHi} opacity={0.3} />
            <Rect x={side * 50 - 3} y={-6} width={6} height={12} rx={3} fill={t.metalLo} />
          </G>
        ))}
      </G>
      <Sneaker t={t} x={108} y={104} s={1.4} body={t.sky} trim={t.skyLo} />
      <Path d="M102 118 H90 M104 128 H84 M106 138 H94" stroke={t.hi} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </Canvas>
  );
}

function SweatFloat({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Path d="M196 40 C186 54 186 62 196 62 C206 62 206 54 196 40 Z" fill={t.sky} />
      <Path d="M193 52 C191 56 192 59 195 60" stroke={t.cardHi} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.8} />
      <Sparkle x={46} y={52} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const fitnessWorkouts = spotScene('Dumbbell and sneaker', 1, [
  { id: 'art', Component: WorkoutArt },
  { id: 'float', Component: SweatFloat, motion: { dy: -5, scale: 0.06, period: 3 } },
]);
