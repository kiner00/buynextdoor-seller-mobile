import { useCallback } from 'react';
import { Alert, Share, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useDownlines, useNetworkSummary, useReferralLink } from '../../src/api/domains/referrals';
import { formatCount, formatDate, formatMoney } from '../../src/lib/format';
import { Button, Card, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';

export default function ReferralsScreen() {
  const link = useReferralLink();
  const summary = useNetworkSummary();
  const downlines = useDownlines();
  const rows = downlines.data?.pages.flatMap((page) => page.data) ?? [];

  const share = useCallback(async () => {
    const url = link.data?.referral_link;
    if (!url) return;
    // The native share sheet is the whole point of having this on a phone —
    // straight into Messenger, Viber or a group chat, no copy-paste.
    await Share.share({ message: `Join BuyNextDoor as a seller: ${url}` });
  }, [link.data]);

  const copy = useCallback(async () => {
    const url = link.data?.referral_link;
    if (!url) return;
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied', 'Your referral link is on the clipboard.');
  }, [link.data]);

  if (link.isPending || summary.isPending) return <LoadingState />;
  if (link.isError) return <ErrorState error={link.error} onRetry={() => void link.refetch()} />;

  const s = summary.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Referrals' }} />
      <Screen
        onRefresh={() => {
          void link.refetch();
          void summary.refetch();
          void downlines.refetch();
        }}
        refreshing={summary.isRefetching}
      >
        <View className="gap-4 p-4">
          <Card className="gap-3">
            <Text className="font-semibold">Your referral link</Text>
            <Text className="text-[13px] text-brand-700" selectable>
              {link.data.referral_link ?? '—'}
            </Text>
            {link.data.referral_code ? <Muted>Code {link.data.referral_code}</Muted> : null}
            <View className="flex-row gap-3">
              <Button label="Share" onPress={() => void share()} className="flex-1" />
              <Button
                label="Copy"
                variant="secondary"
                onPress={() => void copy()}
                className="flex-1"
              />
            </View>
          </Card>

          {s ? (
            <>
              <View className="flex-row gap-3">
                <Stat label="Downlines" value={formatCount(s.downlines.total)} />
                <Stat label="Active" value={formatCount(s.downlines.active)} />
              </View>
              <View className="flex-row gap-3">
                <Stat label="Team sales" value={formatMoney(s.sales.team_sales)} />
                <Stat label="Total earned" value={formatMoney(s.commissions.total_earned)} />
              </View>
            </>
          ) : null}

          <Card className="gap-3">
            <Text className="font-semibold">People you referred</Text>
            {downlines.isPending ? (
              <Muted>Loading…</Muted>
            ) : rows.length === 0 ? (
              <Muted>Nobody yet. Share your link to start earning.</Muted>
            ) : (
              rows.map((row) => (
                <View key={row.id} className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] font-medium">
                      {row.name ?? row.email ?? `#${row.id}`}
                    </Text>
                    <Muted className="text-[12px]">
                      {[
                        row.plan_name,
                        row.created_at ? `joined ${formatDate(row.created_at)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Muted>
                  </View>
                </View>
              ))
            )}
            {downlines.hasNextPage ? (
              <Button
                label="Load more"
                variant="ghost"
                onPress={() => void downlines.fetchNextPage()}
                loading={downlines.isFetchingNextPage}
              />
            ) : null}
          </Card>
        </View>
      </Screen>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 gap-1">
      <Muted>{label}</Muted>
      <Text className="text-xl font-semibold" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}
