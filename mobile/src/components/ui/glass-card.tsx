import { Card, type CardProps } from '@/components/ui/card';
import { radius } from '@/theme';

export type GlassCardVariant = 'default' | 'glass' | 'elevated' | 'glow';

export interface GlassCardProps extends Omit<CardProps, 'variant' | 'tintColor' | 'padding'> {
  variant?: GlassCardVariant;
  /** Accent colour that tints the card's border and surface. */
  glowColor?: string;
  /** Optional border radius override. */
  rounded?: keyof typeof radius | number;
}

/**
 * @deprecated Use `Card` (variant `outlined` | `elevated` | `tinted`, with an `accent` module key).
 *
 * Kept so existing screens compile. It is no longer glass: blur is reserved for overlays (see `GlassSurface`), so this
 * now renders a solid token-based card, tinted by `glowColor` when given. `glass` and `default` map to `outlined`,
 * `elevated` and `glow` map to `elevated`.
 */
export function GlassCard({ variant = 'glass', glowColor, rounded = 'lg', ...rest }: GlassCardProps) {
  const cardVariant = variant === 'elevated' || variant === 'glow' ? 'elevated' : 'outlined';
  return <Card {...rest} variant={cardVariant} tintColor={glowColor} rounded={rounded} />;
}
