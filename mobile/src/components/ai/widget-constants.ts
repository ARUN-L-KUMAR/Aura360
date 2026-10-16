import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { spacing, type ModuleKey } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------------------------------------------
// Floating bubble geometry
// ---------------------------------------------------------------------------------------------------------------

/** Diameter of the collapsed bubble. */
export const FAB_SIZE = 56;
/** Gap between the bubble and the screen edge it docks to. */
export const EDGE_MARGIN = spacing.md;
/**
 * Height of the bottom navigation bar WITHOUT the bottom safe-area inset. `AppTabs` is about 60pt tall (56pt
 * items + 4pt top padding); 72 leaves a 12pt buffer in case the bar grows (larger labels, glass bar). The bubble's lowest
 * resting position is `screenHeight - bottomInset - TAB_BAR_CONTENT_HEIGHT - FAB_SIZE - EDGE_MARGIN`.
 */
export const TAB_BAR_CONTENT_HEIGHT = 72;
/** `AppTabs` pads its bottom by `max(inset, 8..10)`; use the larger so devices without a home indicator still clear it. */
export const MIN_BOTTOM_INSET = 10;
/** Height of a screen's own top app bar, below the status bar. The bubble stays under it. */
export const APP_BAR_HEIGHT = 56;
/** Movement before a touch becomes a drag (below this it is a tap). */
export const DRAG_SLOP = 6;
/** Seconds of release velocity projected forward when choosing which edge to snap to. */
export const FLING_PROJECTION = 0.1;

/** The bubble tucks half-way off its edge after this long without a touch. */
export const PEEK_DELAY_MS = 4000;
/** How far (pt) the peeking bubble slides toward its edge. Leaves roughly a 44pt visible, tappable strip. */
export const PEEK_SHIFT = 20;
export const PEEK_SCALE = 0.85;
/** Opacity lost while peeking. */
export const PEEK_FADE = 0.25;

/** Halo "breathing" cue: a few slow pulses after the bubble appears, then still. */
export const PULSE_REPEATS = 3;
export const PULSE_DELAY_MS = 800;
export const PULSE_PEAK_OPACITY = 0.35;
export const PULSE_GROWTH = 0.4;

// ---------------------------------------------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------------------------------------------

export const SHEET_HEIGHT_RATIO = 0.75;
export const SHEET_MAX_HEIGHT = 640;
/** Drag the sheet down further than this (pt), or flick faster than the velocity, to dismiss it. */
export const DISMISS_DISTANCE = 120;
export const DISMISS_VELOCITY = 900;
/** Longest the composer grows before it scrolls. */
export const COMPOSER_MAX_HEIGHT = 120;

// ---------------------------------------------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------------------------------------------

export type WidgetTab = 'chat' | 'for_you' | 'drafts';

export const WIDGET_TABS: { key: WidgetTab; label: string }[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'for_you', label: 'For You' },
  { key: 'drafts', label: 'Drafts' },
];

export const MODULE_NAMES: Record<string, string> = {
  index: 'Dashboard',
  finance: 'Finance & Expenses',
  fashion: 'Fashion & Style',
  saved: 'Saved Items',
  fitness: 'Fitness & Workouts',
  food: 'Food & Nutrition',
  skincare: 'Skincare Routine',
  notes: 'Notes & Ideas',
  time: 'Time Tracker',
  ai: 'Ask Aura',
};

export type QuickPrompt = { label: string; prompt: string };

export const CONTEXT_PROMPTS: Record<string, QuickPrompt[]> = {
  fashion: [
    { label: 'What to wear?', prompt: 'What outfit combination can I wear today based on my active wardrobe?' },
    { label: 'Wardrobe audit', prompt: 'Review my wardrobe asset valuation and tell me which items are worn most.' },
    { label: 'Laundry status', prompt: 'Which clothing items are marked as needing a wash right now?' },
  ],
  finance: [
    { label: 'Spending breakdown', prompt: 'Review my recent transactions and tell me my total spending this month.' },
    { label: 'Budget check', prompt: 'Check all my active budgets and let me know if any are nearing limits.' },
    { label: 'Log ₹250 meal', prompt: 'Log an expense of ₹250 for lunch today under Food.' },
  ],
  fitness: [
    { label: 'Today’s workout', prompt: 'Suggest a balanced 30-minute training routine for today.' },
    { label: 'Activity streak', prompt: 'Check my recent workouts and summarize my active streak.' },
    { label: 'Log workout', prompt: 'Log a 45-minute strength training workout for today.' },
  ],
  food: [
    { label: 'Nutrition check', prompt: 'Review my meals logged today and estimate my calorie pacing.' },
    { label: 'Quick meal idea', prompt: 'Suggest a high-protein quick meal with under 500 calories.' },
    { label: 'Log food', prompt: 'Log breakfast: 2 boiled eggs and oatmeal.' },
  ],
  skincare: [
    { label: 'Routine sequence', prompt: 'Review my morning and evening skincare steps.' },
    { label: 'Product audit', prompt: 'Which skincare items do I currently own vs need to buy?' },
  ],
  saved: [
    { label: 'Search saved', prompt: 'What links and articles have I saved recently?' },
    { label: 'Favourites review', prompt: 'List all my favourited saved items.' },
  ],
  default: [
    { label: 'Day summary', prompt: 'Summarize my activity and logs across Aura360 for today.' },
    { label: 'Quick note', prompt: 'Create a note titled "Idea" with details to be filled later.' },
    { label: 'Log expense', prompt: 'Record a ₹150 expense for coffee.' },
  ],
};

export type ForYouItem = {
  id: string;
  title: string;
  desc: string;
  prompt: string;
  tag: string;
  icon: IconName;
  module: ModuleKey;
};

export const FOR_YOU_ITEMS: ForYouItem[] = [
  {
    id: 'fy-1',
    title: 'Style & Outfit Suggestion',
    desc: 'Get curated outfit ideas matching your wardrobe items',
    prompt: 'Check my wardrobe and suggest a stylish outfit combination for today.',
    tag: 'Fashion',
    icon: 'shirt-outline',
    module: 'fashion',
  },
  {
    id: 'fy-2',
    title: 'Weekly Expense Review',
    desc: 'Analyze where your money is going this month',
    prompt: 'Review my recent transactions and tell me where I am spending most.',
    tag: 'Finance',
    icon: 'wallet-outline',
    module: 'finance',
  },
  {
    id: 'fy-3',
    title: '30-Min Workout Plan',
    desc: 'Quick, balanced training based on your routine',
    prompt: 'Suggest a focused 30-minute workout routine for today.',
    tag: 'Fitness',
    icon: 'barbell-outline',
    module: 'fitness',
  },
  {
    id: 'fy-4',
    title: 'Daily Reflection Note',
    desc: 'Draft key highlights and priorities for today',
    prompt: 'Help me draft a concise daily recap note with today’s priorities.',
    tag: 'Productivity',
    icon: 'document-text-outline',
    module: 'notes',
  },
];
