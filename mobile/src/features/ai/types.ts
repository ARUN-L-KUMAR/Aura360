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
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', note: 'Default. Fast, full tool support' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', note: 'Fastest replies' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', note: 'Fast and accurate with tools' },
  { id: 'gpt-4o', name: 'GPT-4o', note: 'Deeper multi-step reasoning' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B', note: 'Very fast, runs on Groq' },
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', note: 'Large reasoning model on Groq' },
];

export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

export const SUGGESTED_PROMPTS = [
  { icon: 'wallet-outline', label: 'Spending review', prompt: "Review my recent transactions and tell me where I'm spending most." },
  { icon: 'barbell-outline', label: 'Workout plan', prompt: 'Create a balanced 3-day workout routine focusing on core and strength.' },
  { icon: 'restaurant-outline', label: 'High-protein snacks', prompt: 'Suggest 5 quick high-protein snack ideas under 250 calories.' },
  { icon: 'sparkles-outline', label: 'Evening skincare', prompt: 'What is an ideal evening skincare sequence for glowing skin?' },
  { icon: 'time-outline', label: 'Prioritise tasks', prompt: 'How can I better prioritize tasks when feeling overwhelmed?' },
  { icon: 'document-text-outline', label: 'Log something', prompt: 'Log an expense of ₹350 for groceries today.' },
] as const;

const RUNNING_LABELS: Record<string, string> = {
  get_transactions: 'Checking your transactions…',
  get_budgets: 'Checking your budgets…',
  get_financial_goals: 'Checking savings goals…',
  get_balances: 'Checking account balances…',
  get_fitness_logs: 'Looking up workout logs…',
  get_food_logs: 'Checking food & meal logs…',
  get_notes: 'Searching your notes…',
  get_wardrobe: 'Checking your wardrobe…',
  get_wishlist: 'Checking your wishlist…',
  get_skincare_routine: 'Reviewing your skincare routine…',
  get_time_logs: 'Checking your time logs…',
  get_saved_items: 'Searching saved items…',
  create_transaction: 'Recording transaction…',
  create_budget: 'Setting budget…',
  log_workout: 'Logging workout…',
  log_meal: 'Logging meal…',
  create_note: 'Creating note…',
  update_note: 'Updating note…',
  add_fashion_item: 'Adding fashion item…',
  log_time_entry: 'Logging time entry…',
  save_item: 'Saving item…',
};

export function toolLabel(tool: string, status: 'running' | 'completed') {
  const running = RUNNING_LABELS[tool] ?? `Working on ${tool.replace(/_/g, ' ')}…`;
  if (status === 'running') return running;
  return running
    .replace('…', '')
    .replace('Checking', 'Checked')
    .replace('Looking up', 'Checked')
    .replace('Searching', 'Searched')
    .replace('Reviewing', 'Reviewed')
    .replace('Recording', 'Recorded')
    .replace('Setting', 'Set')
    .replace('Logging', 'Logged')
    .replace('Creating', 'Created')
    .replace('Updating', 'Updated')
    .replace('Adding', 'Added')
    .replace('Saving', 'Saved')
    .replace('Working on', 'Finished');
}
