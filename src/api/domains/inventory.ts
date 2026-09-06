import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import type { ActivationType } from './catalogue';
import { adaptPage, nextPage, unwrap } from './shared';

/** One SKU this seller holds — `/hubowner/product-inventories`, verified 2026-09-06. */
export interface InventoryRow {
  id: number;
  product_id: number;
  hub_owner_id: number;
  qty: number;
  sold: number;
  manage_stock: number;
  stock_availability: number;
  low_stock_threshold: number;
  hub_selling_price: number | null;
  activation_type: ActivationType | null;
  committed_qty: number;
  updated_at: string | null;
  product: {
    id: number;
    sku: string | null;
    name: string;
    image: string | null;
    category: string | null;
    variant_group_id: number | null;
  };
}

/** One stock movement — `/hubowner/product-inventories/tracking`. */
export interface StockMovement {
  id: number;
  product_id: number;
  product_sku: string | null;
  product_name: string;
  qty: number;
  type: string;
  remarks: string | null;
  from_hub_owner_name: string | null;
  to_hub_owner_name: string | null;
  created_at: string | null;
}

export const inventoryApi = {
  list: (page: number, search?: string) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/product-inventories', {
      query: { page, per_page: 20, search },
    })
      .then(unwrap)
      .then((raw) => adaptPage<InventoryRow>(raw)),

  tracking: (page: number) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/product-inventories/tracking', {
      query: { page, per_page: 30 },
    })
      .then(unwrap)
      .then((raw) => adaptPage<StockMovement>(raw)),

  /** Verified against UpdateInventorySettingsRequest: both optional, snake_case. */
  updateSettings: (
    productId: number,
    input: { activation_type?: ActivationType | null; hub_selling_price?: number | null },
  ) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/product-inventories/${productId}/settings`, {
      method: 'PATCH',
      json: input,
    }),
};

export function useInventory(search?: string) {
  return useInfiniteQuery({
    queryKey: ['inventory', 'list', search ?? ''],
    queryFn: ({ pageParam }) => inventoryApi.list(pageParam, search || undefined),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useStockMovements() {
  return useInfiniteQuery({
    queryKey: ['inventory', 'tracking'],
    queryFn: ({ pageParam }) => inventoryApi.tracking(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useUpdateInventorySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...input
    }: {
      productId: number;
      activation_type?: ActivationType | null;
      hub_selling_price?: number | null;
    }) => inventoryApi.updateSettings(productId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['catalogue'] });
    },
  });
}
