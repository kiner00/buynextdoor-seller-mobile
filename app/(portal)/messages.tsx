import { Pressable, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useConversations, type Conversation } from '../../src/api/domains/chat';
import { formatDateTime } from '../../src/lib/format';
import { EmptyState, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

export default function MessagesScreen() {
  const conversations = useConversations();

  if (conversations.isPending) return <LoadingState />;
  if (conversations.isError) {
    return <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <Screen
        onRefresh={() => void conversations.refetch()}
        refreshing={conversations.isRefetching}
      >
        <View className="p-4">
          {conversations.data.length === 0 ? (
            <EmptyState
              title="No messages yet"
              message="Buyers who message your store show up here."
            />
          ) : (
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {conversations.data.map((conversation, index) => (
                <Row key={conversation.uuid} conversation={conversation} first={index === 0} />
              ))}
            </View>
          )}
        </View>
      </Screen>
    </>
  );
}

function Row({ conversation, first }: { conversation: Conversation; first: boolean }) {
  const other = conversation.other_participant;
  const unread = conversation.unread_count > 0;
  return (
    <Link href={{ pathname: '/chat/[uuid]', params: { uuid: conversation.uuid } }} asChild>
      <Pressable
        className={`flex-row items-center gap-3 px-4 active:bg-neutral-100 ${first ? '' : 'border-t border-neutral-200'}`}
        style={{ minHeight: MIN_TOUCH_TARGET + 20 }}
      >
        <Image
          source={other?.profile_picture ? { uri: other.profile_picture } : undefined}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutral[200] }}
          contentFit="cover"
        />
        <View className="flex-1 py-3">
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className={unread ? 'flex-1 font-semibold' : 'flex-1'} numberOfLines={1}>
              {other?.name ?? 'Customer'}
            </Text>
            <Muted className="text-[11px]">{formatDateTime(conversation.last_message_at)}</Muted>
          </View>
          <Muted className={unread ? 'font-medium text-neutral-800' : ''} numberOfLines={1}>
            {conversation.last_message_preview ?? ''}
          </Muted>
        </View>
        {unread ? (
          <View className="min-w-5 items-center rounded-full bg-brand-600 px-1.5 py-0.5">
            <Text className="text-[11px] font-semibold text-white">
              {conversation.unread_count}
            </Text>
          </View>
        ) : (
          <ChevronRight size={18} color={colors.neutral[400]} />
        )}
      </Pressable>
    </Link>
  );
}
