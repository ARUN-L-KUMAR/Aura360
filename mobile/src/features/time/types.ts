import { categoryRamps, neutral, primary, secondary, tertiary } from '@/theme';

export type TimeLog = {
  id: string;
  date: string; // YYYY-MM-DD
  activity: string;
  category: string | null;
  duration: number; // minutes
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  productivityScore: number | null;
  createdAt: string;
};

/** What the API accepts. Optional fields must be omitted, never null (the server schema rejects null). */
export type TimeLogInput = {
  date: string;
  activity: string;
  category?: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  description?: string;
  productivityScore?: number;
};

export const TIME_CATEGORIES = ['Work', 'Study', 'Personal', 'Exercise', 'Social', 'Rest', 'Other'];

/** Static mid-tones from the theme ramps, one per category (used for chips, bars and tiles). */
export const CATEGORY_COLORS: Record<string, string> = {
  Work: primary[500],
  Study: secondary[500],
  Personal: tertiary[500],
  Exercise: categoryRamps.fitness[500],
  Social: categoryRamps.food[500],
  Rest: categoryRamps.skincare[500],
  Other: neutral[500],
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export const UNCATEGORISED = 'Uncategorised';

export function categoryColor(category: string | null | undefined) {
  return (category && CATEGORY_COLORS[category]) || categoryRamps.notes[500];
}

export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function totalMinutes(logs: TimeLog[]) {
  return logs.reduce((sum, log) => sum + (log.duration || 0), 0);
}

/** Minutes per category, biggest first. */
export function byCategory(logs: TimeLog[]) {
  const totals = new Map<string, number>();
  for (const log of logs) {
    const key = log.category?.trim() || UNCATEGORISED;
    totals.set(key, (totals.get(key) ?? 0) + (log.duration || 0));
  }
  return [...totals.entries()].map(([category, minutes]) => ({ category, minutes })).sort((a, b) => b.minutes - a.minutes);
}
