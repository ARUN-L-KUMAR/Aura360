/** The server's reminder settings (same shape as the web app's Settings > Notifications). */
export type ServerPrefs = {
  /** IANA timezone such as "Asia/Kolkata": reminder times follow this clock */
  timezone: string;
  email: boolean;
  push: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
  budget: { enabled: boolean };
  subscriptions: { enabled: boolean };
  workout: { enabled: boolean; time: string; days: number[]; onlyIfNotLogged: boolean };
  meals: { enabled: boolean; breakfast: string | null; lunch: string | null; dinner: string | null; onlyIfNotLogged: boolean };
  skincare: { enabled: boolean; morning: string | null; evening: string | null };
  fashion: { enabled: boolean; unwornDays: number; weekday: number; time: string };
};

export const DEFAULT_SERVER_PREFS: ServerPrefs = {
  timezone: 'Asia/Kolkata',
  email: false,
  push: true,
  quietHours: { enabled: true, start: '22:00', end: '07:00' },
  budget: { enabled: true },
  subscriptions: { enabled: true },
  workout: { enabled: false, time: '18:00', days: [1, 2, 3, 4, 5, 6], onlyIfNotLogged: true },
  meals: { enabled: false, breakfast: '08:30', lunch: '13:00', dinner: '20:00', onlyIfNotLogged: true },
  skincare: { enabled: false, morning: '07:30', evening: '21:30' },
  fashion: { enabled: true, unwornDays: 60, weekday: 0, time: '10:00' },
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  /** A web path such as /dashboard/finance?tab=budgets */
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export type InboxResponse = { notifications: AppNotification[]; unreadCount: number };

export type TestResult = {
  sent: boolean;
  email?: { ok: boolean; error?: string } | 'skipped';
  push?: { ok: boolean; devices: number; error?: string } | 'skipped';
};
