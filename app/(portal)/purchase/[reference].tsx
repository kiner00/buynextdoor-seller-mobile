import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePurchase } from '../../../src/api/domains/purchases';
import { formatDateTime, formatMoney } from '../../../src/lib/format';
import {
  Card,
  ErrorState,
  Heading,
  LoadingState,
  Muted,
  PaymentStatusBadge,
  Screen,
  ShippingStatusBadge,
  Text,
} from '../../../src/ui';
import { colors } from '../../../src/theme/tokens';

/** A purchase from BND, read-only — BND runs its status, not the seller. */
export default function PurchaseDetailScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const purchase = usePurchase(reference ?? '');

  if (purchase.isPending) return <LoadingState />;
  if (purchase.isError) {
    return <ErrorState error={purchase.error} onRetry={() => void purchase.refetch()} />;
  }

  const { summary, items, statuses } = purchase.data;

  return (
    <>
      <Stack.Screen options={{ title: summary.reference_number ?? `Purchase #${summary.id}` }} />
      <Screen onRefresh={() => void purchase.refetch()} refreshing={purchase.isRefetching}>
        <View className="gap-4 p-4">
          <Card className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Heading className="text-lg">
                  {summary.reference_number ?? `#${summary.id}`}
                </Heading>
                <Muted className="text-[12px]">{formatDateTime(summary.created_at)}</Muted>
              </View>
              <ShippingStatusBadge status={summary.shipping_status} />
            </View>
            <View className="flex-row items-center gap-2">
              <PaymentStatusBadge status={summary.payment_status} />
              <Muted>
                {summary.payment_method ?? '—'} · {summary.shipping_method ?? '—'}
              </Muted>
            </View>
          </Card>

          <Card className="gap-3">
            <Text className="font-semibold">Items</Text>
            {items.map((item) => (
              <View key={item.id} className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-[14px]">
                    {item.qty} × {item.name ?? `#${item.product_id}`}
                  </Text>
                  {item.sku ? <Muted className="text-[12px]">{item.sku}</Muted> : null}
                </View>
                <Text className="text-[14px]">{formatMoney(item.discounted_price)}</Text>
              </View>
            ))}
            <View className="flex-row items-baseline justify-between border-t border-neutral-200 pt-3">
              <Text className="font-semibold">Total</Text>
              <Text className="text-lg font-semibold">{formatMoney(summary.grand_total)}</Text>
            </View>
          </Card>

          <Card className="gap-3">
            <Text className="font-semibold">Status timeline</Text>
            {statuses.length === 0 ? (
              <Muted>No updates yet.</Muted>
            ) : (
              statuses.map((entry, index) => (
                <View key={entry.id} className="flex-row gap-3">
                  <View
                    className="mt-1.5 size-2.5 rounded-full"
                    style={{
                      backgroundColor: index === 0 ? colors.brand[600] : colors.neutral[300],
                    }}
                  />
                  <View className="flex-1">
                    <Text className="text-[14px] font-medium">
                      {entry.label ?? entry.status ?? 'Updated'}
                    </Text>
                    <Muted className="text-[12px]">{formatDateTime(entry.created_at)}</Muted>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>
      </Screen>
    </>
  );
}
