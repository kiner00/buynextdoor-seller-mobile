import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, nextPage, unwrap } from './shared';

/** `/hubowner/posting-materials`, verified 2026-09-06. Rows are `{ item, is_activated }`. */
export interface PostingItem {
  id: number;
  uuid: string;
  sku: string | null;
  name: string;
  category: string | null;
  image: string | null;
  materials_count: number;
  published_count: number;
  is_highlighted: boolean;
  is_special: boolean;
  has_new: boolean;
  materials_updated_at: string | null;
  status: string | null;
}

export interface PostingRow {
  item: PostingItem;
  is_activated: boolean;
}

export interface PostingMedia {
  id: number;
  uuid: string;
  url: string | null;
  filename: string | null;
  mime: string | null;
  position: number;
}

export interface PostingVariant {
  id: number;
  uuid: string;
  label: string;
  caption: string;
  char_count: number;
  media: PostingMedia[];
}

export interface PostingMaterial {
  id: number;
  uuid: string;
  product_id: number;
  post_type: string | null;
  post_style: string | null;
  sort_order: number;
  is_published: boolean;
  published_at: string | null;
  is_new: boolean;
  variants: PostingVariant[];
}

export interface PostingDetail {
  item: PostingItem;
  is_activated: boolean;
  materials: PostingMaterial[];
}

export const postingApi = {
  list: (page: number, search?: string) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/posting-materials', {
      query: { page, per_page: 20, search },
    })
      .then(unwrap)
      .then((raw) => adaptPage<PostingRow>(raw)),
  featured: () =>
    apiFetch<ApiEnvelope<{ highlight: PostingRow[]; special: PostingRow[] }>>(
      '/hubowner/posting-materials/featured',
    ).then(unwrap),
  detail: (productId: number) =>
    apiFetch<ApiEnvelope<PostingDetail>>(`/hubowner/posting-materials/${productId}`).then(unwrap),
  /** Telling the API a variant was used — analytics only, never blocking. */
  logUsage: (materialId: number, variantId: number, channel: string) =>
    apiFetch<ApiEnvelope<unknown>>(`/hubowner/posting-materials/${materialId}/usage`, {
      method: 'POST',
      json: { variant_id: variantId, channel },
    }),
};

export function usePostingItems(search?: string) {
  return useInfiniteQuery({
    queryKey: ['posting', 'list', search ?? ''],
    queryFn: ({ pageParam }) => postingApi.list(pageParam, search || undefined),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}
export function usePostingDetail(productId: number) {
  return useQuery({
    queryKey: ['posting', 'detail', productId],
    queryFn: () => postingApi.detail(productId),
    enabled: productId > 0,
  });
}
export function useLogPostingUsage() {
  return useMutation({
    mutationFn: ({
      materialId,
      variantId,
      channel,
    }: {
      materialId: number;
      variantId: number;
      channel: string;
    }) => postingApi.logUsage(materialId, variantId, channel),
  });
}
