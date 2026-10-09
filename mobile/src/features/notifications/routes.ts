const SCREENS = new Set(['finance', 'fitness', 'food', 'fashion', 'skincare', 'time', 'notes', 'saved']);

/** A notification's web path ("/dashboard/finance?tab=budgets") -> the matching screen in this app ("/finance"). */
export function routeForActionUrl(actionUrl: string | null | undefined): string {
  const module = actionUrl?.match(/^\/dashboard\/([a-z]+)/)?.[1];
  return module && SCREENS.has(module) ? `/${module}` : '/';
}

/** "5m ago", "3h ago", "2d ago" */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
