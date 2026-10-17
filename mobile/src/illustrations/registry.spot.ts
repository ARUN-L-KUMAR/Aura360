import type { SceneDef } from './types';

/**
 * Spot illustrations: square-ish artwork for empty states, errors, offline and onboarding. Add one entry per scene.
 * Owned by the spot-art work; hero scenes live in registry.heroes.ts.
 */
export const SPOT_SCENES = {} as const satisfies Record<string, SceneDef>;
