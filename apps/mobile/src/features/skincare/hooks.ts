import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import type { SkincareProduct } from './types';

export const skincareKeys = {
  products: ['skincare-products'] as const,
};

/** Every skincare product the user has (shelf and routines). */
export function useSkincareProducts() {
  return useQuery({
    queryKey: skincareKeys.products,
    queryFn: () => api.get<SkincareProduct[]>('/api/skincare'),
  });
}
