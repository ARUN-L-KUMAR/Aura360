import type { SceneDef } from './types';

/**
 * Wide hero banner scenes. None are in use: the screens use the web-style PremiumHero card. The registry stays so a
 * wide illustrated banner can be added again (see registry.spot.ts for the scene format).
 */
export const HERO_SCENES = {} as const satisfies Record<string, SceneDef>;
