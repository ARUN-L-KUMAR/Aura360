/**
 * Which two modules the user pinned to the bottom bar (Home, the two pinned modules, the Log button and More fill the
 * rest). Pure logic, so it is unit-tested; the store that persists it is in `use-tab-slots.ts`.
 */
export const PINNABLE_MODULES = ['finance', 'fitness', 'food', 'fashion', 'saved', 'skincare', 'notes', 'time', 'ai'] as const;

export type PinnableModule = (typeof PINNABLE_MODULES)[number];
export type TabSlots = readonly [PinnableModule, PinnableModule];
export type SlotIndex = 0 | 1;

export const DEFAULT_SLOTS: TabSlots = ['finance', 'fashion'];

export function isPinnable(value: unknown): value is PinnableModule {
  return typeof value === 'string' && (PINNABLE_MODULES as readonly string[]).includes(value);
}

/** Reads a stored value back: anything that is not two different known modules falls back to the defaults. */
export function normalizeSlots(raw: unknown): TabSlots {
  if (!Array.isArray(raw) || raw.length !== 2) return DEFAULT_SLOTS;
  const [a, b] = raw as unknown[];
  if (!isPinnable(a) || !isPinnable(b) || a === b) return DEFAULT_SLOTS;
  return [a, b];
}

/**
 * Puts `module` in `index`. When it is already in the other slot the two swap, so the bar never shows one module twice
 * and never loses a slot.
 */
export function assignSlot(slots: TabSlots, index: SlotIndex, module: PinnableModule): TabSlots {
  if (slots[index] === module) return slots;
  const other: SlotIndex = index === 0 ? 1 : 0;
  if (slots[other] === module) return [slots[1], slots[0]];
  return index === 0 ? [module, slots[1]] : [slots[0], module];
}

/** The slot a module is pinned to, or -1 when it lives under More. */
export function slotOf(slots: TabSlots, module: string): -1 | SlotIndex {
  return slots[0] === module ? 0 : slots[1] === module ? 1 : -1;
}
