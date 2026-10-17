import { HERO_SCENES } from './registry.heroes';
import { SPOT_SCENES } from './registry.spot';
import type { SceneDef } from './types';

/** Every illustration the app can draw, by name. */
export const SCENES = { ...HERO_SCENES, ...SPOT_SCENES } as const satisfies Record<string, SceneDef>;

export type SceneName = keyof typeof SCENES;
