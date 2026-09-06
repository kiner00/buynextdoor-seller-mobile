import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { sellerKeys } from './seller';
import { unwrap } from './shared';

/**
 * Editable seller details — `POST /hubowner/update-hub-details`. Every key is
 * `sometimes`, so a form sends only what it changed. Verified against
 * UpdateHubDetailsRequest 2026-09-06; image fields take already-uploaded
 * paths and are left out of the mobile form.
 */
export interface HubDetailsInput {
  name?: string;
  store_name?: string | null;
  email?: string;
  contact_number?: string;
  contact_person?: string;
  allow_customer_pickup?: boolean;
  tin_number?: string | null;
  facebook?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  viber?: string | null;
  payment_bank_account_type?: string;
  payment_bank_account_number?: string;
  payment_bank_account_name?: string;
  payment_bank_name?: string;
}

/** `/hubowner/store-profile`, verified 2026-09-06. */
export interface StoreProfile {
  hub_owner_id: number;
  uuid: string | null;
  banner_image_url: string | null;
  logo_image_url: string | null;
  store_description: string | null;
  store_tagline: string | null;
  announcement_text: string | null;
  theme_preset: string | null;
  featured_product_ids: number[];
  featured_category_ids: number[];
  featured_collection_ids: number[];
  arranged_product_ids: number[];
}

export type StoreProfileInput = Partial<
  Pick<StoreProfile, 'store_description' | 'store_tagline' | 'announcement_text' | 'theme_preset'>
>;

export const profileApi = {
  updateDetails: (input: HubDetailsInput) =>
    apiFetch<ApiEnvelope<unknown>>('/hubowner/update-hub-details', {
      method: 'POST',
      json: input,
    }),
  storeProfile: () => apiFetch<ApiEnvelope<StoreProfile>>('/hubowner/store-profile').then(unwrap),
  upsertStoreProfile: (input: StoreProfileInput) =>
    apiFetch<ApiEnvelope<StoreProfile>>('/hubowner/store-profile', {
      method: 'POST',
      json: input,
    }).then(unwrap),
};

export function useUpdateHubDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateDetails,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: sellerKeys.me }),
  });
}

export function useStoreProfile() {
  return useQuery({ queryKey: ['store-profile'], queryFn: profileApi.storeProfile });
}

export function useUpsertStoreProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.upsertStoreProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['store-profile'] }),
  });
}
