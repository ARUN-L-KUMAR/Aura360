import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { moduleColors } from '@/theme';

export type ModuleKey = keyof typeof moduleColors;
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ModuleInfo = {
  key: ModuleKey;
  label: string;
  icon: IconName;
  color: string;
  /** Route to open. Modules without a built screen yet go to the placeholder. */
  href: string;
  /** Short line shown on placeholder screens. */
  blurb: string;
};

export const modules: Record<ModuleKey, ModuleInfo> = {
  finance: { key: 'finance', label: 'Finance', icon: 'wallet-outline', color: moduleColors.finance, href: '/finance', blurb: 'Transactions, budgets, goals and subscriptions.' },
  fitness: { key: 'fitness', label: 'Fitness', icon: 'barbell-outline', color: moduleColors.fitness, href: '/fitness', blurb: 'Workouts, live sessions and your AI coach.' },
  food: { key: 'food', label: 'Food', icon: 'restaurant-outline', color: moduleColors.food, href: '/food', blurb: 'Meals, macros and water tracking.' },
  notes: { key: 'notes', label: 'Notes', icon: 'document-text-outline', color: moduleColors.notes, href: '/module/notes', blurb: 'Journal and quick notes.' },
  saved: { key: 'saved', label: 'Saved', icon: 'bookmark-outline', color: moduleColors.saved, href: '/module/saved', blurb: 'Links and items worth keeping.' },
  fashion: { key: 'fashion', label: 'Fashion', icon: 'shirt-outline', color: moduleColors.fashion, href: '/module/fashion', blurb: 'Wardrobe, wishlist, outfits and your fit profile.' },
  skincare: { key: 'skincare', label: 'Skincare', icon: 'sparkles-outline', color: moduleColors.skincare, href: '/module/skincare', blurb: 'Products and routines.' },
  time: { key: 'time', label: 'Time', icon: 'time-outline', color: moduleColors.time, href: '/module/time', blurb: 'Track where your hours go.' },
  ai: { key: 'ai', label: 'Ask Aura', icon: 'chatbubble-ellipses-outline', color: moduleColors.ai, href: '/module/ai', blurb: 'Chat with your AI assistant about your data.' },
};
