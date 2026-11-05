import { useId } from 'react';
import { Circle, Defs, G, Path, Rect } from 'react-native-svg';

import type { SceneProps } from '../../types';
import { Canvas, Grad, Sneaker, Sparkle, ref, sparkles, spotScene, tones, type Tones } from './kit';

const TEE = 'M100 60 L84 66 L58 90 L72 104 L88 92 V144 Q88 150 94 150 H146 Q152 150 152 144 V92 L168 104 L182 90 L156 66 L140 60 Q130 74 120 74 Q110 74 100 60 Z';

/** One T-shirt on a hanger, centred on x = 120 (the caller moves and scales it). */
function Tee({ id, name, t, shade }: { id: string; name: string; t: Tones; shade: string }) {
  return (
    <G>
      {/* hanger */}
      <Path d="M120 54 V40 C120 22 142 22 142 34" fill="none" stroke={t.metalLo} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M80 70 L118 55 Q120 54 122 55 L160 70 Q164 72 160 72 H80 Q76 72 80 70 Z" fill={t.metalHi} stroke={t.metalLo} strokeWidth={1.6} strokeLinejoin="round" />
      {/* shirt */}
      <Path d={TEE} fill={ref(id, name)} />
      <Path d="M88 92 V144 Q88 150 94 150 H108 V86 Z" fill={shade} opacity={0.18} />
      <Path d="M100 60 Q110 74 120 74 Q130 74 140 60 Q130 66 120 66 Q110 66 100 60 Z" fill={shade} opacity={0.5} />
      <Path d="M58 90 L72 104" stroke={shade} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      <Path d="M182 90 L168 104" stroke={shade} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      <Path d="M88 142 H152" stroke={shade} strokeWidth={2} strokeDasharray="4 4" opacity={0.4} />
    </G>
  );
}

function WardrobeArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="main" from={t.hi} to={t.lo} />
        <Grad id={id} name="sky" from={t.sky} to={t.skyLo} />
        <Grad id={id} name="warm" from={t.warm} to={t.warmLo} />
        <Grad id={id} name="rod" from={t.metalHi} to={t.metalLo} />
      </Defs>
      <G opacity={0.95}>
        <G transform="translate(-31 24) scale(0.78)">
          <Tee id={id} name="warm" t={t} shade={t.warmLo} />
        </G>
        <G transform="translate(84 24) scale(0.78)">
          <Tee id={id} name="sky" t={t} shade={t.skyLo} />
        </G>
      </G>
      <Rect x={22} y={26} width={196} height={7} rx={3.5} fill={ref(id, 'rod')} />
      <Rect x={22} y={26} width={196} height={2.4} rx={1.2} fill={t.cardHi} opacity={0.6} />
      <Rect x={18} y={20} width={8} height={19} rx={3} fill={t.metalLo} />
      <Rect x={214} y={20} width={8} height={19} rx={3} fill={t.metalLo} />
      <Tee id={id} name="main" t={t} shade={t.deep} />
      {/* pocket */}
      <Path d="M126 96 H144 V112 Q144 116 140 116 H130 Q126 116 126 112 Z" fill={t.hi} opacity={0.55} />
    </Canvas>
  );
}

export const fashionWardrobe = spotScene('Shirts on a clothes rail', 2, [
  { id: 'art', Component: WardrobeArt },
  { id: 'float', Component: sparkles([[196, 80, 7], [46, 104, 5]]), motion: { scale: 0.2, period: 3, delay: 0.4 } },
]);

function OutfitsArt({ width, height, p }: SceneProps) {
  const id = useId();
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Defs>
        <Grad id={id} name="tile" from={t.cardHi} to={t.cardLo} />
        <Grad id={id} name="tee" from={t.hi} to={t.lo} />
        <Grad id={id} name="jeans" from={t.sky} to={t.skyLo} />
        <Grad id={id} name="shoe" from={t.warm} to={t.warmLo} />
        <Grad id={id} name="lens" from={t.dark} to={t.darkLo} />
      </Defs>
      <G transform="translate(120 92) rotate(-3)">
        <Rect x={-70} y={-62} width={140} height={122} rx={18} fill={t.shadow} opacity={t.d ? 0.5 : 0.22} transform="translate(3 6)" />
        <Rect x={-70} y={-62} width={140} height={122} rx={18} fill={ref(id, 'tile')} stroke={t.edge} strokeWidth={1.4} />
        <Rect x={-63} y={-55} width={126} height={108} rx={12} fill="none" stroke={t.line} strokeWidth={1.2} strokeDasharray="4 5" opacity={0.7} />
      </G>
      {/* tee, top left */}
      <G transform="translate(33 14) scale(0.54)">
        <Path d="M100 60 L84 66 L58 90 L72 104 L88 92 V144 Q88 150 94 150 H146 Q152 150 152 144 V92 L168 104 L182 90 L156 66 L140 60 Q130 74 120 74 Q110 74 100 60 Z" fill={ref(id, 'tee')} />
        <Path d="M100 60 Q110 74 120 74 Q130 74 140 60 Q130 66 120 66 Q110 66 100 60 Z" fill={t.deep} opacity={0.5} />
        <Path d="M88 92 V144 Q88 150 94 150 H108 V86 Z" fill={t.deep} opacity={0.18} />
      </G>
      {/* trousers, right */}
      <G transform="translate(-2 8)">
        <Path d="M134 34 H172 L177 100 H158 L153 62 L148 100 H129 Z" fill={ref(id, 'jeans')} />
        <Path d="M134 34 H172 V41 H134 Z" fill={t.skyLo} />
        <Path d="M153 41 V62" stroke={t.skyLo} strokeWidth={1.6} />
        <Path d="M129 100 H148 L149 94 H130 Z" fill={t.skyLo} opacity={0.5} />
        <Path d="M158 100 H177 L176 94 H157 Z" fill={t.skyLo} opacity={0.5} />
        <Circle cx={153} cy={47} r={2.2} fill={t.cardHi} />
      </G>
      {/* sneaker, bottom left */}
      <Sneaker t={t} x={64} y={106} s={0.76} body={t.warm} trim={t.warmLo} />
      {/* sunglasses, bottom right */}
      <G transform="translate(-2 6)">
        <Path d="M132 122 L128 118 M184 122 L188 118" stroke={t.dark} strokeWidth={3} strokeLinecap="round" />
        <Rect x={132} y={116} width={22} height={17} rx={8} fill={ref(id, 'lens')} />
        <Rect x={158} y={116} width={22} height={17} rx={8} fill={ref(id, 'lens')} />
        <Path d="M154 121 Q156 118 158 121" stroke={t.dark} strokeWidth={2.4} fill="none" />
        <Path d="M136 120 Q139 118 143 119" stroke={t.cardHi} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.7} />
        <Path d="M162 120 Q165 118 169 119" stroke={t.cardHi} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.7} />
      </G>
    </Canvas>
  );
}

function Heart({ width, height, p }: SceneProps) {
  const t = tones(p);
  return (
    <Canvas width={width} height={height}>
      <Path transform="translate(8 -6)" d="M202 36 c-5 -9 -19 -5 -16 6 c2 8 16 15 16 15 s14 -7 16 -15 c3 -11 -11 -15 -16 -6 Z" fill={t.rose} />
      <Sparkle x={44} y={58} r={6} fill={t.warm} />
    </Canvas>
  );
}

export const fashionOutfits = spotScene('Outfit flat-lay', 3, [
  { id: 'art', Component: OutfitsArt },
  { id: 'float', Component: Heart, motion: { dy: -5, scale: 0.08, period: 3.2 } },
]);
