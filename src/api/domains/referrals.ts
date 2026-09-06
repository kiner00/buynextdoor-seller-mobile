import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, nextPage, unwrap } from './shared';

/** All verified on staging 2026-09-06. */
export interface ReferralLink {
  referral_code: string | null;
  referral_slug: string | null;
  referral_link: string | null;
  referred_by: { name?: string | null } | string | null;
}

export interface NetworkSummary {
  downlines: {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    new_prev_month: number;
    growth_percent: number;
  };
  sales: {
    team_sales: number;
    team_sales_this_month: number;
    team_sales_prev_month: number;
    team_sales_growth_percent: number;
    personal_sales: number;
    personal_sales_this_month: number;
  };
  commissions: { referral_earnings: number; residual_income: number; total_earned: number };
}

/** The staging seller had no downlines; fields are read defensively. */
export interface Downline {
  id: number;
  name?: string | null;
  email?: string | null;
  status?: number | string | null;
  plan_name?: string | null;
  created_at?: string | null;
}

export const referralsApi = {
  link: () => apiFetch<ApiEnvelope<ReferralLink>>('/hubowner/referral-link').then(unwrap),
  summary: () => apiFetch<ApiEnvelope<NetworkSummary>>('/hubowner/network/summary').then(unwrap),
  downlines: (page: number) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/downlines', { query: { page, per_page: 20 } })
      .then(unwrap)
      .then((raw) => adaptPage<Downline>(raw)),
};

export function useReferralLink() {
  return useQuery({ queryKey: ['referrals', 'link'], queryFn: referralsApi.link });
}
export function useNetworkSummary() {
  return useQuery({ queryKey: ['referrals', 'summary'], queryFn: referralsApi.summary });
}
export function useDownlines() {
  return useInfiniteQuery({
    queryKey: ['referrals', 'downlines'],
    queryFn: ({ pageParam }) => referralsApi.downlines(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}
