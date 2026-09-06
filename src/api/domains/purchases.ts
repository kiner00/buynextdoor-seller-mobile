import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import type { OrderDetail, OrderSummary } from './orders';
import { adaptPage, nextPage, unwrap } from './shared';

/**
 * What this seller bought FROM BND — `/hubowner/orders`. Same row shapes as
 * customer orders (verified on staging 2026-09-06), opposite direction.
 */
export const purchasesApi = {
  list: (page: number) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/orders', { query: { page, per_page: 20 } })
      .then(unwrap)
      .then((raw) => adaptPage<OrderSummary>(raw)),
  detail: (idOrReference: string) =>
    apiFetch<ApiEnvelope<OrderDetail>>(
      `/hubowner/orders/${encodeURIComponent(idOrReference)}`,
    ).then(unwrap),
};

export function usePurchases() {
  return useInfiniteQuery({
    queryKey: ['purchases', 'list'],
    queryFn: ({ pageParam }) => purchasesApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function usePurchase(idOrReference: string) {
  return useQuery({
    queryKey: ['purchases', 'detail', idOrReference],
    queryFn: () => purchasesApi.detail(idOrReference),
    enabled: idOrReference.length > 0,
  });
}
