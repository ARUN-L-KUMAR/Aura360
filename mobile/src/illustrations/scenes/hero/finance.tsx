import { useId } from 'react';
import { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { ScenePalette } from '../../palette';
import type { SceneProps } from '../../types';
import { Coin, Frame, Grad, Sparkle, VIEW_H, VIEW_W, sparklePath } from './shared';

function backdropColors(p: ScenePalette) {
  const d = p.isDark;
  return {
    from: d ? p.accent[800] : p.accent[300],
    to: d ? p.accent[900] : p.accent[500],
    blob: d ? p.accent[700] : p.accent[200],
    bar: d ? p.accent[600] : p.paper,
    line: d ? p.accent[600] : p.paper,
  };
}

const BAR_HEIGHTS = [26, 38, 34, 54, 62, 78, 96, 118];

/** Back layer: clean accent gradient, soft blobs, a faint grid and rising bars. */
export function FinanceBackdrop({ width, height, p }: SceneProps) {
  const id = useId();
  const c = backdropColors(p);
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-bg`} from={c.from} to={c.to} diagonal />
        <Grad id={`${id}-bar`} from={c.bar} to={c.bar} fromOpacity={p.isDark ? 0.5 : 0.7} toOpacity={0.08} />
      </Defs>
      <Rect width={VIEW_W} height={VIEW_H} fill={`url(#${id}-bg)`} />
      <Circle cx={356} cy={34} r={96} fill={c.blob} opacity={p.isDark ? 0.28 : 0.6} />
      <Circle cx={30} cy={170} r={80} fill={c.blob} opacity={p.isDark ? 0.22 : 0.45} />
      {[48, 90, 132].map((y) => (
        <Path key={y} d={`M0 ${y} H${VIEW_W}`} stroke={c.line} strokeWidth={0.8} strokeDasharray="2 6" strokeLinecap="round" opacity={p.isDark ? 0.4 : 0.7} />
      ))}
      {BAR_HEIGHTS.map((h, i) => (
        <Rect key={i} x={118 + i * 36} y={178 - h} width={24} height={h + 40} rx={8} fill={`url(#${id}-bar)`} />
      ))}
    </Frame>
  );
}

/** The rising chart ribbon with its area fill, nodes and arrow head. */
export function FinanceChart({ width, height, p }: SceneProps) {
  const id = useId();
  const d = p.isDark;
  const line = d ? p.accent[200] : p.paper;
  const ribbon = 'M-6 150 C30 146 52 128 86 126 C120 124 138 142 172 114 C204 88 224 96 254 80 C290 62 320 62 356 38 C368 30 380 26 392 22';
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-area`} from={line} to={line} fromOpacity={d ? 0.28 : 0.55} toOpacity={0} />
      </Defs>
      <Path d={`${ribbon} L392 200 L-6 200 Z`} fill={`url(#${id}-area)`} />
      <Path d={ribbon} fill="none" stroke={p.shadow} strokeWidth={9} strokeLinecap="round" opacity={0.18} transform="translate(0 3)" />
      <Path d={ribbon} fill="none" stroke={line} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      {[
        [86, 126],
        [172, 114],
        [254, 80],
        [320, 59],
      ].map(([x, y]) => (
        <G key={x}>
          <Circle cx={x} cy={y} r={7.5} fill={line} />
          <Circle cx={x} cy={y} r={3.6} fill={d ? p.accent[700] : p.accent[500]} />
        </G>
      ))}
      <G transform="translate(390 23) rotate(-24)">
        <Path d="M-12 -11 L12 0 L-12 11 L-6 0 Z" fill={p.warm[300]} stroke={p.warm[300]} strokeWidth={4} strokeLinejoin="round" />
        <Path d="M-8 -6 L6 0 L-8 0 Z" fill={p.warm[100]} opacity={0.6} />
      </G>
    </Frame>
  );
}

type StackProps = { cx: number; baseY: number; coins: number; rx: number; p: ScenePalette };

/** A stack of gold coins seen slightly from above. */
function CoinStack({ cx, baseY, coins, rx, p }: StackProps) {
  const ry = rx * 0.36;
  const step = 7;
  const items = Array.from({ length: coins }, (_, i) => baseY - i * step);
  const topY = baseY - (coins - 1) * step - step;
  return (
    <G>
      {items.map((y) => (
        <G key={y}>
          <Ellipse cx={cx} cy={y} rx={rx} ry={ry} fill={p.warm[600]} />
          <Rect x={cx - rx} y={y - step} width={rx * 2} height={step} fill={p.warm[500]} />
          <Path d={`M${cx - rx} ${y - step * 0.45} Q${cx} ${y - step * 0.45 + ry * 1.6} ${cx + rx} ${y - step * 0.45}`} fill="none" stroke={p.warm[600]} strokeWidth={0.9} opacity={0.6} />
          <Ellipse cx={cx} cy={y - step} rx={rx} ry={ry} fill={p.warm[400]} />
        </G>
      ))}
      <Ellipse cx={cx} cy={topY} rx={rx} ry={ry} fill={p.warm[300]} />
      <Ellipse cx={cx} cy={topY} rx={rx * 0.68} ry={ry * 0.68} fill="none" stroke={p.warm[500]} strokeWidth={1.4} opacity={0.65} />
      <Path d={sparklePath(cx, topY, rx * 0.34)} fill={p.warm[100]} opacity={0.95} />
      <Path d={`M${cx - rx * 0.78} ${topY - ry * 0.1} Q${cx - rx * 0.5} ${topY - ry * 0.95} ${cx - rx * 0.05} ${topY - ry * 0.92}`} fill="none" stroke={p.warm[50]} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </G>
  );
}

/** Mid layer: the floor, a wallet with a card, and three rising coin stacks. */
export function FinanceObjects({ width, height, p }: SceneProps) {
  const id = useId();
  const d = p.isDark;
  const body = d ? p.brand[500] : p.brand[600];
  const flap = d ? p.brand[400] : p.brand[500];
  const bodyDeep = d ? p.brand[700] : p.brand[700];
  return (
    <Frame width={width} height={height}>
      <Defs>
        <Grad id={`${id}-wallet`} from={flap} to={body} />
        <Grad id={`${id}-card`} from={p.paper} to={d ? p.neutral[400] : p.neutral[200]} diagonal />
      </Defs>
      <Ellipse cx={210} cy={182} rx={200} ry={14} fill={d ? p.neutral[950] : p.accent[600]} opacity={d ? 0.55 : 0.28} />
      <Ellipse cx={210} cy={181} rx={170} ry={10} fill={d ? p.accent[800] : p.accent[200]} opacity={d ? 0.35 : 0.4} />

      <G transform="translate(66 0)">
        <G transform="translate(18 -6) rotate(16 110 150)">
          <Rect x={72} y={112} width={92} height={58} rx={9} fill={d ? p.rose[400] : p.rose[300]} />
          <Circle cx={146} cy={130} r={7} fill={p.rose[100]} opacity={0.8} />
          <Circle cx={138} cy={130} r={7} fill={p.warm[200]} opacity={0.8} />
        </G>
        <G transform="rotate(-12 110 150)">
          <Rect x={70} y={108} width={92} height={58} rx={9} fill={`url(#${id}-card)`} />
          <Rect x={70} y={118} width={92} height={10} fill={p.accent[500]} opacity={0.9} />
          <Rect x={80} y={136} width={22} height={16} rx={3.5} fill={p.warm[300]} />
          <Rect x={80} y={136} width={22} height={16} rx={3.5} fill="none" stroke={p.warm[500]} strokeWidth={1} />
          <Rect x={110} y={140} width={34} height={4} rx={2} fill={p.neutral[300]} />
          <Rect x={110} y={148} width={22} height={4} rx={2} fill={p.neutral[300]} />
        </G>
        <Rect x={44} y={134} width={128} height={46} rx={14} fill={bodyDeep} opacity={0.5} transform="translate(0 4)" />
        <Rect x={44} y={128} width={128} height={46} rx={14} fill={`url(#${id}-wallet)`} />
        <Path d="M50 142 H166" stroke={p.brand[300]} strokeWidth={1.2} strokeLinecap="round" strokeDasharray="3 4" opacity={0.7} />
        <Rect x={136} y={140} width={46} height={26} rx={11} fill={bodyDeep} />
        <Circle cx={152} cy={153} r={5.4} fill={p.warm[300]} />
        <Circle cx={152} cy={153} r={2} fill={p.warm[500]} />
        <Rect x={50} y={133} width={50} height={5} rx={2.5} fill={p.brand[300]} opacity={0.6} />
      </G>

      <CoinStack cx={278} baseY={178} coins={3} rx={21} p={p} />
      <CoinStack cx={324} baseY={178} coins={5} rx={21} p={p} />
      <CoinStack cx={370} baseY={178} coins={7} rx={21} p={p} />
    </Frame>
  );
}

/** Floating coins. */
export function FinanceCoins({ width, height, p }: SceneProps) {
  return (
    <Frame width={width} height={height}>
      <Ellipse cx={226} cy={64} rx={13} ry={3} fill={p.shadow} opacity={0.18} transform="translate(0 20)" />
      <Coin cx={226} cy={56} r={14} p={p} />
      <Coin cx={42} cy={64} r={10} p={p} />
      <Coin cx={380} cy={104} r={12} p={p} />
    </Frame>
  );
}

/** Twinkling sparkles. */
export function FinanceSparkles({ width, height, p }: SceneProps) {
  const c = p.isDark ? p.accent[200] : p.warm[400];
  const gold = p.isDark ? p.warm[200] : p.warm[500];
  return (
    <Frame width={width} height={height}>
      <Sparkle cx={286} cy={30} r={9} fill={c} />
      <Sparkle cx={150} cy={44} r={6} fill={c} opacity={0.85} />
      <Sparkle cx={344} cy={88} r={5} fill={gold} />
      <Sparkle cx={22} cy={104} r={7} fill={c} opacity={0.9} />
      <Sparkle cx={196} cy={22} r={4} fill={gold} />
      <Circle cx={96} cy={30} r={2} fill={c} opacity={0.8} />
      <Circle cx={404} cy={64} r={2.4} fill={c} opacity={0.8} />
    </Frame>
  );
}
