import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { orderKeys } from './orders';
import { adaptPage, nextPage, unwrap } from './shared';

/**
 * Ringing up a walk-in customer — `POST /hubowner/orders/customer-manual-create`.
 * Body verified against ManualCustomerOrderRequest 2026-09-06. A seller sets no
 * prices: the order is at their own selling price, and negotiating is an
 * admin's job.
 */
export type PaymentMethod = 'COD' | 'COP' | 'GCASH' | 'BANK_TRANSFER' | 'WALLET';
export type ShippingMethod = 'DELIVERY' | 'PICKUP';

export interface ManualOrderInput {
  customer_name: string;
  customer_email?: string;
  order_items: { product_id: number; qty: number }[];
  payment_method: PaymentMethod;
  shipping_method: ShippingMethod;
  shipping_note?: string;
  customer_address?: {
    mobile_number: string;
    address_one: string;
    city: string;
    address: string;
  };
}

/** `/hubowner/products` — the picker's rows, verified 2026-09-06. */
export interface PickerProduct {
  id: number;
  sku: string | null;
  name: string;
  price: number;
  main_image: string | null;
  stock_status: string | null;
  stock_qty: number | null;
  hub_stock_qty: number | null;
}

export const manualOrdersApi = {
  products: (page: number, search?: string) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/products', { query: { page, per_page: 20, search } })
      .then(unwrap)
      .then((raw) => adaptPage<PickerProduct>(raw)),
  create: (input: ManualOrderInput) =>
    apiFetch<ApiEnvelope<{ id?: number; reference_number?: string | null }>>(
      '/hubowner/orders/customer-manual-create',
      { method: 'POST', json: input },
    ).then(unwrap),
};

export function useSellableProducts(search?: string) {
  return useInfiniteQuery({
    queryKey: ['manual-orders', 'products', search ?? ''],
    queryFn: ({ pageParam }) => manualOrdersApi.products(pageParam, search || undefined),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useCreateManualOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: manualOrdersApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
