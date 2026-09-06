import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useOrders, type OrderSummary, type ShippingStatus } from '../../../src/api/domains/orders';
import { formatDateTime, formatMoney } from '../../../src/lib/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  ShippingStatusBadge,
  Text,
} from '../../../src/ui';
import { cn } from '../../../src/lib/cn';
import { MIN_TOUCH_TARGET, colors } from '../../../src/theme/tokens';

type Filter = ShippingStatus | 'all';

/** The same tabs the web portal offers, in the same order. */
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'for_pickup', label: 'For pickup' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const orders = useOrders(filter);

  const items = orders.data?.pages.flatMap((page) => page.data) ?? [];

  const loadMore = useCallback(() => {
    if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage();
  }, [orders]);

  return (
    <View className="flex-1 bg-neutral-50">
      <FilterBar value={filter} onChange={setFilter} />

      {orders.isPending ? (
        <LoadingState label="Loading orders…" />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(order) => String(order.id)}
          renderItem={({ item }) => <OrderRow order={item} />}
          contentContainerClassName="gap-3 p-4"
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={orders.isRefetching && !orders.isFetchingNextPage}
          onRefresh={() => void orders.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No matching orders"
              message="When a customer places an order with you, it shows up here."
            />
          }
          ListFooterComponent={
            orders.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={colors.brand[600]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function FilterBar({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }) {
  return (
    <View className="border-b border-neutral-200 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 py-3"
      >
        {FILTERS.map((tab) => {
          const active = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={cn(
                'justify-center rounded-full border px-3.5',
                active ? 'border-brand-600 bg-brand-50' : 'border-neutral-300 bg-white',
              )}
              style={{ minHeight: MIN_TOUCH_TARGET - 8 }}
            >
              <Text
                className={cn(
                  'text-[14px]',
                  active ? 'font-semibold text-brand-800' : 'text-neutral-700',
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  // Reference is what a seller and a customer both say out loud, so it is the
  // lookup key; id is only the fallback for a row that somehow has none.
  const key = order.reference_number ?? String(order.id);

  return (
    <Link href={{ pathname: '/order/[reference]', params: { reference: key } }} asChild>
      <Pressable
        accessibilityRole="link"
        className="rounded-lg border border-neutral-200 bg-white p-4 active:bg-neutral-100"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-semibold" numberOfLines={1}>
              {order.reference_number ?? `#${order.id}`}
            </Text>
            <Muted className="text-[12px]">{formatDateTime(order.created_at)}</Muted>
          </View>
          <ShippingStatusBadge status={order.shipping_status} />
        </View>

        <View className="mt-3 flex-row items-end justify-between gap-3">
          <Muted className="flex-1" numberOfLines={1}>
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
