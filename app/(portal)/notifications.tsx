import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from '../../src/api/domains/notifications';
import { destinationFor } from '../../src/notifications/useNotificationRouting';
import { formatDateTime } from '../../src/lib/format';
import { cn } from '../../src/lib/cn';
import { Button, EmptyState, ErrorState, LoadingState, Muted, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

/** The in-app inbox — every push, and everything that arrived while push was off. */
export default function NotificationsScreen() {
  const inbox = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const rows = inbox.data?.pages.flatMap((page) => page.data) ?? [];
  const unread = inbox.data?.pages[0]?.unread_count ?? 0;
  const loadMore = useCallback(() => {
    if (inbox.hasNextPage && !inbox.isFetchingNextPage) void inbox.fetchNextPage();
  }, [inbox]);

  const open = (row: Notification) => {
    if (!row.is_read) markRead.mutate(row.id);
    // Same decision a tapped push makes, so the two never disagree.
    const target = destinationFor({ type: row.type, ...(row.data ?? {}) });
    if (target && target !== '/notifications') router.push(target as never);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () =>
            unread > 0 ? (
              <Button label="Read all" variant="ghost" onPress={() => markAll.mutate(undefined)} />
            ) : null,
        }}
      />
      <View className="flex-1 bg-neutral-50">
        {inbox.isPending ? (
          <LoadingState />
        ) : inbox.isError ? (
          <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.id)}
            renderItem={({ item }) => <Row row={item} onPress={() => open(item)} />}
            contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshing={inbox.isRefetching && !inbox.isFetchingNextPage}
            onRefresh={() => void inbox.refetch()}
            ListEmptyComponent={
              <EmptyState
                title="Nothing yet"
                message="Orders, stock alerts and commissions land here."
              />
            }
            ListFooterComponent={
              inbox.isFetchingNextPage ? (
                <View className="py-4">
                  <ActivityIndicator color={colors.brand[600]} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </>
  );
}

function Row({ row, onPress }: { row: Notification; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        'flex-row gap-3 border-b border-neutral-200 px-4 py-3 active:bg-neutral-100',
        row.is_read ? 'bg-white' : 'bg-brand-50',
      )}
      style={{ minHeight: MIN_TOUCH_TARGET + 12 }}
    >
      <View className="pt-0.5">
        <Bell size={18} color={row.is_read ? colors.neutral[400] : colors.brand[600]} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className={cn('text-[15px]', !row.is_read && 'font-semibold')}>{row.title}</Text>
        {row.body ? <Muted numberOfLines={2}>{row.body}</Muted> : null}
        <Muted className="text-[11px]">{formatDateTime(row.created_at)}</Muted>
      </View>
      {!row.is_read ? <View className="mt-2 size-2 rounded-full bg-brand-600" /> : null}
    </Pressable>
  );
}
