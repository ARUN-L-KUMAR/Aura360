import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { i18n, useTranslation } from '@/i18n';
import { moduleColors, type ModuleKey } from '@/theme';

export type { ModuleKey };
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ModuleInfo = {
  key: ModuleKey;
  /** Full name ("Saved Items"). From `common:modules.<key>.label`. */
  label: string;
  /** Compact name for tight spots such as the bottom tab bar ("Saved"). From `common:modules.<key>.short`. */
  short: string;
  icon: IconName;
  color: string;
  /** Route to open. Modules without a built screen yet go to the placeholder. */
  href: string;
  /** Short line shown on placeholder screens. From `common:modules.<key>.blurb`. */
  blurb: string;
  /** Description matching web dashboard. From `common:modules.<key>.description`. */
  description: string;
};

/**
 * The words of a module, read from the catalog at the moment they are used. `label`, `short`, `blurb` and
 * `description` are getters, so `modules.finance.label` keeps compiling and always returns the current language. In a
 * component that must re-render on a language change, call `useModules()` (it subscribes) instead of reading the const.
 */
function define(key: ModuleKey, icon: IconName, href: string): ModuleInfo {
  return {
    key,
    icon,
    href,
    color: moduleColors[key],
    get label() {
      return i18n.t(`common:modules.${key}.label`);
    },
    get short() {
      return i18n.t(`common:modules.${key}.short`);
    },
    get blurb() {
      return i18n.t(`common:modules.${key}.blurb`);
    },
    get description() {
      return i18n.t(`common:modules.${key}.description`);
    },
  };
}

export const modules: Record<ModuleKey, ModuleInfo> = {
  notes: define('notes', 'document-text-outline', '/notes'),
  finance: define('finance', 'wallet-outline', '/finance'),
  fitness: define('fitness', 'barbell-outline', '/fitness'),
  food: define('food', 'restaurant-outline', '/food'),
  saved: define('saved', 'bookmark-outline', '/saved'),
  fashion: define('fashion', 'shirt-outline', '/fashion'),
  skincare: define('skincare', 'sparkles-outline', '/skincare'),
  time: define('time', 'time-outline', '/time'),
  ai: define('ai', 'chatbubble-ellipses-outline', '/ai'),
};

/** `modules`, re-rendering the caller when the app language changes. */
export function useModules() {
  useTranslation('common');
  return modules;
}
