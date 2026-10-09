import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { api } from '@/lib/api';

import type { Note, NoteInput } from './types';

export const notesKey = ['notes'] as const;

export function useNotes() {
  return useQuery({
    queryKey: notesKey,
    queryFn: () => api<Note[]>('/api/notes'),
  });
}

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: notesKey }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useSaveNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: NoteInput }) =>
      id
        ? api<Note>('/api/notes', { method: 'PATCH', query: { id }, body: input })
        : api<Note>('/api/notes', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => api('/api/notes', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}

/**
 * Small edits from the list (pin, archive, tick a checklist item). The list updates immediately
 * and rolls back if the server rejects it.
 */
export function usePatchNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: NoteInput }) => api<Note>('/api/notes', { method: 'PATCH', query: { id }, body: patch }),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: notesKey });
      const previous = queryClient.getQueryData<Note[]>(notesKey);
      queryClient.setQueryData<Note[]>(notesKey, (notes) => notes?.map((note) => (note.id === id ? ({ ...note, ...patch } as Note) : note)));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(notesKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notesKey }),
  });
}
