import { View } from 'react-native';
import { useSellerDashboard, useSellerMe } from '../../../src/api/domains/seller';
import { formatCount } from '../../../src/lib/format';
import {
  Card,
  ErrorState,
  Heading,
  LoadingState,
  Muted,
  Screen,
  StatTile,
  Text,
} from '../../../src/ui';

export default function DashboardScreen() {
  const me = useSellerMe();
  const dashboard = useSellerDashboard();

  const refreshing = dashboard.isRefetching || me.isRefetching;
  const refresh = () => {
    void dashboard.refetch();
    void me.refetch();
  };

  if (dashboard.isPending || me.isPending) return <LoadingState label="Loading dashboard…" />;

  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  const m = dashboard.data;
  const seller = me.data?.hub_owner;
  const skus = m.activeSkus;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View className="gap-6 p-4">
        <View className="gap-1">
          <Heading>{seller?.name ?? 'Seller'}</Heading>
          <Muted>Last 30 days{seller?.code ? ` · ${seller.code}` : ''}</Muted>
        </View>

        <Section title="Orders">
          <Row>
            <StatTile title="Total orders" metric={m.totalOrders} />
            <StatTile title="Pending" metric={m.pendingOrders} />
          </Row>
          <Row>
            <StatTile title="Completed" metric={m.completedOrders} />
            <StatTile title="New buyers" metric={m.newBuyers} />
          </Row>
        </Section>

        <Section title="Money">
          <Row>
            <StatTile title="Total sales" metric={m.totalSales} money />
            <StatTile title="Total earnings" metric={m.totalEarnings} money />
          </Row>
          <Row>
            <StatTile title="Product earnings" metric={m.productEarnings} money />
            <StatTile title="Referral earnings" metric={m.referralEarnings} money />
          </Row>
          <Row>
            <StatTile title="Pending income" metric={m.pendingIncome} money />
            <StatTile title="Commission" metric={m.totalCommission} money />
          </Row>
        </Section>

        <Section title="Stock">
          <Row>
            <StatTile title="Low-stock items" metric={m.lowStockItems} />
            <Card className="flex-1 gap-1">
              <Muted>Active SKUs</Muted>
              <Text className="text-xl font-semibold">
                {formatCount(skus.current)}
                <Text className="text-sm font-normal text-neutral-400">
                  {' / '}
                  {skus.limit === null ? 'unlimited' : formatCount(skus.limit)}
                </Text>
              </Text>
              {skus.atWarning ? (
                <Text className="text-[12px] text-amber-600">Near your plan&apos;s limit</Text>
              ) : (
                <Muted className="text-[12px]">Within your plan</Muted>
              )}
            </Card>
          </Row>
        </Section>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

/**
 * Two tiles per row. Fixed rather than responsive: this app is portrait-only
 * on phones, so a grid that reflows would only ever produce one layout.
 */
function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>;
}
