import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  trailingDays,
  useBuyersReport,
  useProductsReport,
  useSalesReport,
} from '../../src/api/domains/reports';
import { formatCount, formatDate, formatMoney } from '../../src/lib/format';
import { cn } from '../../src/lib/cn';
import { Card, ErrorState, Muted, Screen, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET } from '../../src/theme/tokens';

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function ReportsScreen() {
  const [days, setDays] = useState(30);
  const range = trailingDays(days);
  const sales = useSalesReport(range);
  const products = useProductsReport(range);
  const buyers = useBuyersReport(range);

  const salesRows = sales.data ?? [];
  const productRows = products.data ?? [];
  const buyerRows = buyers.data ?? [];
  const totalRevenue = salesRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalOrders = salesRows.reduce((sum, row) => sum + row.orders, 0);
  const refreshing = sales.isRefetching || products.isRefetching || buyers.isRefetching;

  return (
    <>
      <Stack.Screen options={{ title: 'Reports' }} />
      <Screen
        onRefresh={() => {
          void sales.refetch();
          void products.refetch();
          void buyers.refetch();
        }}
        refreshing={refreshing}
      >
        <View className="gap-4 p-4">
          <View className="flex-row gap-2">
            {RANGES.map((option) => (
              <Pressable
                key={option.days}
                onPress={() => setDays(option.days)}
                accessibilityRole="tab"
                accessibilityState={{ selected: days === option.days }}
                className={cn(
                  'justify-center rounded-full border px-3.5',
                  days === option.days
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-neutral-300 bg-white',
                )}
                style={{ minHeight: MIN_TOUCH_TARGET - 8 }}
              >
                <Text
                  className={cn(
                    'text-[14px]',
                    days === option.days ? 'font-semibold text-brand-800' : 'text-neutral-700',
                  )}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {sales.isError ? (
            <ErrorState error={sales.error} onRetry={() => void sales.refetch()} />
          ) : (
            <View className="flex-row gap-3">
              <Card className="flex-1 gap-1">
                <Muted>Revenue</Muted>
                <Text className="text-xl font-semibold" numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(totalRevenue)}
                </Text>
              </Card>
              <Card className="flex-1 gap-1">
                <Muted>Orders</Muted>
                <Text className="text-xl font-semibold">{formatCount(totalOrders)}</Text>
              </Card>
            </View>
          )}

          <Card className="gap-2">
            <Text className="font-semibold">Sales by day</Text>
            {sales.isPending ? (
              <Muted>Loading…</Muted>
            ) : salesRows.length === 0 ? (
              <Muted>No sales in this period.</Muted>
            ) : (
              salesRows.map((row) => (
                <View key={row.period} className="flex-row items-baseline justify-between">
                  <Muted>{formatDate(row.period)}</Muted>
                  <Text className="text-[14px]">
                    {formatCount(row.orders)} · {formatMoney(row.revenue)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Card className="gap-2">
            <Text className="font-semibold">Top products</Text>
            {products.isPending ? (
              <Muted>Loading…</Muted>
            ) : productRows.length === 0 ? (
              <Muted>Nothing sold in this period.</Muted>
            ) : (
              productRows.map((row) => (
                <View key={row.product_id} className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px]" numberOfLines={2}>
                      {row.name}
                    </Text>
                    {row.sku ? <Muted className="text-[12px]">{row.sku}</Muted> : null}
                  </View>
                  <Text className="text-[14px]">
                    {formatCount(row.units_sold)} · {formatMoney(row.revenue)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Card className="gap-2">
            <Text className="font-semibold">Buyers</Text>
            {buyers.isPending ? (
              <Muted>Loading…</Muted>
            ) : buyerRows.length === 0 ? (
              <Muted>No buyers in this period.</Muted>
            ) : (
              buyerRows.map((row) => (
                <View
                  key={row.customer_user_id}
                  className="flex-row items-start justify-between gap-3"
                >
                  <View className="flex-1">
                    <Text className="text-[14px]">
                      {row.name ?? row.email ?? `#${row.customer_user_id}`}
                    </Text>
                    <Muted className="text-[12px]">
                      last order {formatDate(row.last_order_at)}
                    </Muted>
                  </View>
                  <Text className="text-[14px]">
                    {formatCount(row.orders)} · {formatMoney(row.revenue)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>
      </Screen>
    </>
  );
}
