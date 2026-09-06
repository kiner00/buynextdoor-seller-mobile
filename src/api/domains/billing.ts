import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, unwrap } from './shared';

/** `/hubowner/membership/history` row, verified 2026-09-06. `status` 1 = active. */
export interface MembershipRow {
  id: number;
  membership_plan_id: number;
  plan_name: string | null;
  start: string | null;
  end: string | null;
  status: number;
}

/** `/hubowner/feature-access`, verified 2026-09-06. */
export interface FeatureAccess {
  plan: { id: number; name: string | null; price: number } | null;
  is_free: boolean;
  features: {
    onhand: boolean;
    dropship: boolean;
    pre_order: boolean;
    wallet_topup: boolean;
    store_profile_edit: boolean;
    storefront_visible: boolean;
    storefront_checkout: boolean;
    wholesaler_network: boolean;
  };
}

export const billingApi = {
  history: () =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/membership/history')
      .then(unwrap)
      .then((raw) => adaptPage<MembershipRow>(raw).data),
  featureAccess: () =>
    apiFetch<ApiEnvelope<FeatureAccess>>('/hubowner/feature-access').then(unwrap),
};

export function useMembershipHistory() {
  return useQuery({ queryKey: ['billing', 'history'], queryFn: billingApi.history });
}

export function useFeatureAccess() {
  return useQuery({
    queryKey: ['billing', 'feature-access'],
    queryFn: billingApi.featureAccess,
    staleTime: 5 * 60_000,
  });
}
