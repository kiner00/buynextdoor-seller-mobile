import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, nextPage, unwrap } from './shared';

/** `/hubowner/commissions/summary`, verified 2026-09-06. */
export interface CommissionSummary {
  referral_earnings: number;
  residual_subscription_earnings: number;
  residual_purchase_earnings: number;
  total_commission_earnings: number;
}

/**
 * A commission row. The staging seller had none, so this is the shape the
 * admin list documents; every field is read defensively on screen.
 */
export interface CommissionRow {
  id: number;
  type: string | null;
  amount: number;
  status: string | null;
  source_user_name?: string | null;
  reference_number?: string | null;
  remarks?: string | null;
  created_at: string | null;
}

export const financeApi = {
  summary: () =>
    apiFetch<ApiEnvelope<CommissionSummary>>('/hubowner/commissions/summary').then(unwrap),
  commissions: (page: number) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/commissions', { query: { page, per_page: 20 } })
      .then(unwrap)
      .then((raw) => adaptPage<CommissionRow>(raw)),
};

export function useCommissionSummary() {
  return useQuery({ queryKey: ['finance', 'summary'], queryFn: financeApi.summary });
}

export function useCommissions() {
  return useInfiniteQuery({
    queryKey: ['finance', 'commissions'],
    queryFn: ({ pageParam }) => financeApi.commissions(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}
