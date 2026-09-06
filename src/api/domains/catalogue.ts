import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope, Paginated } from '../types';

/**
 * BND's catalogue, as this seller sees it — `/hubowner/catalogue`.
 *
 * Every shape here was read off the live staging database on 2026-09-06 by
 * running the real controller against it, NOT from the web client's types.
 * That matters: the web's `RawCatalogueProduct` describes the legacy AdonisJS
 * payload (`productDescription.name`, `productInventory.qty`, `planPrices`,
 * `category.categoryDescription.name`) and Laravel answers something flatter
 * and differently spelled. Reading it the web's way yields a card titled with
 * its SKU and an empty price ladder — no error, just wrong.
 *
 * The envelope is `{ data, meta, sku_limit }`: the quota is a sibling of the
 * rows, not inside them, because it is the same for every card.
 */

export type ActivationType = 'ONHAND' | 'PRE_ORDER' | 'DROPSHIP';

/**
 * One CTA on a card. The API decides `allowed` and explains `reason` when it
 * is false, so this app never re-implements the entitlement rules — it renders
 * a disabled button with the backend's own sentence.
 */
export interface ActivationOption {
  type: ActivationType;
  label: string;
  /** 'buy' needs a purchase order; 'activate' is a single POST. */
  action: 'buy' | 'activate';
  allowed: boolean;
  is_current: boolean;
  reason: string | null;
}

export interface PlanPrice {
  subscription_plan_id: number;
  plan_name: string | null;
  pricing_tier: string | null;
  price: number;
}

export interface CatalogueRow {
  id: number;
  uuid: string;
  sku: string | null;
  parent_sku: string | null;
  name: string;
  image: string | null;
  /** A flat string on Laravel, not a nested category object. */
  category: string | null;
  variant_group_id: number | null;

  price: number;
  compare_at_price: number | null;
  plan_prices: PlanPrice[];

  /** Product-level, e.g. 'ON-HAND' or 'PRE-ORDER'. */
  stock_status: string | null;
  /** What BND holds centrally. */
  bnd_qty: number;
  available_to_sell: number;
  negative_inventory_enabled: boolean;
  supplier_available_qty: number | null;
  moq: number | null;

  /** What this seller already holds. */
  owned_qty: number;
  /** A bare type string ('ONHAND'), or null when not activated. */
  current_activation: ActivationType | null;

  activation_options: ActivationOption[];
}

export interface SkuLimit {
  /** null means unlimited. */
  limit: number | null;
  current: number;
  allowed: boolean;
  at_warning: boolean;
}

export interface CataloguePage extends Paginated<CatalogueRow> {
  sku_limit: SkuLimit;
}

/**
 * Pre-order was pulled from the seller experience on 2026-08-23 ("focus muna
 * tayo sa buynow at dropship"). The API still returns the option, so it is
 * dropped in one place here rather than in each card — that way no CTA
 * anywhere can offer a pre-order while it is withdrawn, and turning it back on
 * is deleting this filter.
 */
function visibleOptions(options: ActivationOption[]): ActivationOption[] {
  return (options ?? []).filter((option) => option.type !== 'PRE_ORDER');
}

function adaptPage(raw: unknown): CataloguePage {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rows = (Array.isArray(row.data) ? row.data : []) as CatalogueRow[];
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  const quota = (row.sku_limit ?? {}) as Record<string, unknown>;

  return {
    data: rows.map((entry) => ({
      ...entry,
      plan_prices: entry.plan_prices ?? [],
      activation_options: visibleOptions(entry.activation_options),
    })),
    current_page: Number(meta.current_page ?? 1),
    last_page: Number(meta.last_page ?? 1),
    per_page: Number(meta.per_page ?? rows.length),
    total: Number(meta.total ?? rows.length),
    sku_limit: {
      limit: quota.limit === undefined || quota.limit === null ? null : Number(quota.limit),
      current: Number(quota.current ?? 0),
      allowed: quota.allowed !== false,
      // snake_case on Laravel; the web read `atWarning` and got undefined.
      at_warning: Boolean(quota.at_warning ?? false),
    },
  };
}

export interface CatalogueParams {
  page?: number;
  perPage?: number;
  search?: string;
  /** Only SKUs this seller has already activated. */
  owned?: boolean;
  activationType?: Exclude<ActivationType, 'ONHAND'>;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

export const catalogueApi = {
  list: (params: CatalogueParams = {}) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/catalogue', {
      query: {
        page: params.page,
        per_page: params.perPage,
        search: params.search,
        // The endpoint reads a truthy `owned`; omitted entirely when false so
        // it cannot be misread as a filter the seller did not ask for.
        ...(params.owned ? { owned: 1 } : {}),
        ...(params.activationType ? { activation_type: params.activationType } : {}),
      },
    })
      .then(unwrap)
      .then(adaptPage),

  /** On-hand is deliberately not activatable — it is earned by buying stock. */
  activate: (productId: number, activationType: Exclude<ActivationType, 'ONHAND'>) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/catalogue/${productId}/activate`, {
      method: 'POST',
      // snake_case, verified against ActivateFromCatalogueRequest. The web
      // sends `activationType` here, which Laravel drops — and because the
      // rule is `required`, that call 422s.
      json: { activation_type: activationType },
    }),

  deactivate: (productId: number) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/catalogue/${productId}/deactivate`, {
      method: 'POST',
    }),
};

export const catalogueKeys = {
  all: ['catalogue'] as const,
  list: (params: Omit<CatalogueParams, 'page'>) => ['catalogue', 'list', params] as const,
};

const PER_PAGE = 20;

export function useCatalogue(params: Omit<CatalogueParams, 'page' | 'perPage'> = {}) {
  return useInfiniteQuery({
    queryKey: catalogueKeys.list(params),
    queryFn: ({ pageParam }) =>
      catalogueApi.list({ ...params, page: pageParam, perPage: PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
  });
}

function useCatalogueMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Both the rows and the quota move, and they arrive together.
      void queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
    },
  });
}

export function useActivateSku() {
  return useCatalogueMutation(
    ({
      productId,
      activationType,
    }: {
      productId: number;
      activationType: Exclude<ActivationType, 'ONHAND'>;
    }) => catalogueApi.activate(productId, activationType),
  );
}

export function useDeactivateSku() {
  return useCatalogueMutation(({ productId }: { productId: number }) =>
    catalogueApi.deactivate(productId),
  );
}

/** The quota, for screens that need it without listing the catalogue. */
export function useSkuLimit() {
  return useQuery({
    queryKey: ['catalogue', 'sku-limit'],
    queryFn: () =>
      apiFetch<ApiEnvelope<Record<string, unknown>>>('/hubowner/sku-limit')
        .then(unwrap)
        .then((raw) => ({
          limit: raw.limit === undefined || raw.limit === null ? null : Number(raw.limit),
          current: Number(raw.current ?? 0),
          allowed: raw.allowed !== false,
          at_warning: Boolean(raw.at_warning ?? false),
        })),
    staleTime: 60_000,
  });
}
