import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { i18n } from '@/i18n';
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
  { key: 'chat', get label() { return i18n.t('ai:widget.tabs.chat'); } },
  { key: 'for_you', get label() { return i18n.t('ai:widget.tabs.for_you'); } },
  { key: 'drafts', get label() { return i18n.t('ai:widget.tabs.drafts'); } },
];

export const MODULE_NAMES: Record<string, string> = {
  get index() { return i18n.t('ai:widget.modules.index'); },
  get finance() { return i18n.t('ai:widget.modules.finance'); },
  get fashion() { return i18n.t('ai:widget.modules.fashion'); },
  get saved() { return i18n.t('ai:widget.modules.saved'); },
  get fitness() { return i18n.t('ai:widget.modules.fitness'); },
  get food() { return i18n.t('ai:widget.modules.food'); },
  get skincare() { return i18n.t('ai:widget.modules.skincare'); },
  get notes() { return i18n.t('ai:widget.modules.notes'); },
  get time() { return i18n.t('ai:widget.modules.time'); },
  get ai() { return i18n.t('ai:widget.modules.ai'); },
};

export type QuickPrompt = { label: string; prompt: string };

export const CONTEXT_PROMPTS: Record<string, QuickPrompt[]> = {
  fashion: [
    { get label() { return i18n.t('ai:widget.context.fashion.outfit.label'); }, get prompt() { return i18n.t('ai:widget.context.fashion.outfit.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.fashion.audit.label'); }, get prompt() { return i18n.t('ai:widget.context.fashion.audit.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.fashion.laundry.label'); }, get prompt() { return i18n.t('ai:widget.context.fashion.laundry.prompt'); } },
  ],
  finance: [
    { get label() { return i18n.t('ai:widget.context.finance.spending.label'); }, get prompt() { return i18n.t('ai:widget.context.finance.spending.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.finance.budget.label'); }, get prompt() { return i18n.t('ai:widget.context.finance.budget.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.finance.logMeal.label'); }, get prompt() { return i18n.t('ai:widget.context.finance.logMeal.prompt'); } },
  ],
  fitness: [
    { get label() { return i18n.t('ai:widget.context.fitness.today.label'); }, get prompt() { return i18n.t('ai:widget.context.fitness.today.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.fitness.streak.label'); }, get prompt() { return i18n.t('ai:widget.context.fitness.streak.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.fitness.log.label'); }, get prompt() { return i18n.t('ai:widget.context.fitness.log.prompt'); } },
  ],
  food: [
    { get label() { return i18n.t('ai:widget.context.food.nutrition.label'); }, get prompt() { return i18n.t('ai:widget.context.food.nutrition.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.food.idea.label'); }, get prompt() { return i18n.t('ai:widget.context.food.idea.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.food.log.label'); }, get prompt() { return i18n.t('ai:widget.context.food.log.prompt'); } },
  ],
  skincare: [
    { get label() { return i18n.t('ai:widget.context.skincare.routine.label'); }, get prompt() { return i18n.t('ai:widget.context.skincare.routine.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.skincare.audit.label'); }, get prompt() { return i18n.t('ai:widget.context.skincare.audit.prompt'); } },
  ],
  saved: [
    { get label() { return i18n.t('ai:widget.context.saved.search.label'); }, get prompt() { return i18n.t('ai:widget.context.saved.search.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.saved.favourites.label'); }, get prompt() { return i18n.t('ai:widget.context.saved.favourites.prompt'); } },
  ],
  default: [
    { get label() { return i18n.t('ai:widget.context.default.summary.label'); }, get prompt() { return i18n.t('ai:widget.context.default.summary.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.default.note.label'); }, get prompt() { return i18n.t('ai:widget.context.default.note.prompt'); } },
    { get label() { return i18n.t('ai:widget.context.default.expense.label'); }, get prompt() { return i18n.t('ai:widget.context.default.expense.prompt'); } },
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
    get title() { return i18n.t('ai:widget.forYou.style.title'); },
    get desc() { return i18n.t('ai:widget.forYou.style.desc'); },
    get prompt() { return i18n.t('ai:widget.forYou.style.prompt'); },
    get tag() { return i18n.t('ai:widget.forYou.style.tag'); },
    icon: 'shirt-outline',
    module: 'fashion',
  },
  {
    id: 'fy-2',
    get title() { return i18n.t('ai:widget.forYou.expenses.title'); },
    get desc() { return i18n.t('ai:widget.forYou.expenses.desc'); },
    get prompt() { return i18n.t('ai:widget.forYou.expenses.prompt'); },
    get tag() { return i18n.t('ai:widget.forYou.expenses.tag'); },
    icon: 'wallet-outline',
    module: 'finance',
  },
  {
    id: 'fy-3',
    get title() { return i18n.t('ai:widget.forYou.workout.title'); },
    get desc() { return i18n.t('ai:widget.forYou.workout.desc'); },
    get prompt() { return i18n.t('ai:widget.forYou.workout.prompt'); },
    get tag() { return i18n.t('ai:widget.forYou.workout.tag'); },
    icon: 'barbell-outline',
    module: 'fitness',
  },
  {
    id: 'fy-4',
    get title() { return i18n.t('ai:widget.forYou.reflection.title'); },
    get desc() { return i18n.t('ai:widget.forYou.reflection.desc'); },
    get prompt() { return i18n.t('ai:widget.forYou.reflection.prompt'); },
    get tag() { return i18n.t('ai:widget.forYou.reflection.tag'); },
    icon: 'document-text-outline',
    module: 'notes',
  },
];
