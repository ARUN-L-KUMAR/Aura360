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

export const CATEGORY_COLORS: Record<string, string> = {
  Work: '#6366f1',
  Study: '#0ea5e9',
  Personal: '#ec4899',
  Exercise: '#f97316',
  Social: '#eab308',
  Rest: '#14b8a6',
  Other: '#64748b',
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export const UNCATEGORISED = 'Uncategorised';

export function categoryColor(category: string | null | undefined) {
  return (category && CATEGORY_COLORS[category]) || '#8b5cf6';
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
