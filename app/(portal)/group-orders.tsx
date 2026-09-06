import { View } from 'react-native';
import { Stack } from 'expo-router';
import { usePools, type Pool } from '../../src/api/domains/pools';
import { formatCount } from '../../src/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';

const STATUS: Record<Pool['status'], { label: string; className: string }> = {
  open: { label: 'Open', className: 'text-amber-700' },
  fired: { label: 'Ordered', className: 'text-green-700' },
  cancelled: { label: 'Cancelled', className: 'text-red-600' },
};

/** Procurement pools this seller has joined — orders grouped to reach a MoQ. */
export default function GroupOrdersScreen() {
  const pools = usePools();

  if (pools.isPending) return <LoadingState />;
  if (pools.isError) return <ErrorState error={pools.error} onRetry={() => void pools.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Group orders' }} />
      <Screen onRefresh={() => void pools.refetch()} refreshing={pools.isRefetching}>
        <View className="gap-3 p-4">
          {pools.data.length === 0 ? (
            <EmptyState
              title="No group orders"
              message="When your stock purchase joins a pool to reach a supplier's minimum, it shows up here."
            />
          ) : (
            pools.data.map((pool) => {
              const tone = STATUS[pool.status];
              const pct =
                pool.target_qty > 0 ? Math.min(100, (pool.pooled_qty / pool.target_qty) * 100) : 0;
              return (
                <Card key={pool.id} className="gap-2">
                  <View className="flex-row items-start justify-between gap-3">
                    <Text className="font-semibold">Product #{pool.product_id}</Text>
                    <Text className={`text-[13px] font-medium ${tone.className}`}>
                      {tone.label}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-neutral-200">
                    <View className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </View>
                  <Muted className="text-[12px]">
                    {formatCount(pool.pooled_qty)} of {formatCount(pool.target_qty)} pooled ·{' '}
                    {formatCount(pool.remaining_qty)} to go · you: {formatCount(pool.my_qty)}
                  </Muted>
                </Card>
              );
            })
          )}
        </View>
      </Screen>
    </>
  );
}
