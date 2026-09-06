import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  useLedger,
  useTopups,
  useWalletBalance,
  useWithdrawals,
  type LedgerEntry,
  type RequestStatus,
} from '../../../src/api/domains/wallet';
import { formatDateTime, formatMoney } from '../../../src/lib/format';
import { Button, Card, ErrorState, LoadingState, Muted, Screen, Text } from '../../../src/ui';
import { cn } from '../../../src/lib/cn';

export default function WalletScreen() {
  const balance = useWalletBalance();
  const ledger = useLedger();
  const topups = useTopups();
  const withdrawals = useWithdrawals();

  const [tab, setTab] = useState<'ledger' | 'topups' | 'withdrawals'>('ledger');

  const refreshing =
    balance.isRefetching || ledger.isRefetching || topups.isRefetching || withdrawals.isRefetching;

  const refresh = () => {
    void balance.refetch();
    void ledger.refetch();
    void topups.refetch();
    void withdrawals.refetch();
  };

  if (balance.isPending) return <LoadingState label="Loading wallet…" />;
  if (balance.isError) {
    return <ErrorState error={balance.error} onRetry={() => void balance.refetch()} />;
  }

  const income = balance.data.income_balance ?? 0;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View className="gap-4 p-4">
        <Card className="gap-1 border-brand-200 bg-brand-50">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
            Balance
          </Text>
          <Text className="text-3xl font-semibold text-brand-900">
            {formatMoney(balance.data.balance)}
          </Text>
          {income > 0 ? <Muted>Income balance {formatMoney(income)}</Muted> : null}
        </Card>

        <View className="flex-row gap-3">
          <Button label="Top up" onPress={() => router.push('/wallet-topup')} className="flex-1" />
          <Button
            label="Withdraw"
            variant="secondary"
            onPress={() => router.push('/wallet-withdraw')}
            className="flex-1"
          />
        </View>
        <Muted>Top-ups and withdrawals are reviewed by an admin before they take effect.</Muted>

        <View className="flex-row rounded-lg border border-neutral-200 bg-white p-1">
          <Tab label="Ledger" active={tab === 'ledger'} onPress={() => setTab('ledger')} />
          <Tab label="Top-ups" active={tab === 'topups'} onPress={() => setTab('topups')} />
          <Tab
            label="Withdrawals"
            active={tab === 'withdrawals'}
            onPress={() => setTab('withdrawals')}
          />
        </View>

        {tab === 'ledger' ? (
          <Card className="gap-3">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-semibold">Recent activity</Text>
              {/* The endpoint is a capped "latest N", not a paginated list —
                  saying so is better than an empty scroll that never loads. */}
              <Muted className="text-[12px]">Latest 50</Muted>
            </View>
            {ledger.isPending ? (
              <Muted>Loading…</Muted>
            ) : ledger.isError ? (
              <Muted>Could not load activity.</Muted>
            ) : ledger.data.length === 0 ? (
              <Muted>No transactions yet.</Muted>
            ) : (
              <View className="gap-3">
                {ledger.data.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {tab === 'topups' ? (
          <RequestCard
            title="Top-up requests"
            pending={topups.isPending}
            error={topups.isError}
            rows={(topups.data?.data ?? []).map((row) => ({
              id: row.id,
              amount: row.amount,
              status: row.status,
              reference: row.reference_number,
              createdAt: row.created_at,
            }))}
          />
        ) : null}

        {tab === 'withdrawals' ? (
          <RequestCard
            title="Withdrawal requests"
            pending={withdrawals.isPending}
            error={withdrawals.isError}
            rows={(withdrawals.data?.data ?? []).map((row) => ({
              id: row.id,
              amount: row.amount,
              status: row.status,
              reference: row.reference_number,
              createdAt: row.created_at,
            }))}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Button
      label={label}
      variant={active ? 'primary' : 'ghost'}
      onPress={onPress}
      className={cn('flex-1', active ? '' : 'bg-transparent')}
    />
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  // type 1 is a credit; anything else takes money out.
  const credit = entry.type === 1;
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[14px]" numberOfLines={1}>
          {entry.remarks ?? entry.reference_number ?? '—'}
        </Text>
        <Muted className="text-[12px]">{formatDateTime(entry.created_at)}</Muted>
      </View>
      <Text className={cn('text-[14px] font-medium', credit ? 'text-green-700' : 'text-red-600')}>
        {credit ? '+' : '−'}
        {formatMoney(entry.amount)}
      </Text>
    </View>
  );
}

const REQUEST_STATUS: Record<RequestStatus, { label: string; className: string }> = {
  0: { label: 'Pending', className: 'text-amber-700' },
  1: { label: 'Approved', className: 'text-green-700' },
  2: { label: 'Rejected', className: 'text-red-600' },
};

function RequestCard({
  title,
  rows,
  pending,
  error,
}: {
  title: string;
  rows: {
    id: number;
    amount: number;
    status: RequestStatus;
    reference: string | null;
    createdAt: string | null;
  }[];
  pending: boolean;
  error: boolean;
}) {
  return (
    <Card className="gap-3">
      <Text className="font-semibold">{title}</Text>
      {pending ? (
        <Muted>Loading…</Muted>
      ) : error ? (
        <Muted>Could not load requests.</Muted>
      ) : rows.length === 0 ? (
        <Muted>Nothing requested yet.</Muted>
      ) : (
        rows.map((row) => {
          const tone = REQUEST_STATUS[row.status] ?? { label: 'Unknown', className: '' };
          return (
            <View key={row.id} className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[14px] font-medium">{formatMoney(row.amount)}</Text>
                <Muted className="text-[12px]">
                  {row.reference ?? '—'} · {formatDateTime(row.createdAt)}
                </Muted>
              </View>
              <Text className={cn('text-[13px] font-medium', tone.className)}>{tone.label}</Text>
            </View>
          );
        })
      )}
    </Card>
  );
}
