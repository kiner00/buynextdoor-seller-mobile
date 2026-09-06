import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, nextPage, unwrap } from './shared';

/** One row of the seller's in-app inbox — `/notifications`, envelope verified 2026-09-06. */
export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationPreference {
  type: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
}

/** Copy for each event type, so the settings screen reads as English. */
export const PREFERENCE_LABELS: Record<string, string> = {
  new_order: 'New customer order',
  order_expired: 'Order expired',
  order_cancelled: 'Order cancelled',
  order_ready_for_pickup: 'Order ready for pickup',
  order_in_transit: 'Order in transit',
  order_completed: 'Order completed',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  account_verified: 'Account verified',
  account_rejected: 'Account rejected',
  loyalty_redeemed: 'Loyalty points redeemed',
  pool_fired: 'Group order placed',
  pool_cancelled: 'Group order cancelled',
  po_issued: 'Purchase order issued',
  po_rejected: 'Purchase order rejected',
  po_delivered: 'Purchase order delivered',
  commission_earned: 'Commission earned',
  commission_voided: 'Commission voided',
  store_profile_takedown: 'Storefront content removed',
  support_message: 'Support message',
};

export const notificationsApi = {
  list: (page: number) =>
    apiFetch<ApiEnvelope<unknown>>('/notifications', { query: { page, per_page: 20 } })
      .then(unwrap)
      .then((raw) => ({
        ...adaptPage<Notification>(raw),
        unread_count: Number((raw as { unread_count?: number }).unread_count ?? 0),
      })),
  markRead: (id: number) =>
    apiFetch<ApiEnvelope<unknown>>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiFetch<ApiEnvelope<unknown>>('/notifications/read-all', { method: 'POST' }),
  preferences: () =>
    apiFetch<ApiEnvelope<{ preferences: NotificationPreference[] }>>('/notifications/preferences')
      .then(unwrap)
      .then((raw) => raw.preferences ?? []),
  /** PATCH takes only the channels present; one switch can flip without restating the rest. */
  updatePreference: (type: string, patch: Partial<Omit<NotificationPreference, 'type'>>) =>
    apiFetch<ApiEnvelope<unknown>>('/notifications/preferences', {
      method: 'PATCH',
      json: { preferences: [{ type, ...patch }] },
    }),
};

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list(1).then((page) => page.unread_count),
    refetchInterval: 60_000,
  });
}

function useInboxMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
export const useMarkNotificationRead = () => useInboxMutation(notificationsApi.markRead);
export const useMarkAllNotificationsRead = () =>
  useInboxMutation(() => notificationsApi.markAllRead());

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: notificationsApi.preferences,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      ...patch
    }: { type: string } & Partial<Omit<NotificationPreference, 'type'>>) =>
      notificationsApi.updatePreference(type, patch),
    // Optimistic: a switch that lags behind the finger reads as broken.
    onMutate: async ({ type, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences });
      const previous = queryClient.getQueryData<NotificationPreference[]>(
        notificationKeys.preferences,
      );
      queryClient.setQueryData<NotificationPreference[]>(notificationKeys.preferences, (rows) =>
        (rows ?? []).map((row) => (row.type === type ? { ...row, ...patch } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(notificationKeys.preferences, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: notificationKeys.preferences }),
  });
}
