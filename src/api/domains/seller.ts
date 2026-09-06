import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope, User } from '../types';

/**
 * The `/hubowner/*` endpoints — the seller portal's own API surface. Named
 * "seller" here because that is what the product calls this role now; the
 * routes still say `hubowner` and are not being renamed (see the web repo's
 * terminology note).
 */

export interface SellerProfile {
  id: number;
  uuid: string | null;
  code: string | null;
  name: string | null;
  image: string | null;
  status: number | null;
  email: string | null;
  contact_number: string | null;
  contact_person: string | null;
  /** The payout account, verified present on /hubowner/me. Offered as a
      prefill on the withdrawal form rather than filled in silently — a stale
      account number is the one mistake here that costs real money. */
  payment_bank_name: string | null;
  payment_bank_account_number: string | null;
  payment_bank_account_name: string | null;
  payment_bank_account_type: string | null;
  rating: number | null;
  is_subscribed: number | null;
  is_member: number | null;
}

export interface SellerMePayload {
  user: User;
  hub_owner: SellerProfile;
}

/** Every dashboard metric is a current/previous pair with a delta. */
export interface Metric {
  current: number;
  previous: number;
  percentageChange: number;
}

export interface DashboardMetrics {
  totalOrders: Metric;
  pendingOrders: Metric;
  completedOrders: Metric;
  totalSales: Metric;
  totalEarnings: Metric;
  productEarnings: Metric;
  referralEarnings: Metric;
  totalCommission: Metric;
  pendingIncome: Metric;
  lowStockItems: Metric;
  newBuyers: Metric;
  returningBuyers: Metric;
  loyaltyPointsIssued: Metric;
  /** SKU usage against the plan's cap. `limit` is null when unlimited. */
  activeSkus: { current: number; limit: number | null; atWarning: boolean };
}

export type DashboardRange = { startDate: string; endDate: string };

/** The endpoint 400s without a range, so default to the trailing 30 days. */
export function defaultDashboardRange(): DashboardRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

// ── Casing tolerance ──────────────────────────────────────────────────
// Laravel answers snake_case and this app only talks to Laravel, so in
// principle snake_case is all we need. The adapters are tolerant anyway
// because the web hit exactly this and the dashboard went down: a screen
// reading `activeSkus.atWarning` off a snake_case payload gets `undefined`
// and renders blank or throws. Accepting both costs nothing and means a
// half-ported endpoint can't take the screen with it.

function pick<T>(row: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return (value === undefined || value === null ? fallback : value) as T;
}

function adaptMetric(raw: unknown): Metric {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    current: Number(row.current ?? 0),
    previous: Number(row.previous ?? 0),
    percentageChange: Number(pick(row, 'percentageChange', 'percentage_change', 0)),
  };
}

const METRIC_KEYS = [
  ['totalOrders', 'total_orders'],
  ['pendingOrders', 'pending_orders'],
  ['completedOrders', 'completed_orders'],
  ['totalSales', 'total_sales'],
  ['totalEarnings', 'total_earnings'],
  ['productEarnings', 'product_earnings'],
  ['referralEarnings', 'referral_earnings'],
  ['totalCommission', 'total_commission'],
  ['pendingIncome', 'pending_income'],
  ['lowStockItems', 'low_stock_items'],
  ['newBuyers', 'new_buyers'],
  ['returningBuyers', 'returning_buyers'],
  ['loyaltyPointsIssued', 'loyalty_points_issued'],
] as const;

function adaptDashboard(raw: unknown): DashboardMetrics {
  const row = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<string, unknown>;

  for (const [camel, snake] of METRIC_KEYS) {
    out[camel] = adaptMetric(row[camel] ?? row[snake]);
  }

  const skus = (row.activeSkus ?? row.active_skus ?? {}) as Record<string, unknown>;
  out.activeSkus = {
    current: Number(skus.current ?? 0),
    limit: skus.limit === undefined || skus.limit === null ? null : Number(skus.limit),
    atWarning: Boolean(pick(skus, 'atWarning', 'at_warning', false)),
  };

  return out as unknown as DashboardMetrics;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

export const sellerApi = {
  me: () => apiFetch<ApiEnvelope<SellerMePayload>>('/hubowner/me').then(unwrap),

  dashboard: (range: DashboardRange = defaultDashboardRange()) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/dashboard-metrics', { query: { ...range } })
      .then(unwrap)
      .then(adaptDashboard),
};

export const sellerKeys = {
  me: ['seller', 'me'] as const,
  dashboard: (range: DashboardRange) => ['seller', 'dashboard', range] as const,
};

export function useSellerMe() {
  return useQuery({ queryKey: sellerKeys.me, queryFn: sellerApi.me, staleTime: 60_000 });
}

export function useSellerDashboard(range: DashboardRange = defaultDashboardRange()) {
  return useQuery({
    queryKey: sellerKeys.dashboard(range),
    // Wrapped deliberately: passing the reference directly would hand React
    // Query's QueryFunctionContext to `range`.
    queryFn: () => sellerApi.dashboard(range),
  });
}
