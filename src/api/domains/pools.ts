import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { unwrap } from './shared';

/** `/hubowner/procurement-pools` → `{ pools }`, straight from the controller. */
export type PoolStatus = 'open' | 'fired' | 'cancelled';

export interface Pool {
  id: number;
  product_id: number;
  target_qty: number;
  pooled_qty: number;
  remaining_qty: number;
  status: PoolStatus;
  fired_order_id: number | null;
  my_qty: number;
}

export const poolsApi = {
  list: () =>
    apiFetch<ApiEnvelope<{ pools: Pool[] }>>('/hubowner/procurement-pools')
      .then(unwrap)
      .then((raw) => raw.pools ?? []),
};

export function usePools() {
  return useQuery({ queryKey: ['pools'], queryFn: poolsApi.list });
}
