import { SampleHills, SampleSky } from './scenes/sample';
import type { SceneDef } from './types';

/**
 * Hero banner scenes (Home, Finance, Fitness, ...). Add one entry per scene; layers are stacked back to front.
 * Owned by the hero-art work; spot illustrations live in registry.spot.ts.
 */
export const HERO_SCENES = {
  // Convention example and pipeline check. Delete once the real scenes exist.
  sample: {
    aspect: 2,
    note: 'Convention example',
    layers: [
      { id: 'sky', Component: SampleSky, motion: { dy: 2, period: 9 } },
      { id: 'hills', Component: SampleHills, parallax: 0.1 },
    ],
  },
} as const satisfies Record<string, SceneDef>;
