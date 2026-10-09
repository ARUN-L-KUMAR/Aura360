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
  /** Description matching web dashboard */
  description: string;
};

export const modules: Record<ModuleKey, ModuleInfo> = {
  notes: { key: 'notes', label: 'Notes', icon: 'document-text-outline', color: '#0d9488', href: '/notes', blurb: 'Journal and quick notes.', description: 'Quick thoughts & ideas' },
  finance: { key: 'finance', label: 'Finance', icon: 'wallet-outline', color: '#2563eb', href: '/finance', blurb: 'Transactions, budgets, goals and subscriptions.', description: 'Track income & expenses' },
  fitness: { key: 'fitness', label: 'Fitness', icon: 'barbell-outline', color: '#9333ea', href: '/fitness', blurb: 'Workouts, live sessions and your AI coach.', description: 'Workouts & measurements' },
  food: { key: 'food', label: 'Food', icon: 'restaurant-outline', color: '#ea580c', href: '/food', blurb: 'Meals, macros and water tracking.', description: 'Meal tracking & nutrition' },
  saved: { key: 'saved', label: 'Saved Items', icon: 'bookmark-outline', color: '#db2777', href: '/saved', blurb: 'Links and items worth keeping.', description: 'Articles, videos & more' },
  fashion: { key: 'fashion', label: 'Fashion', icon: 'shirt-outline', color: '#4f46e5', href: '/fashion', blurb: 'Wardrobe, wishlist, outfits and your fit profile.', description: 'Wardrobe management' },
  skincare: { key: 'skincare', label: 'Skincare', icon: 'sparkles-outline', color: '#e11d48', href: '/skincare', blurb: 'Products and routines.', description: 'Routine & products' },
  time: { key: 'time', label: 'Time Logs', icon: 'time-outline', color: '#0891b2', href: '/time', blurb: 'Track where your hours go.', description: 'Activity tracking' },
  ai: { key: 'ai', label: 'Ask Aura', icon: 'chatbubble-ellipses-outline', color: moduleColors.ai, href: '/ai', blurb: 'Chat with your AI assistant about your data.', description: 'Ask Aura AI assistant' },
};
