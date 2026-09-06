import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFeatureAccess, useMembershipHistory } from '../../src/api/domains/billing';
import { formatDate, formatMoney } from '../../src/lib/format';
import { Card, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';

const FEATURE_LABELS: Record<string, string> = {
  onhand: 'Carry on-hand stock',
  dropship: 'Dropship',
  pre_order: 'Pre-order',
  wallet_topup: 'Wallet top-up',
  store_profile_edit: 'Edit storefront',
  storefront_visible: 'Storefront visible',
  storefront_checkout: 'Storefront checkout',
  wholesaler_network: 'Wholesaler network',
};

export default function BillingScreen() {
  const access = useFeatureAccess();
  const history = useMembershipHistory();

  if (access.isPending) return <LoadingState />;
  if (access.isError)
    return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;

  const plan = access.data.plan;

  return (
    <>
      <Stack.Screen options={{ title: 'Billing' }} />
      <Screen
        onRefresh={() => {
          void access.refetch();
          void history.refetch();
        }}
        refreshing={access.isRefetching}
      >
        <View className="gap-4 p-4">
          <Card className="gap-1 border-brand-200 bg-brand-50">
            <Text className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
              Current plan
            </Text>
            <Text className="text-2xl font-semibold text-brand-900">
              {access.data.is_free ? 'Free' : (plan?.name ?? '—')}
            </Text>
            {plan && !access.data.is_free ? (
              <Muted>{formatMoney(plan.price)} per term</Muted>
            ) : null}
          </Card>

          <Card className="gap-2">
            <Text className="font-semibold">What your plan includes</Text>
            {Object.entries(access.data.features).map(([key, on]) => (
              <View key={key} className="flex-row items-center justify-between">
                <Text className="text-[14px]">{FEATURE_LABELS[key] ?? key}</Text>
                <Text
                  className={
                    on ? 'text-[13px] font-medium text-green-700' : 'text-[13px] text-neutral-400'
                  }
                >
                  {on ? 'Included' : 'Not included'}
                </Text>
              </View>
            ))}
          </Card>

          <Card className="gap-3">
            <Text className="font-semibold">Membership history</Text>
            {history.isPending ? (
              <Muted>Loading…</Muted>
            ) : history.isError || !history.data || history.data.length === 0 ? (
              <Muted>No membership records.</Muted>
            ) : (
              history.data.map((row) => (
                <View key={row.id} className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] font-medium">{row.plan_name ?? 'Plan'}</Text>
                    <Muted className="text-[12px]">
                      {formatDate(row.start)} → {formatDate(row.end)}
                    </Muted>
                  </View>
                  <Text
                    className={
                      row.status === 1
                        ? 'text-[13px] font-medium text-green-700'
                        : 'text-[13px] text-neutral-500'
                    }
                  >
                    {row.status === 1 ? 'Active' : 'Ended'}
                  </Text>
                </View>
              ))
            )}
          </Card>
          <Muted>Upgrading and renewing are done on the seller website.</Muted>
        </View>
      </Screen>
    </>
  );
}
