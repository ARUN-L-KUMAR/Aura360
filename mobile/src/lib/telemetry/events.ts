/**
 * Every analytics event the app can send, with its properties. Typed so a call site cannot invent an event or send
 * free text: properties are enums, booleans and counts only. NEVER put user content (note text, amounts, names,
 * emails, search terms) in an event. Add new events here first, then call `analytics.track(name, props)`.
 */
export type EventMap = {
  // App and navigation
  screen_view: { screen: string };
  app_error: { kind: 'network' | 'timeout' | 'server' | 'auth' | 'unknown'; where: string };
  // Auth and onboarding
  sign_in: { method: 'password' | 'google' };
  sign_up: { method: 'password' | 'google' };
  sign_out: Record<string, never>;
  session_expired: Record<string, never>;
  biometrics_toggled: { enabled: boolean };
  onboarding_completed: { skipped: boolean; step: number };
  permission_prompted: { permission: 'notifications' | 'biometrics' | 'photos' | 'camera'; granted: boolean };
  // Search
  search_performed: { results: number; filtered: boolean };
  search_result_opened: { section: string };
  // Settings
  theme_changed: { mode: 'system' | 'light' | 'dark' };
  notifications_toggled: { enabled: boolean };
  telemetry_consent_changed: { enabled: boolean };
  // Offline
  action_queued: { kind: string };
  sync_completed: { sent: number; failed: number };
  // Modules
  transaction_created: { type: 'income' | 'expense' };
  budget_saved: Record<string, never>;
  goal_saved: Record<string, never>;
  goal_contribution: { reached: boolean };
  workout_started: { source: 'manual' | 'coach' };
  workout_finished: Record<string, never>;
  fitness_entry_logged: Record<string, never>;
  meal_logged: { source: 'manual' | 'ai' };
  water_added: Record<string, never>;
  fashion_item_saved: { mode: 'create' | 'edit' };
  outfit_saved: Record<string, never>;
  skincare_routine_completed: { routine: 'morning' | 'evening' };
  time_logged: Record<string, never>;
  note_created: Record<string, never>;
  note_archived: Record<string, never>;
  note_deleted: Record<string, never>;
  link_saved: Record<string, never>;
  link_removed: Record<string, never>;
  ai_message_sent: { surface: 'tab' | 'widget' };
  ai_message_retried: Record<string, never>;
  ai_message_copied: Record<string, never>;
};

export type EventName = keyof EventMap;
