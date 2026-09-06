import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { listQuery } from '../wire';
import type { ApiEnvelope, Paginated } from '../types';

/**
 * Customer orders coming in to this seller — `/hubowner/customer/orders`.
 *
 * Note there are two order lists on this API and they are not the same thing:
 * `/hubowner/orders` is what the seller bought *from BND* (the Purchases
 * screen), and this one is what customers bought *from the seller*. Same noun,
 * opposite direction.
 */

export type ShippingStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'
  | 'rts'
  | 'returned'
  | 'expired';

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type ShippingMethod = 'DELIVERY' | 'PICKUP';

export interface OrderSummary {
  id: number;
  uuid: string;
  reference_number: string | null;
  sub_total: number;
  discount_amount: number;
  shipping_fee: number;
  grand_total: number;
  payment_method: string | null;
  shipping_method: ShippingMethod | null;
  shipping_status: ShippingStatus | null;
  payment_status: PaymentStatus | null;
  shipping_note: string | null;
  created_at: string;
  item_count: number;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  name: string | null;
  sku: string | null;
  image: string | null;
  qty: number;
  price: number;
  original_price: number;
  discount_amount: number;
  discounted_price: number;
}

export interface OrderStatusEntry {
  id: number;
  status: ShippingStatus | null;
  label: string | null;
  comment: string | null;
  created_at: string;
}

export interface OrderAddress {
  mobile_number: string | null;
  address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
}

export interface OrderVoucher {
  id: number;
  code: string | null;
  description: string | null;
}

export interface OrderDetail {
  summary: OrderSummary;
  items: OrderItem[];
  statuses: OrderStatusEntry[];
  address: OrderAddress | null;
  voucher: OrderVoucher | null;
}

/**
 * Laravel answers `{ items, pagination }`; the legacy backend answered
 * `{ data, meta }`. This app only talks to Laravel, but the normaliser is kept
 * because the failure is silent — the wrong key yields an empty list, not an
 * error, and the screen renders "no orders" to a seller who has plenty.
 */
function adaptPage<T>(raw: unknown): Paginated<T> {
  const row = (raw ?? {}) as Record<string, unknown>;

  // Laravel's own shape.
  if (Array.isArray(row.items)) {
    const meta = (row.pagination ?? {}) as Record<string, unknown>;
    return {
      data: row.items as T[],
      current_page: Number(meta.current_page ?? 1),
      last_page: Number(meta.last_page ?? 1),
      per_page: Number(meta.per_page ?? (row.items as T[]).length),
      total: Number(meta.total ?? (row.items as T[]).length),
    };
  }

  // `{ data, meta }` — the legacy serialization, and what a raw Laravel
  // paginator returns if an endpoint ever skips the resource wrapper.
  if (Array.isArray(row.data)) {
    const meta = (row.meta ?? row) as Record<string, unknown>;
    return {
      data: row.data as T[],
      current_page: Number(meta.current_page ?? 1),
      last_page: Number(meta.last_page ?? 1),
      per_page: Number(meta.per_page ?? (row.data as T[]).length),
      total: Number(meta.total ?? (row.data as T[]).length),
    };
  }

  return { data: [], current_page: 1, last_page: 1, per_page: 0, total: 0 };
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

export interface OrderListParams {
  page?: number;
  perPage?: number;
  status?: ShippingStatus;
}

export const ordersApi = {
  list: (params: OrderListParams = {}) =>
    // `statusStyle: 'scalar'`, verified against the API on 2026-09-06: this
    // endpoint reads a single `status`. Sending `statuses[]` is accepted and
    // ignored — 106 rows came back either way — so the filter chips would have
    // lit up over an unfiltered list. Do not "simplify" this to the default.
    apiFetch<ApiEnvelope<unknown>>('/hubowner/customer/orders', {
      query: listQuery(params, { statusStyle: 'scalar' }),
    })
      .then(unwrap)
      .then((raw) => adaptPage<OrderSummary>(raw)),

  detail: (idOrReference: string) =>
    apiFetch<ApiEnvelope<OrderDetail>>(
      `/hubowner/customer/orders/${encodeURIComponent(idOrReference)}`,
    ).then(unwrap),

  manageStatus: (idOrReference: string, input: { status: ShippingStatus; comment?: string }) =>
    apiFetch<ApiEnvelope<OrderDetail>>(
      `/hubowner/customer/orders/${encodeURIComponent(idOrReference)}/manage-status`,
      { method: 'POST', json: input },
    ).then(unwrap),

  markAsPaid: (idOrReference: string) =>
    apiFetch<ApiEnvelope<unknown>>(
      `/hubowner/customer/orders/${encodeURIComponent(idOrReference)}/mark-as-paid`,
      { method: 'POST' },
    ),

  markAsComplete: (idOrReference: string) =>
    apiFetch<ApiEnvelope<unknown>>(
      `/hubowner/customer/orders/${encodeURIComponent(idOrReference)}/mark-as-complete`,
      { method: 'POST' },
    ),

  markAsCancelled: (idOrReference: string) =>
    apiFetch<ApiEnvelope<unknown>>(
      `/hubowner/customer/orders/${encodeURIComponent(idOrReference)}/mark-as-cancelled`,
      { method: 'POST' },
    ),
};

export const orderKeys = {
  all: ['orders'] as const,
  list: (status: ShippingStatus | 'all') => ['orders', 'list', status] as const,
  detail: (idOrReference: string) => ['orders', 'detail', idOrReference] as const,
};

const PER_PAGE = 20;

/**
 * Infinite scroll rather than the web's page buttons. On a phone, paging
 * controls are a small target and cost a round trip to discover there was
 * nothing on page 2; scrolling is what a seller will try first anyway.
 */
export function useOrders(status: ShippingStatus | 'all') {
  return useInfiniteQuery({
    queryKey: orderKeys.list(status),
    queryFn: ({ pageParam }) =>
      ordersApi.list({
        page: pageParam,
        perPage: PER_PAGE,
        ...(status === 'all' ? {} : { status }),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
  });
}

export function useOrder(idOrReference: string) {
  return useQuery({
    queryKey: orderKeys.detail(idOrReference),
    queryFn: () => ordersApi.detail(idOrReference),
    enabled: idOrReference.length > 0,
  });
}

/**
 * Every order mutation invalidates both the detail and every list, because a
 * status change moves the order between filter tabs — leaving the lists alone
 * would show it under "Pending" until the cache expired.
 */
function useOrderMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useManageOrderStatus(idOrReference: string) {
  return useOrderMutation((input: { status: ShippingStatus; comment?: string }) =>
    ordersApi.manageStatus(idOrReference, input),
  );
}

export function useMarkOrderPaid(idOrReference: string) {
  return useOrderMutation(() => ordersApi.markAsPaid(idOrReference));
}

export function useMarkOrderComplete(idOrReference: string) {
  return useOrderMutation(() => ordersApi.markAsComplete(idOrReference));
}

export function useCancelOrder(idOrReference: string) {
  return useOrderMutation(() => ordersApi.markAsCancelled(idOrReference));
}
