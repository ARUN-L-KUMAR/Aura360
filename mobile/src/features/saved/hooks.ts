import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKey } from '@/features/dashboard/use-dashboard';
import { notesKey } from '@/features/notes/hooks';
import { api } from '@/lib/api';

import type { Destination, IngestPreview, SavedInput, SavedItem } from './types';

export const savedKey = ['saved'] as const;

export function useSavedItems() {
  return useQuery({
    queryKey: savedKey,
    queryFn: () => api<SavedItem[]>('/api/saved'),
  });
}

function useInvalidateSaved() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: savedKey }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useSaveSavedItem() {
  const invalidate = useInvalidateSaved();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SavedInput }) =>
      id
        ? api<SavedItem>('/api/saved', { method: 'PATCH', query: { id }, body: input })
        : api<SavedItem>('/api/saved', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteSavedItem() {
  const invalidate = useInvalidateSaved();
  return useMutation({
    mutationFn: (id: string) => api('/api/saved', { method: 'DELETE', query: { id } }),
    onSuccess: invalidate,
  });
}

/** Heart toggle: updates the list straight away and rolls back if the server refuses. */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api<SavedItem>('/api/saved', { method: 'PATCH', query: { id }, body: { isFavorite } }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: savedKey });
      const previous = queryClient.getQueryData<SavedItem[]>(savedKey);
      queryClient.setQueryData<SavedItem[]>(savedKey, (items) => items?.map((item) => (item.id === id ? { ...item, isFavorite } : item)));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(savedKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: savedKey }),
  });
}

/** Reads a link (title, picture, description, best-fit module) without saving anything. */
export function useLinkPreview() {
  return useMutation({
    mutationFn: ({ url, destination }: { url: string; destination: Destination }) =>
      api<IngestPreview>('/api/ingest-link', { method: 'POST', body: { url, destination, autoSave: false } }),
  });
}

export function useSaveLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ url, destination }: { url: string; destination: Destination }) =>
      api<IngestPreview>('/api/ingest-link', { method: 'POST', body: { url, destination, autoSave: true } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: savedKey }),
        queryClient.invalidateQueries({ queryKey: notesKey }),
        queryClient.invalidateQueries({ queryKey: dashboardKey }),
      ]),
  });
}
