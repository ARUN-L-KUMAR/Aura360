import { i18n } from '@/i18n';

export type AiRole = 'user' | 'model';

export type PendingAction = { tool: string; args: Record<string, unknown>; summary: string };
export type ActionStatus = 'pending' | 'confirmed' | 'cancelled';
export type ToolTrace = { tool: string; args: unknown };

export type AiMessage = {
  id: string;
  role: AiRole;
  content: string;
  createdAt: string;
  trace?: ToolTrace[];
  pendingAction?: PendingAction;
  actionStatus?: ActionStatus;
  /** The tool the assistant is running right now (shown as a small status line while streaming). */
  activeTool?: { tool: string; status: 'running' | 'completed'; label: string };
  isStreaming?: boolean;
  isError?: boolean;
};

export type AiThread = {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
};


/** A short, curated set of the server's chat models. The server decides which keys are configured. */
export const AI_MODELS: { id: string; name: string; note: string }[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', get note() { return i18n.t('ai:models.flash'); } },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', get note() { return i18n.t('ai:models.flashLatest'); } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', get note() { return i18n.t('ai:models.gpt4oMini'); } },
  { id: 'gpt-4o', name: 'GPT-4o', get note() { return i18n.t('ai:models.gpt4o'); } },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', get note() { return i18n.t('ai:models.qwen'); } },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', get note() { return i18n.t('ai:models.gptOss'); } },
];

export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

/** Chips on the empty Ask Aura screen. The label and the message that is sent both come from the `ai` catalog. */
export const SUGGESTED_PROMPTS = [
  { icon: 'wallet-outline', get label() { return i18n.t('ai:suggestions.spending.label'); }, get prompt() { return i18n.t('ai:suggestions.spending.prompt'); } },
  { icon: 'barbell-outline', get label() { return i18n.t('ai:suggestions.workout.label'); }, get prompt() { return i18n.t('ai:suggestions.workout.prompt'); } },
  { icon: 'restaurant-outline', get label() { return i18n.t('ai:suggestions.snacks.label'); }, get prompt() { return i18n.t('ai:suggestions.snacks.prompt'); } },
  { icon: 'sparkles-outline', get label() { return i18n.t('ai:suggestions.skincare.label'); }, get prompt() { return i18n.t('ai:suggestions.skincare.prompt'); } },
  { icon: 'time-outline', get label() { return i18n.t('ai:suggestions.tasks.label'); }, get prompt() { return i18n.t('ai:suggestions.tasks.prompt'); } },
  { icon: 'document-text-outline', get label() { return i18n.t('ai:suggestions.log.label'); }, get prompt() { return i18n.t('ai:suggestions.log.prompt'); } },
] as const;

const TOOL_KEYS = [
  'get_transactions',
  'get_budgets',
  'get_financial_goals',
  'get_balances',
  'get_fitness_logs',
  'get_food_logs',
  'get_notes',
  'get_wardrobe',
  'get_wishlist',
  'get_skincare_routine',
  'get_time_logs',
  'get_saved_items',
  'create_transaction',
  'create_budget',
  'log_workout',
  'log_meal',
  'create_note',
  'update_note',
  'add_fashion_item',
  'log_time_entry',
  'save_item',
] as const;
type ToolKey = (typeof TOOL_KEYS)[number];
const isToolKey = (tool: string): tool is ToolKey => (TOOL_KEYS as readonly string[]).includes(tool);

/** The status line for a tool the assistant is running ("Checking your budgets…") or has finished ("Checked your budgets"). */
export function toolLabel(tool: string, status: 'running' | 'completed') {
  const name = tool.replace(/_/g, ' ');
  if (!isToolKey(tool)) return status === 'running' ? i18n.t('ai:tools.fallbackRunning', { tool: name }) : i18n.t('ai:tools.fallbackCompleted', { tool: name });
  return status === 'running' ? i18n.t(`ai:tools.running.${tool}`) : i18n.t(`ai:tools.completed.${tool}`);
}
