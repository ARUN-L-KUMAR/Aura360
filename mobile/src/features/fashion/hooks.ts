import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { FashionItem, FashionOutfit, FashionProfileData } from './types';

export const fashionKeys = {
  all: ['fashion-items'] as const,
  items: (status?: string) => ['fashion-items', { status }] as const,
  profile: ['fashion-profile'] as const,
  outfits: ['fashion-outfits'] as const,
};

export function useFashionItems(status?: string) {
  return useQuery({
    queryKey: fashionKeys.items(status),
    queryFn: () => {
      const query = status && status !== 'all' ? { status } : undefined;
      return api.get<FashionItem[]>('/api/fashion', { query });
    },
  });
}

export function useSaveFashionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<FashionItem> & { id?: string }) => {
      if (id) {
        return api.patch<FashionItem>(`/api/fashion?id=${id}`, item);
      }
      return api.post<FashionItem>('/api/fashion', item);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteFashionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/fashion?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'wardrobe' | 'wishlist' | 'sold' | 'donated' }) =>
      api.patch<FashionItem>(`/api/fashion?id=${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useLogItemWear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, currentWearCount = 0 }: { id: string; currentWearCount?: number }) => {
      const today = new Date().toISOString().split('T')[0];
      return api.patch<FashionItem>(`/api/fashion?id=${id}`, {
        wearCount: currentWearCount + 1,
        lastWornDate: today,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useFashionProfile() {
  return useQuery({
    queryKey: fashionKeys.profile,
    queryFn: () => api.get<FashionProfileData>('/api/fashion/profile'),
  });
}

export function useSaveFashionProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: FashionProfileData) => api.post<FashionProfileData>('/api/fashion/profile', profile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.profile });
    },
  });
}

export function useOutfits() {
  return useQuery({
    queryKey: fashionKeys.outfits,
    queryFn: () => api.get<FashionOutfit[]>('/api/fashion/outfits'),
  });
}

export function useSaveOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...outfit }: Partial<FashionOutfit> & { id?: string }) => {
      if (id) {
        return api.patch<FashionOutfit>(`/api/fashion/outfits?id=${id}`, outfit);
      }
      return api.post<FashionOutfit>('/api/fashion/outfits', outfit);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.outfits });
    },
  });
}

export function useDeleteOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/fashion/outfits?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.outfits });
    },
  });
}

export function useLogOutfitWorn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      return api.patch<{ outfit: FashionOutfit; alreadyLogged?: boolean }>(`/api/fashion/outfits?id=${id}`, {
        action: 'log_worn',
        date: today,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fashionKeys.outfits });
      qc.invalidateQueries({ queryKey: fashionKeys.all });
    },
  });
}
