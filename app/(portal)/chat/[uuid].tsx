import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import {
  chatKeys,
  useMarkRead,
  useMessages,
  useSendMessage,
  type Message,
} from '../../../src/api/domains/chat';
import { useSession } from '../../../src/auth/session';
import { subscribeToConversation } from '../../../src/realtime/echo';
import { formatDateTime } from '../../../src/lib/format';
import { cn } from '../../../src/lib/cn';
import { ErrorState, LoadingState, Muted, Text } from '../../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../../src/theme/tokens';

export default function ChatThreadScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const conversationUuid = uuid ?? '';
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  const messages = useMessages(conversationUuid, live);
  const send = useSendMessage(conversationUuid);
  const markRead = useMarkRead();
  const [draft, setDraft] = useState('');

  const rows = useMemo(
    () =>
      (messages.data?.pages.flatMap((page) => page.data) ?? []).slice().sort((a, b) => b.id - a.id),
    [messages.data],
  );
  const conversationId = rows[0]?.conversation_id;

  // Opening the thread reads it.
  useEffect(() => {
    if (conversationUuid) markRead.mutate(conversationUuid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUuid]);

  // Live updates when the socket lets us in; polling covers the rest.
  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversation(
      conversationId,
      (message: Message) => {
        queryClient.setQueryData(
          chatKeys.messages(conversationUuid),
          (current: typeof messages.data) => {
            if (!current) return current;
            const [first, ...rest] = current.pages;
            if (!first || first.data.some((m) => m.id === message.id)) return current;
            return { ...current, pages: [{ ...first, data: [message, ...first.data] }, ...rest] };
          },
        );
      },
      setLive,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversationUuid]);

  const insets = useSafeAreaInsets();
  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    send.mutate(body);
  };

  if (messages.isPending) return <LoadingState />;
  if (messages.isError)
    return <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />;

  const me = session?.user.id;

  return (
    <>
      <Stack.Screen options={{ title: 'Conversation' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-neutral-50"
        keyboardVerticalOffset={90}
      >
        <FlatList
          inverted
          data={rows}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <Bubble message={item} mine={item.sender_user_id === me} />}
          contentContainerClassName="gap-2 p-4"
          onEndReached={() =>
            messages.hasNextPage && !messages.isFetchingNextPage && void messages.fetchNextPage()
          }
          onEndReachedThreshold={0.5}
        />
        <View
          className="flex-row items-end gap-2 border-t border-neutral-200 bg-white px-3 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={colors.neutral[400]}
            multiline
            maxLength={5000}
            className="max-h-32 flex-1 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900"
            style={{ minHeight: MIN_TOUCH_TARGET }}
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send"
            className={cn(
              'items-center justify-center rounded-full bg-brand-600',
              (!draft.trim() || send.isPending) && 'opacity-40',
            )}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          >
            <Send size={18} color={colors.white} />
          </Pressable>
        </View>
        {!live ? (
          <Muted className="bg-white px-4 pb-1 text-center text-[10px]">
            Refreshing every few seconds
          </Muted>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View className={cn('max-w-[80%] gap-0.5', mine ? 'self-end' : 'self-start')}>
      <View
        className={cn(
          'rounded-2xl px-3.5 py-2.5',
          mine ? 'rounded-br-sm bg-brand-600' : 'rounded-bl-sm border border-neutral-200 bg-white',
        )}
      >
        <Text className={cn('text-[15px]', mine ? 'text-white' : 'text-neutral-900')}>
          {message.body}
        </Text>
      </View>
      <Muted className={cn('text-[10px]', mine ? 'text-right' : '')}>
        {formatDateTime(message.created_at)}
      </Muted>
    </View>
  );
}
