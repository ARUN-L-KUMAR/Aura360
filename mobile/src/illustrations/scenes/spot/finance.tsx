import { useId } from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, SoftShadow, Sparkle, ref, spotScene, tones, type Tones } from './kit';

/** A shiny coin centred on (x, y). */
function Coin({ id, t, x, y, r }: { id: string; t: Tones; x: number; y: number; r: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={t.warmLo} />
      <Circle cx={x} cy={y - r * 0.08} r={r * 0.94} fill={ref(id, 'coin')} />
      <Circle cx={x} cy={y - r * 0.08} r={r * 0.68} fill="none" stroke={t.warmLo} strokeWidth={r * 0.1} opacity={0.7} />
      <Path d={`M${x} ${y - r * 0.38} V${y + r * 0.26}`} stroke={t.warmLo} strokeWidth={r * 0.16} strokeLinecap="round" opacity={0.8} />
      <Path d={`M${x - r * 0.62} ${y - r * 0.5} Q${x - r * 0.4} ${y - r * 0.82} ${x} ${y - r * 0.84}`} stroke={t.warmHi} strokeWidth={r * 0.1} strokeLinecap="round" fill="none" opacity={0.9} />
    </G>
  );
}

function ReceiptPath(x: number, y: number, w: number, h: number, teeth: number) {
  const step = w / teeth;
  let d = `M${x} ${y + 6} Q${x} ${y} ${x + 6} ${y} H${x + w - 6} Q${x + w} ${y} ${x + w} ${y + 6} V${y + h}`;
  for (let i = 0; i < teeth; i++) {
    const x1 = x + w - i * step;
    d += ` L${x1 - step / 2} ${y + h - 6} L${x1 - step} ${y + h}`;
  }
  return `${d} Z`;
}

/** A leather wallet with cards, a paper receipt behind it and a coin. */
function TransactionsArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="paper" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="wallet" from={t.hi} to={t.lo} />
        <Grad id={id} name="card1" from={t.sky} to={t.skyLo} x2="1" y2="1" />
        <Grad id={id} name="card2" from={t.warm} to={t.warmLo} x2="1" y2="1" />
        <Grad id={id} name="coin" from={t.warmHi} to={t.warm} x2="1" y2="1" />
      </Defs>
      <SoftShadow cx={118} cy={153} rx={66} ry={6} color={t.shadow} o={t.shadowO} />
      {/* receipt */}
      <G transform="rotate(8 170 80)">
        <Path d={ReceiptPath(138, 26, 62, 112, 7)} fill={t.shadow} opacity={t.d ? 0.45 : 0.16} transform="translate(3 3)" />
        <Path d={ReceiptPath(138, 26, 62, 112, 7)} fill={ref(id, 'paper')} stroke={t.edge} strokeWidth={1} />
        <Circle cx={169} cy={44} r={7} fill={t.main} />
        <Path d="M165 44 l3 3 l5 -6" stroke={t.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Rect x={150} y={58} width={26} height={4} rx={2} fill={t.line} />
        <Rect x={184} y={58} width={8} height={4} rx={2} fill={t.mute} />
        <Rect x={150} y={68} width={20} height={4} rx={2} fill={t.line} />
        <Rect x={184} y={68} width={8} height={4} rx={2} fill={t.mute} />
        <Rect x={150} y={78} width={24} height={4} rx={2} fill={t.line} />
        <Rect x={184} y={78} width={8} height={4} rx={2} fill={t.mute} />
        <Path d="M148 92 H190" stroke={t.line} strokeWidth={1.4} strokeDasharray="3 3" />
        <Rect x={150} y={100} width={14} height={5} rx={2.5} fill={t.main} />
        <Rect x={176} y={100} width={16} height={5} rx={2.5} fill={t.main} />
      </G>
      {/* cards peeking out of the wallet */}
      <G transform="rotate(-9 90 70)">
        <Rect x={60} y={50} width={62} height={40} rx={7} fill={ref(id, 'card2')} />
        <Rect x={60} y={58} width={62} height={7} fill={t.warmLo} opacity={0.45} />
        <Rect x={68} y={74} width={16} height={5} rx={2.5} fill={t.warmHi} opacity={0.8} />
      </G>
      <G transform="rotate(5 100 70)">
        <Rect x={72} y={56} width={62} height={40} rx={7} fill={ref(id, 'card1')} />
        <Circle cx={118} cy={80} r={6} fill={t.cardHi} opacity={0.5} />
        <Circle cx={124} cy={80} r={6} fill={t.cardHi} opacity={0.35} />
      </G>
      {/* wallet */}
      <Rect x={44} y={82} width={122} height={66} rx={15} fill={ref(id, 'wallet')} />
      
      <Rect x={54} y={82} width={102} height={5} rx={2.5} fill={t.hi} opacity={0.6} />
      <Rect x={52} y={90} width={106} height={50} rx={10} fill="none" stroke={t.cardHi} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.55} />
      <Path d="M150 98 H172 a10 10 0 0 1 10 10 V116 a10 10 0 0 1 -10 10 H150 a10 10 0 0 1 -10 -10 V108 a10 10 0 0 1 10 -10 Z" fill={t.deep} />
      <Circle cx={156} cy={112} r={5.4} fill={t.warm} />
      <Circle cx={154.6} cy={110.6} r={1.6} fill={t.warmHi} />
    </Canvas>
  );
}

function CoinFloat({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="coin" from={t.warmHi} to={t.warm} x2="1" y2="1" />
      </Defs>
      <Coin id={id} t={t} x={52} y={50} r={13} />
      <Sparkle x={202} y={50} r={7} fill={t.hi} />
      <Sparkle x={190} y={72} r={3.5} fill={t.warm} />
    </Canvas>
  );
}

export const financeTransactions = spotScene('Wallet, receipt and coin', 0, [
  { id: 'art', Component: TransactionsArt },
  { id: 'float', Component: CoinFloat, motion: { dy: -6, scale: 0.04, period: 3.4 } },
]);

/** A donut chart on a dashboard disc, with coins. */
function BudgetsArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  const R = 38;
  const C = 2 * Math.PI * R;
  const slices: [number, string][] = [
    [0.42, t.main],
    [0.26, t.warm],
    [0.17, t.sky],
    [0.15, t.rose],
  ];
  let at = 0;
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="disc" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="core" from={t.hi} to={t.lo} />
        <Grad id={id} name="coin" from={t.warmHi} to={t.warm} x2="1" y2="1" />
      </Defs>
      <SoftShadow cx={118} cy={153} rx={62} ry={6} color={t.shadow} o={t.shadowO} />
      <Circle cx={123} cy={96} r={56} fill={t.shadow} opacity={t.d ? 0.5 : 0.2} />
      <Circle cx={120} cy={90} r={56} fill={ref(id, 'disc')} stroke={t.edge} strokeWidth={1.4} />
      <G transform="rotate(-90 120 90)">
        <Circle cx={120} cy={90} r={R} fill="none" stroke={t.mute} strokeWidth={20} opacity={0.5} />
        {slices.map(([share, color]) => {
          const len = share * C;
          const start = at;
          at += len;
          return (
            <Circle
              key={color}
              cx={120}
              cy={90}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={20}
              strokeDasharray={`${len - 4} ${C - len + 4}`}
              strokeDashoffset={-(start + 2)}
            />
          );
        })}
      </G>
      <Circle cx={120} cy={90} r={22} fill={ref(id, 'core')} />
      <Rect x={108} y={92} width={6} height={10} rx={2} fill={t.white} opacity={0.95} />
      <Rect x={117} y={84} width={6} height={18} rx={2} fill={t.white} opacity={0.95} />
      <Rect x={126} y={76} width={6} height={26} rx={2} fill={t.white} opacity={0.95} />
      {/* coin stack */}
      <G>
        <Ellipse cx={188} cy={140} rx={18} ry={5.5} fill={t.warmLo} />
        <Rect x={170} y={130} width={36} height={10} fill={t.warmLo} />
        <Ellipse cx={188} cy={130} rx={18} ry={5.5} fill={t.warm} />
        <Ellipse cx={188} cy={124} rx={18} ry={5.5} fill={t.warmLo} />
        <Rect x={170} y={118} width={36} height={6} fill={t.warmLo} />
        <Ellipse cx={188} cy={118} rx={18} ry={5.5} fill={ref(id, 'coin')} />
        <Ellipse cx={188} cy={118} rx={11} ry={3} fill="none" stroke={t.warmLo} strokeWidth={1.4} opacity={0.6} />
      </G>
    </Canvas>
  );
}

function BudgetFloat({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="coin" from={t.warmHi} to={t.warm} x2="1" y2="1" />
      </Defs>
      <Coin id={id} t={t} x={196} y={52} r={12} />
      <Sparkle x={46} y={56} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const financeBudgets = spotScene('Donut chart and coins', 1, [
  { id: 'art', Component: BudgetsArt },
  { id: 'float', Component: BudgetFloat, motion: { dy: -6, scale: 0.04, period: 3.6 } },
]);

/** A flag planted on a mountain peak, with a dotted trail up. */
function GoalsArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="far" from={t.soft} to={t.softer} />
        <Grad id={id} name="near" from={t.hi} to={t.lo} />
        <Grad id={id} name="flag" from={t.warm} to={t.warmLo} x2="1" y2="0" />
        <Grad id={id} name="snow" from={t.snow} to={t.metalHi} />
      </Defs>
      <SoftShadow cx={120} cy={153} rx={78} ry={6} color={t.shadow} o={t.shadowO} />
      <Ellipse cx={116} cy={152} rx={84} ry={6} fill={t.deep} opacity={0.3} />
      {/* far peak */}
      <Path d="M122 152 L178 84 Q182 80 186 84 L222 152 Z" fill={ref(id, 'far')} />
      <Path d="M178 84 Q182 80 186 84 L194 98 L184 94 L178 102 L170 96 Z" fill={t.snow} opacity={0.8} />
      {/* main peak */}
      <Path d="M40 152 L106 54 Q112 46 118 54 L184 152 Z" fill={ref(id, 'near')} />
      <Path d="M118 54 L184 152 H140 L124 112 L134 86 Z" fill={t.deep} opacity={0.3} />
      <Path d="M106 54 Q112 46 118 54 L128 70 L120 66 L112 78 L103 67 L97 71 Z" fill={ref(id, 'snow')} />
      {/* trail */}
      <Path d="M70 150 C100 144 66 128 94 118 C118 110 92 96 108 80" fill="none" stroke={t.snow} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 7" />
      <Circle cx={70} cy={150} r={4} fill={t.snow} />
      {/* trees */}
      <G>
        <Path d="M174 152 L184 126 L194 152 Z" fill={t.goodLo} />
        <Path d="M180 152 L192 118 L204 152 Z" fill={t.good} />
        <Rect x={190} y={150} width={4} height={5} fill={t.warmLo} />
      </G>
      {/* flag */}
      <Rect x={111} y={22} width={2.6} height={32} rx={1.3} fill={t.metalLo} />
      <Path d="M113.6 22 C124 17 130 27 142 22 V38 C130 43 124 33 113.6 38 Z" fill={ref(id, 'flag')} />
      <Circle cx={112.3} cy={21} r={2.6} fill={t.warmHi} />
    </Canvas>
  );
}

function CloudFloat({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <G opacity={0.95}>
        <Ellipse cx={52} cy={56} rx={18} ry={6.5} fill={t.snow} />
        <Circle cx={46} cy={51} r={7} fill={t.snow} />
        <Circle cx={58} cy={49} r={9} fill={t.snow} />
      </G>
      <Sparkle x={162} y={30} r={7} fill={t.warm} />
    </Canvas>
  );
}

export const financeGoals = spotScene('Flag on a peak', 2, [
  { id: 'art', Component: GoalsArt },
  { id: 'float', Component: CloudFloat, motion: { dx: 8, scale: 0.03, period: 7 } },
]);
