import { i18n } from '@/i18n';
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

/** Stored values (the API keeps them in English). Show them with `timeCategoryLabel`, never raw. */
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

/** "45m", "2h", "1h 30m", worded by the catalog so other languages can reorder or rename the units. */
export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return i18n.t('time:duration.minutes', { minutes });
  return minutes === 0 ? i18n.t('time:duration.hours', { hours }) : i18n.t('time:duration.hoursMinutes', { hours, minutes });
}

/** The name to show for a stored category: translated when it is one of ours, as typed when it is custom. */
export function timeCategoryLabel(category: string) {
  switch (category) {
    case 'Work':
      return i18n.t('time:categories.work');
    case 'Study':
      return i18n.t('time:categories.study');
    case 'Personal':
      return i18n.t('time:categories.personal');
    case 'Exercise':
      return i18n.t('time:categories.exercise');
    case 'Social':
      return i18n.t('time:categories.social');
    case 'Rest':
      return i18n.t('time:categories.rest');
    case 'Other':
      return i18n.t('time:categories.other');
    case UNCATEGORISED:
      return i18n.t('time:categories.uncategorised');
    default:
      return category;
  }
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
