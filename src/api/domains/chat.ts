import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';
import { adaptPage, nextPage, unwrap } from './shared';

/** `/chat/*`, verified 2026-09-06. Conversations come as a bare `{ items }`. */
export interface Conversation {
  id: number;
  uuid: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  other_participant: {
    user_id: number;
    uuid: string | null;
    name: string | null;
    user_type: number;
    profile_picture: string | null;
  } | null;
}

export interface Message {
  id: number;
  uuid: string | null;
  conversation_id: number;
  sender_user_id: number;
  sender_name: string | null;
  body: string;
  created_at: string | null;
}

export const chatApi = {
  conversations: () =>
    apiFetch<ApiEnvelope<{ items: Conversation[] }>>('/chat/conversations')
      .then(unwrap)
      .then((raw) => raw.items ?? []),
  messages: (uuid: string, page: number) =>
    apiFetch<ApiEnvelope<unknown>>(`/chat/conversations/${uuid}/messages`, {
      query: { page, per_page: 50 },
    })
      .then(unwrap)
      .then((raw) => adaptPage<Message>(raw)),
  /** SendMessageRequest: `body`, max 5000. */
  send: (uuid: string, body: string) =>
    apiFetch<ApiEnvelope<Message>>(`/chat/conversations/${uuid}/messages`, {
      method: 'POST',
      json: { body },
    }).then(unwrap),
  markRead: (uuid: string) =>
    apiFetch<ApiEnvelope<unknown>>(`/chat/conversations/${uuid}/read`, { method: 'POST' }),
  openSupport: () =>
    apiFetch<ApiEnvelope<{ uuid?: string; conversation?: { uuid: string } }>>(
      '/hubowner/chat/conversations/open-support',
      { method: 'POST' },
    ).then(unwrap),
};

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  messages: (uuid: string) => ['chat', 'messages', uuid] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: chatApi.conversations,
    // The list is the inbox; a light poll keeps unread counts honest even
    // when the socket is not connected.
    refetchInterval: 30_000,
  });
}

export function useMessages(uuid: string, live: boolean) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(uuid),
    queryFn: ({ pageParam }) => chatApi.messages(uuid, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: uuid.length > 0,
    // Polling is the floor. When the socket is up it is turned off; when it
    // is not — or its auth is refused — the thread still moves.
    refetchInterval: live ? false : 5_000,
  });
}

export function useSendMessage(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => chatApi.send(uuid, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(uuid) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => chatApi.markRead(uuid),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chatKeys.conversations }),
  });
}
