import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { unwrap } from './shared';

/**
 * `/hubowner/reports/*`, verified 2026-09-06. All three take
 * **`start_date` / `end_date`** — snake_case. The camelCase the web client
 * sends (`startDate`) is rejected with a 422, not silently dropped.
 */
export interface SalesRow {
  period: string;
  orders: number;
  revenue: number;
}
export interface ProductReportRow {
  product_id: number;
  sku: string | null;
  name: string;
  units_sold: number;
  revenue: number;
}
export interface BuyerReportRow {
  customer_user_id: number;
  email: string | null;
  name: string | null;
  orders: number;
  revenue: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

export type DateRange = {
  start_date: string;
  end_date: string;
};

export function trailingDays(days: number): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start_date: iso(start), end_date: iso(end) };
}

const rows = <T>(raw: { rows?: T[] }) => raw.rows ?? [];

export const reportsApi = {
  sales: (range: DateRange) =>
    apiFetch<ApiEnvelope<{ rows: SalesRow[] }>>('/hubowner/reports/sales', { query: range })
      .then(unwrap)
      .then(rows),
  products: (range: DateRange) =>
    apiFetch<ApiEnvelope<{ rows: ProductReportRow[] }>>('/hubowner/reports/products', {
      query: range,
    })
      .then(unwrap)
      .then(rows),
  buyers: (range: DateRange) =>
    apiFetch<ApiEnvelope<{ rows: BuyerReportRow[] }>>('/hubowner/reports/buyers', {
      query: range,
    })
      .then(unwrap)
      .then(rows),
};

export function useSalesReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'sales', range],
    queryFn: () => reportsApi.sales(range),
  });
}
export function useProductsReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'products', range],
    queryFn: () => reportsApi.products(range),
  });
}
export function useBuyersReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'buyers', range],
    queryFn: () => reportsApi.buyers(range),
  });
}
