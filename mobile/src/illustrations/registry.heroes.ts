import { HOME_VARIANTS, HomeClouds, HomeForeground, HomeHills, HomeSky, HomeTokensA, HomeTokensB } from './scenes/hero/home';
import { FinanceBackdrop, FinanceChart, FinanceCoins, FinanceObjects, FinanceSparkles } from './scenes/hero/finance';
import { FitnessBackdrop, FitnessHeart, FitnessObjects, FitnessSparks, FitnessTrack } from './scenes/hero/fitness';
import { HERO_ASPECT } from './scenes/hero/shared';
import type { SceneDef } from './types';

/**
 * Hero banner scenes (Home, Finance, Fitness, ...). Add one entry per scene; layers are stacked back to front.
 * Parallax values are small and the frontmost layer never shifts, so scrolling cannot open a gap at the bottom.
 */
export const HERO_SCENES = {
  'home-hero': {
    aspect: HERO_ASPECT,
    variants: [...HOME_VARIANTS],
    note: 'Calm landscape that follows the time of day, with small floating module tokens',
    layers: [
      { id: 'sky', Component: HomeSky, parallax: 0.04, motion: { scale: 0.02, period: 9 } },
      { id: 'clouds', Component: HomeClouds, parallax: 0.07, motion: { dx: 12, period: 10 } },
      { id: 'hills', Component: HomeHills, parallax: 0.12 },
      { id: 'tokens-a', Component: HomeTokensA, motion: { dy: 4, dx: 1, period: 6, delay: 0.4 } },
      { id: 'tokens-b', Component: HomeTokensB, motion: { dy: 5, period: 7.5, delay: 1.8 } },
      { id: 'foreground', Component: HomeForeground },
    ],
  },
  'finance-hero': {
    aspect: HERO_ASPECT,
    note: 'Wallet, coin stacks and a rising chart ribbon on the finance accent',
    layers: [
      { id: 'backdrop', Component: FinanceBackdrop, parallax: 0.05, motion: { scale: 0.02, period: 9 } },
      { id: 'chart', Component: FinanceChart, parallax: 0.1, motion: { dy: -3, period: 8, delay: 0.6 } },
      { id: 'objects', Component: FinanceObjects },
      { id: 'coins', Component: FinanceCoins, motion: { dy: 6, dx: 1, period: 6, delay: 0.3 } },
      { id: 'sparkles', Component: FinanceSparkles, motion: { dy: 2, scale: 0.05, period: 4.5, delay: 1.2 } },
    ],
  },
  'fitness-hero': {
    aspect: HERO_ASPECT,
    note: 'Dumbbell, kettlebell, runner and a heart-pulse line on the fitness accent',
    layers: [
      { id: 'backdrop', Component: FitnessBackdrop, parallax: 0.05, motion: { scale: 0.03, period: 8 } },
      { id: 'track', Component: FitnessTrack, parallax: 0.1 },
      { id: 'objects', Component: FitnessObjects, motion: { dy: -2, period: 7, delay: 0.5 } },
      { id: 'heart', Component: FitnessHeart, motion: { scale: 0.045, period: 2.6 } },
      { id: 'sparks', Component: FitnessSparks, motion: { dy: 5, dx: 1, period: 6.5, delay: 1.4 } },
    ],
  },
} as const satisfies Record<string, SceneDef>;
