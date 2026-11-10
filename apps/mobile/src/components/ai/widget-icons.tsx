import Svg, { Path, Rect } from 'react-native-svg';

/** The Aura assistant glyph. `color` is required: pass a theme token (e.g. `accent('ai').onSolid`). */
export function BotIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M12 8V4H8" />
      <Rect width={16} height={12} x={4} y={8} rx={2} />
      <Path d="M2 14h2" />
      <Path d="M20 14h2" />
      <Path d="M15 13v2" />
      <Path d="M9 13v2" />
    </Svg>
  );
}
