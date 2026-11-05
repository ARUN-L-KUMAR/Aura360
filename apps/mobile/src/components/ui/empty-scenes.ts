import type { SceneName } from '@/illustrations/registry';
import type { ModuleKey } from '@/theme';

/**
 * Which illustration an empty state shows when the caller does not pick one. Keyed by the Ionicons name the screen
 * already passes as `icon`, so every existing empty state gains artwork without touching the screen.
 */
export const ICON_SCENES: Readonly<Record<string, SceneName>> = {
  // fashion
  'shirt-outline': 'fashion-wardrobe',
  shirt: 'fashion-wardrobe',
  'color-palette-outline': 'fashion-outfits',
  'calendar-outline': 'fashion-outfits',
  'glasses-outline': 'fashion-outfits',
  // food
  'restaurant-outline': 'food-meals',
  'nutrition-outline': 'food-meals',
  'fast-food-outline': 'food-meals',
  'cafe-outline': 'food-meals',
  // fitness
  'barbell-outline': 'fitness-workouts',
  'stats-chart-outline': 'fitness-workouts',
  'walk-outline': 'fitness-workouts',
  'fitness-outline': 'fitness-workouts',
  'body-outline': 'fitness-workouts',
  // finance
  'wallet-outline': 'finance-transactions',
  'receipt-outline': 'finance-transactions',
  'pulse-outline': 'finance-transactions',
  'cash-outline': 'finance-transactions',
  'card-outline': 'finance-transactions',
  'pie-chart-outline': 'finance-budgets',
  'flag-outline': 'finance-goals',
  'trophy-outline': 'finance-goals',
  // notes and saved
  'document-text-outline': 'notes-empty',
  'create-outline': 'notes-empty',
  'journal-outline': 'notes-empty',
  'bookmark-outline': 'saved-empty',
  'bookmarks-outline': 'saved-empty',
  'heart-outline': 'saved-empty',
  'link-outline': 'saved-empty',
  // skincare
  'sparkles-outline': 'skincare-products',
  'water-outline': 'skincare-products',
  'sunny-outline': 'skincare-products',
  'moon-outline': 'skincare-products',
  'flask-outline': 'skincare-products',
  'leaf-outline': 'skincare-products',
  // time
  'time-outline': 'time-logs',
  'timer-outline': 'time-logs',
  'stopwatch-outline': 'time-logs',
  'hourglass-outline': 'time-logs',
  // assistant
  sparkles: 'ai-chat',
  'chatbubble-ellipses-outline': 'ai-chat',
  'chatbubbles-outline': 'ai-chat',
  'chatbubble-outline': 'ai-chat',
  // generic
  'search-outline': 'generic-noresults',
  'cloud-offline-outline': 'generic-offline',
  'lock-closed-outline': 'generic-session',
  'alert-circle-outline': 'generic-error',
  'warning-outline': 'generic-error',
  'construct-outline': 'generic-error',
};

/** Variants that have a scene of their own; they win over the icon. */
const VARIANT_SCENES: Readonly<Record<string, SceneName>> = {
  noResults: 'generic-noresults',
  offline: 'generic-offline',
};

/** The scene for an empty state: the variant's own, else the one for its icon, else none (the icon tile is used). */
export function sceneForEmptyState(variant: string | undefined, icon: string | undefined): SceneName | undefined {
  const byVariant = variant ? VARIANT_SCENES[variant] : undefined;
  if (byVariant) return byVariant;
  return icon ? ICON_SCENES[icon] : undefined;
}

const MODULE_KEYS: readonly string[] = ['finance', 'fitness', 'food', 'fashion', 'skincare', 'notes', 'saved', 'time', 'ai'];

/** The module accent a scene is named after (`finance-budgets` -> `finance`); generic scenes use the brand accent. */
export function accentForScene(scene: SceneName): ModuleKey {
  const prefix = scene.split('-')[0];
  return MODULE_KEYS.includes(prefix) ? (prefix as ModuleKey) : 'ai';
}
