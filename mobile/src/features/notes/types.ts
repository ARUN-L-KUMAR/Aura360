export type ChecklistItem = { id: string; text: string; completed: boolean };

export type Note = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  isPinned: boolean | null;
  isArchived: boolean | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

/** What the API accepts. Optional fields must be omitted, never null (the server schema rejects null). */
export type NoteInput = {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  metadata?: Record<string, unknown>;
};

export function checklistOf(note: Pick<Note, 'metadata'>): ChecklistItem[] | null {
  const raw = note.metadata?.checklist;
  return Array.isArray(raw) ? (raw as ChecklistItem[]) : null;
}

export const newItemId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function parseTags(text: string) {
  return [
    ...new Set(
      text
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    ),
  ];
}
