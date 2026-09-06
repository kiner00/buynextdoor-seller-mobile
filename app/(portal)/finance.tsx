import { useCallback } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  useCommissionSummary,
  useCommissions,
  type CommissionRow,
} from '../../src/api/domains/finance';
import { formatDateTime, formatMoney } from '../../src/lib/format';
import { Card, EmptyState, ErrorState, LoadingState, Muted, Text } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

export default function FinanceScreen() {
  const summary = useCommissionSummary();
  const commissions = useCommissions();
  const items = commissions.data?.pages.flatMap((page) => page.data) ?? [];
  const loadMore = useCallback(() => {
    if (commissions.hasNextPage && !commissions.isFetchingNextPage)
      void commissions.fetchNextPage();
  }, [commissions]);

  if (summary.isPending) return <LoadingState />;
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  const s = summary.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Finance' }} />
      <FlatList
        className="flex-1 bg-neutral-50"
        data={items}
        keyExtractor={(row) => String(row.id)}
        renderItem={({ item }) => <Row row={item} />}
        contentContainerClassName="gap-3 p-4"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={summary.isRefetching}
        onRefresh={() => {
          void summary.refetch();
          void commissions.refetch();
        }}
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            <Card className="gap-1 border-brand-200 bg-brand-50">
              <Text className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
                Total commission earnings
              </Text>
              <Text className="text-3xl font-semibold text-brand-900">
                {formatMoney(s.total_commission_earnings)}
              </Text>
            </Card>
            <View className="flex-row gap-3">
              <Stat label="Referral" value={s.referral_earnings} />
              <Stat label="Residual · subs" value={s.residual_subscription_earnings} />
            </View>
            <View className="flex-row gap-3">
              <Stat label="Residual · purchases" value={s.residual_purchase_earnings} />
              <View className="flex-1" />
            </View>
            <Text className="pt-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              Commission history
            </Text>
          </View>
        }
        ListEmptyComponent={
          commissions.isPending ? (
            <LoadingState />
          ) : (
            <EmptyState
              title="No commissions yet"
              message="Referral and residual earnings land here."
            />
          )
        }
        ListFooterComponent={
          commissions.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.brand[600]} />
            </View>
          ) : null
        }
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex-1 gap-1">
      <Muted numberOfLines={1}>{label}</Muted>
      <Text className="text-lg font-semibold" numberOfLines={1} adjustsFontSizeToFit>
        {formatMoney(value)}
      </Text>
    </Card>
  );
}

function Row({ row }: { row: CommissionRow }) {
  return (
    <Card className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[14px] font-medium">{row.type ?? 'Commission'}</Text>
        <Muted className="text-[12px]">
          {[row.source_user_name, row.reference_number].filter(Boolean).join(' · ') ||
            row.remarks ||
            ''}
        </Muted>
        <Muted className="text-[12px]">{formatDateTime(row.created_at)}</Muted>
      </View>
      <View className="items-end">
        <Text className="text-[15px] font-semibold text-green-700">{formatMoney(row.amount)}</Text>
        {row.status ? <Muted className="text-[12px]">{row.status}</Muted> : null}
      </View>
    </Card>
  );
}
