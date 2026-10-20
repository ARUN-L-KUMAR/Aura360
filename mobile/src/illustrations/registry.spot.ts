import { aiChat, skincareProducts, timeLogs } from './scenes/spot/care-time-ai';
import { fashionOutfits, fashionWardrobe } from './scenes/spot/fashion';
import { financeBudgets, financeGoals, financeTransactions } from './scenes/spot/finance';
import { foodMeals, fitnessWorkouts } from './scenes/spot/food-fitness';
import { genericError, genericNoResults, genericOffline, genericSession } from './scenes/spot/generic';
import { onboardingAsk, onboardingEverything, onboardingOffline } from './scenes/spot/onboarding';
import { permissionsBiometrics, permissionsNotifications } from './scenes/spot/permissions';
import { notesEmpty, savedEmpty } from './scenes/spot/notes';
import type { SceneDef } from './types';

/**
 * Spot illustrations: square-ish artwork for empty states, errors, offline and onboarding. Add one entry per scene.
 * Owned by the spot-art work; hero scenes live in registry.heroes.ts.
 */
export const SPOT_SCENES = {
  'notes-empty': notesEmpty,
  'saved-empty': savedEmpty,
  'fashion-wardrobe': fashionWardrobe,
  'fashion-outfits': fashionOutfits,
  'finance-transactions': financeTransactions,
  'finance-budgets': financeBudgets,
  'finance-goals': financeGoals,
  'skincare-products': skincareProducts,
  'time-logs': timeLogs,
  'ai-chat': aiChat,
  'generic-noresults': genericNoResults,
  'generic-offline': genericOffline,
  'generic-error': genericError,
  'generic-session': genericSession,
  'onboarding-everything': onboardingEverything,
  'onboarding-ask': onboardingAsk,
  'onboarding-offline': onboardingOffline,
  'permissions-notifications': permissionsNotifications,
  'permissions-biometrics': permissionsBiometrics,
  'food-meals': foodMeals,
  'fitness-workouts': fitnessWorkouts,
} as const satisfies Record<string, SceneDef>;
