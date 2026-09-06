import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { usePurchases } from '../../src/api/domains/purchases';
import type { OrderSummary } from '../../src/api/domains/orders';
import { formatDateTime, formatMoney } from '../../src/lib/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  ShippingStatusBadge,
  Text,
} from '../../src/ui';
import { colors } from '../../src/theme/tokens';

/** What this seller bought from BND. */
export default function PurchasesScreen() {
  const purchases = usePurchases();
  const items = purchases.data?.pages.flatMap((page) => page.data) ?? [];
  const loadMore = useCallback(() => {
    if (purchases.hasNextPage && !purchases.isFetchingNextPage) void purchases.fetchNextPage();
  }, [purchases]);

  return (
    <>
      <Stack.Screen options={{ title: 'Purchases' }} />
      <View className="flex-1 bg-neutral-50">
        {purchases.isPending ? (
          <LoadingState />
        ) : purchases.isError ? (
          <ErrorState error={purchases.error} onRetry={() => void purchases.refetch()} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(row) => String(row.id)}
            renderItem={({ item }) => <Row order={item} />}
            contentContainerClassName="gap-3 p-4"
            contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshing={purchases.isRefetching && !purchases.isFetchingNextPage}
            onRefresh={() => void purchases.refetch()}
            ListEmptyComponent={
              <EmptyState
                title="No purchases yet"
                message="Stock you buy from BND shows up here."
              />
            }
            ListFooterComponent={
              purchases.isFetchingNextPage ? (
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

function Row({ order }: { order: OrderSummary }) {
  const key = order.reference_number ?? String(order.id);
  return (
    <Link href={{ pathname: '/purchase/[reference]', params: { reference: key } }} asChild>
      <Pressable className="rounded-lg border border-neutral-200 bg-white p-4 active:bg-neutral-100">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-semibold" numberOfLines={1}>
              {order.reference_number ?? `#${order.id}`}
            </Text>
            <Muted className="text-[12px]">{formatDateTime(order.created_at)}</Muted>
          </View>
          <ShippingStatusBadge status={order.shipping_status} />
        </View>
        <View className="mt-3 flex-row items-end justify-between">
          <Muted>
            {order.item_count} item{order.item_count === 1 ? '' : 's'}
            {order.payment_method ? ` · ${order.payment_method}` : ''}
          </Muted>
          <View className="flex-row items-center gap-1">
            <Text className="text-[16px] font-semibold">{formatMoney(order.grand_total)}</Text>
            <ChevronRight size={16} color={colors.neutral[400]} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
