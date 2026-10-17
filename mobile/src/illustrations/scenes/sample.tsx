import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { SceneProps } from '../types';

/**
 * SAMPLE scene: the conventions every illustration follows.
 *  - pure: imports only react, react-native-svg and local types; all colours come from `p` (the ScenePalette)
 *  - one <Svg> per layer, filling `width` x `height` through a viewBox, so the art scales to any size
 *  - gradient ids made with useId() so several scenes can share a screen
 *  - layers are separate components (sky, hills, ...) so the app can drift or parallax them independently
 *  - no text, no fixed pixel positions outside the viewBox, no animation here (the app wrapper animates layers)
 */
const VIEW_W = 400;
const VIEW_H = 200;

export function SampleSky({ width, height, p }: SceneProps) {
  const id = useId();
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.skyTop} />
          <Stop offset="0.6" stopColor={p.skyMid} />
          <Stop offset="1" stopColor={p.skyBottom} />
        </LinearGradient>
      </Defs>
      <Rect width={VIEW_W} height={VIEW_H} fill={`url(#${id}-sky)`} />
      <Circle cx="300" cy="62" r="46" fill={p.glow} opacity={0.35} />
      <Circle cx="300" cy="62" r="26" fill={p.warm[300]} />
    </Svg>
  );
}

export function SampleHills({ width, height, p }: SceneProps) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
      <Path d={`M0 140 C80 100 160 120 230 112 C300 104 350 120 ${VIEW_W} 108 L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`} fill={p.groundFar} />
      <Path d={`M0 164 C70 132 150 150 220 142 C290 134 340 150 ${VIEW_W} 140 L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`} fill={p.groundMid} />
      <Ellipse cx="96" cy="176" rx="64" ry="8" fill={p.shadow} opacity={0.4} />
      <Path d={`M0 184 C90 170 170 182 250 176 C320 170 360 178 ${VIEW_W} 174 L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`} fill={p.groundNear} />
    </Svg>
  );
}
