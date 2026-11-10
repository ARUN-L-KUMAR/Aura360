/**
 * What the Home dashboard shows, and in which order. Pure logic (no React, no path aliases), so it runs under plain Node
 * (tests/home-layout.test.ts); the store that keeps it on the phone is `use-home-layout.ts`.
 *
 * The model has two parts. `modules` is the ordered list of modules the person focuses on: Home draws one card for each,
 * in that order, and the shortcut tiles only cover them. `sections` switches the general blocks (the day score, "Up
 * next", the shortcut tiles, the activity chart) on and off.
 */

/** Modules that have something to show on Home. Ask Aura has no figures, so it is not on the list. */
export const HOME_MODULES = ['finance', 'fitness', 'food', 'time', 'notes', 'saved', 'skincare', 'fashion'] as const;
export type HomeModule = (typeof HOME_MODULES)[number];

export const HOME_SECTIONS = ['score', 'upNext', 'tiles', 'activity'] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export type HomeLayout = {
  /** Focused modules, in display order. */
  modules: HomeModule[];
  sections: Record<HomeSection, boolean>;
  /** False until the person has chosen something, so Home can offer the choice once. */
  customized: boolean;
};

/** Where the phone keeps the layout (AsyncStorage). */
export const HOME_LAYOUT_KEY = 'aura.home.layout.v1';

export const DEFAULT_LAYOUT: HomeLayout = {
  modules: [...HOME_MODULES],
  sections: { score: true, upNext: true, tiles: true, activity: true },
  customized: false,
};

/** One-tap starting points for the people who mostly use one corner of the app. */
export const HOME_PRESETS = [
  { id: 'moneyStyle', modules: ['finance', 'fashion'] },
  { id: 'notesCare', modules: ['notes', 'saved', 'skincare'] },
  { id: 'health', modules: ['food', 'fitness'] },
  { id: 'everything', modules: [...HOME_MODULES] },
] as const satisfies readonly { id: string; modules: readonly HomeModule[] }[];
export type HomePresetId = (typeof HOME_PRESETS)[number]['id'];

export function isHomeModule(value: unknown): value is HomeModule {
  return typeof value === 'string' && (HOME_MODULES as readonly string[]).includes(value);
}

/**
 * Reads a stored value back. Anything unusable falls back to the default; a module list keeps its order, drops unknown
 * and repeated names, and may be empty (someone can hide everything). A missing section switch counts as on.
 */
export function normalizeLayout(raw: unknown): HomeLayout {
  if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT;
  const value = raw as { modules?: unknown; sections?: unknown; customized?: unknown };
  const modules: HomeModule[] = [];
  if (Array.isArray(value.modules)) {
    for (const entry of value.modules) if (isHomeModule(entry) && !modules.includes(entry)) modules.push(entry);
  } else {
    return DEFAULT_LAYOUT;
  }
  const given = value.sections && typeof value.sections === 'object' ? (value.sections as Record<string, unknown>) : {};
  const sections = { ...DEFAULT_LAYOUT.sections };
  for (const section of HOME_SECTIONS) if (typeof given[section] === 'boolean') sections[section] = given[section] as boolean;
  return { modules, sections, customized: value.customized === true };
}

/** Adds a module at the end, or removes it when it is already shown. */
export function toggleModule(layout: HomeLayout, module: HomeModule): HomeLayout {
  const modules = layout.modules.includes(module) ? layout.modules.filter((m) => m !== module) : [...layout.modules, module];
  return { ...layout, modules, customized: true };
}

/** Moves a shown module one place up (-1) or down (1). At either end, or for a hidden module, nothing changes. */
export function moveModule(layout: HomeLayout, module: HomeModule, delta: -1 | 1): HomeLayout {
  const from = layout.modules.indexOf(module);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layout.modules.length) return layout;
  const modules = [...layout.modules];
  [modules[from], modules[to]] = [modules[to], modules[from]];
  return { ...layout, modules, customized: true };
}

export function setSection(layout: HomeLayout, section: HomeSection, on: boolean): HomeLayout {
  if (layout.sections[section] === on) return layout;
  return { ...layout, sections: { ...layout.sections, [section]: on }, customized: true };
}

export function applyPreset(layout: HomeLayout, id: HomePresetId): HomeLayout {
  const preset = HOME_PRESETS.find((p) => p.id === id);
  if (!preset) return layout;
  return { ...layout, modules: [...preset.modules], customized: true };
}

/** The preset whose modules are exactly the shown ones (order does not matter), or null for a custom mix. */
export function activePreset(layout: HomeLayout): HomePresetId | null {
  const shown = new Set(layout.modules);
  const match = HOME_PRESETS.find((p) => p.modules.length === shown.size && p.modules.every((m) => shown.has(m)));
  return match ? match.id : null;
}

/** Remembers that the person has seen the choice, without changing what Home shows ("keep everything"). */
export function markCustomized(layout: HomeLayout): HomeLayout {
  return layout.customized ? layout : { ...layout, customized: true };
}

/** The three goals the day score is made of, each present only when the module behind it is on Home. */
export type ScoreGoals = { calories: boolean; move: boolean; budget: boolean };

export function scoreGoals(layout: HomeLayout): ScoreGoals {
  return { calories: layout.modules.includes('food'), move: layout.modules.includes('fitness'), budget: layout.modules.includes('finance') };
}

/** The day score needs at least one goal; with Food, Fitness and Finance all off there is nothing to score. */
export function showsScore(layout: HomeLayout): boolean {
  const goals = scoreGoals(layout);
  return layout.sections.score && (goals.calories || goals.move || goals.budget);
}

/** Which suggestion in "Up next" belongs to which module, so a hidden module never suggests anything. */
export const SUGGESTION_MODULE = { logMeal: 'food', workout: 'fitness', startTimer: 'time', logSpending: 'finance' } as const;
export type Suggestion = keyof typeof SUGGESTION_MODULE;

/** The suggestions "Up next" may make: only those whose module is on Home. */
export function allowedSuggestions(layout: HomeLayout): Suggestion[] {
  return (Object.keys(SUGGESTION_MODULE) as Suggestion[]).filter((suggestion) => layout.modules.includes(SUGGESTION_MODULE[suggestion]));
}

/** One block of the Home page, in the order it is drawn. */
export type HomeBlock =
  | { kind: 'score' }
  /** The older hero, for a server that does not send the `today` block. */
  | { kind: 'hero' }
  | { kind: 'prompt' }
  | { kind: 'upNext'; allowed: Suggestion[] }
  /** The running timer, for a server without `today` (which cannot say what is next). */
  | { kind: 'timer' }
  | { kind: 'tiles' }
  | { kind: 'activity' }
  | { kind: 'finance' | 'food' | 'notes' | 'saved' | 'skincare' | 'fashion' }
  /** Focus and Workouts: two half-width cards that share one row. */
  | { kind: 'halves'; modules: ('time' | 'fitness')[] }
  /** Nothing would be drawn: Home shows an invitation to customize instead. */
  | { kind: 'empty' };

/**
 * What Home draws for a layout, top to bottom: the general sections that are on, then one block for each module in the
 * person's order. `hasToday` is whether the server sent the `today` block; without it the cards that need it are left
 * out and the older hero stands in for the day score. Focus and Workouts share a row at the place of the earlier one.
 */
export function homeBlocks(layout: HomeLayout, context: { hasToday: boolean; timerRunning: boolean }): HomeBlock[] {
  const { hasToday, timerRunning } = context;
  const blocks: HomeBlock[] = [];

  if (layout.sections.score) {
    if (!hasToday) blocks.push({ kind: 'hero' });
    else if (showsScore(layout)) blocks.push({ kind: 'score' });
  }
  if (!layout.customized) blocks.push({ kind: 'prompt' });
  if (layout.sections.upNext) {
    const allowed = allowedSuggestions(layout);
    if (hasToday && allowed.length > 0) blocks.push({ kind: 'upNext', allowed });
    else if (!hasToday && timerRunning && layout.modules.includes('time')) blocks.push({ kind: 'timer' });
  }
  if (layout.sections.tiles && layout.modules.length > 0) blocks.push({ kind: 'tiles' });
  if (layout.sections.activity) blocks.push({ kind: 'activity' });

  const halves = hasToday ? layout.modules.filter((m): m is 'time' | 'fitness' => m === 'time' || m === 'fitness') : [];
  let halvesDrawn = false;
  for (const module of layout.modules) {
    if (module === 'time' || module === 'fitness') {
      if (halves.length > 0 && !halvesDrawn) {
        halvesDrawn = true;
        blocks.push({ kind: 'halves', modules: halves });
      }
    } else if (module === 'food' || module === 'notes') {
      // Both read the `today` block.
      if (hasToday) blocks.push({ kind: module });
    } else {
      blocks.push({ kind: module });
    }
  }

  return blocks.length > 0 ? blocks : [{ kind: 'empty' }];
}
