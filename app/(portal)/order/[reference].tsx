import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCancelOrder,
  useManageOrderStatus,
  useMarkOrderComplete,
  useMarkOrderPaid,
  useOrder,
  type OrderItem,
  type ShippingStatus,
} from '../../../src/api/domains/orders';
import { ApiError, NetworkError } from '../../../src/api/errors';
import { formatDateTime, formatMoney } from '../../../src/lib/format';
import {
  ActionSheet,
  Button,
  Card,
  ErrorState,
  Heading,
  LoadingState,
  Muted,
  PaymentStatusBadge,
  Screen,
  ShippingStatusBadge,
  Text,
  type SheetAction,
} from '../../../src/ui';
import { colors } from '../../../src/theme/tokens';

const STATUS_LABELS: { value: ShippingStatus; label: string }[] = [
  { value: 'for_pickup', label: 'Mark for pickup' },
  { value: 'in_transit', label: 'Mark in transit' },
  { value: 'delivered', label: 'Mark delivered' },
  { value: 'on_hold', label: 'Put on hold' },
];

/**
 * The step a seller most likely wants next, given where the order is.
 *
 * Surfacing one primary action is the whole difference between this and the
 * web's row of four equal buttons: on a phone the common path should be one
 * tap without reading, and everything else can live behind "Other actions".
 */
function suggestedNext(status: ShippingStatus | null, isPickup: boolean): ShippingStatus | null {
  switch (status) {
    case 'pending':
    case 'payment_confirmed':
      return isPickup ? 'for_pickup' : 'in_transit';
    case 'for_pickup':
    case 'in_transit':
      return 'delivered';
    default:
      // Delivered, cancelled, returned and the rest are ends of the line —
      // nothing to suggest, and guessing would invite a mis-tap.
      return null;
  }
}

export default function OrderDetailScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const idOrReference = reference ?? '';
  const order = useOrder(idOrReference);

  const [sheetOpen, setSheetOpen] = useState(false);

  const manageStatus = useManageOrderStatus(idOrReference);
  const markPaid = useMarkOrderPaid(idOrReference);
  const markComplete = useMarkOrderComplete(idOrReference);
  const cancel = useCancelOrder(idOrReference);

  const busy =
    manageStatus.isPending || markPaid.isPending || markComplete.isPending || cancel.isPending;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      Alert.alert('Done', success);
    } catch (error) {
      Alert.alert(
        'Could not update the order',
        error instanceof NetworkError
          ? error.message
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong.',
      );
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel this order?',
      'This cannot be undone, and the customer will see it as cancelled.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: () => void run(() => cancel.mutateAsync(undefined), 'Order cancelled.'),
        },
      ],
    );
  };

  if (order.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order' }} />
        <LoadingState label="Loading order…" />
      </>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <>
        <Stack.Screen options={{ title: 'Order' }} />
        {notFound ? (
          <ErrorState error={new Error(`No order found for ${idOrReference}.`)} />
        ) : (
          <ErrorState error={order.error} onRetry={() => void order.refetch()} />
        )}
      </>
    );
  }

  const { summary, items, statuses, address, voucher } = order.data;
  const isPickup = summary.shipping_method === 'PICKUP';
  const next = suggestedNext(summary.shipping_status, isPickup);
  const nextLabel = STATUS_LABELS.find((entry) => entry.value === next)?.label;

  const sheetActions: SheetAction[] = [
    ...STATUS_LABELS.filter((entry) => entry.value !== summary.shipping_status).map((entry) => ({
      label: entry.label,
      onPress: () =>
        void run(
          () => manageStatus.mutateAsync({ status: entry.value }),
          `Status updated to ${entry.label.replace('Mark ', '').replace('Put ', '')}.`,
        ),
    })),
    ...(summary.payment_status === 'PAID'
      ? []
      : [
          {
            label: 'Mark as paid',
            onPress: () => void run(() => markPaid.mutateAsync(undefined), 'Order marked as paid.'),
          },
        ]),
    {
      label: 'Mark as complete',
      onPress: () =>
        void run(() => markComplete.mutateAsync(undefined), 'Order marked as complete.'),
    },
    { label: 'Cancel order', onPress: confirmCancel, destructive: true },
  ];

  return (
    <>
      <Stack.Screen options={{ title: summary.reference_number ?? `Order #${summary.id}` }} />

      <Screen onRefresh={() => void order.refetch()} refreshing={order.isRefetching}>
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
            <View className="flex-row flex-wrap items-center gap-2">
              <PaymentStatusBadge status={summary.payment_status} />
              <Muted>
                {summary.payment_method ?? '—'} · {isPickup ? 'Pickup' : 'Delivery'}
              </Muted>
            </View>
          </Card>

          <Card className="gap-3">
            <Text className="font-semibold">Items</Text>
            <View className="gap-2">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </View>
            <View className="gap-1 border-t border-neutral-200 pt-3">
              <Total label="Subtotal" value={summary.sub_total} />
              {summary.discount_amount > 0 ? (
                <Total label="Discount" value={-summary.discount_amount} />
              ) : null}
              {summary.shipping_fee > 0 ? (
                <Total label="Shipping" value={summary.shipping_fee} />
              ) : null}
              <View className="flex-row items-baseline justify-between pt-1">
                <Text className="font-semibold">Total</Text>
                <Text className="text-lg font-semibold">{formatMoney(summary.grand_total)}</Text>
              </View>
            </View>
          </Card>

          {address ? (
            <Card className="gap-1">
              <Text className="font-semibold">{isPickup ? 'Customer' : 'Delivery address'}</Text>
              {address.address ? <Text>{address.address}</Text> : null}
              {address.mobile_number ? <Muted>{address.mobile_number}</Muted> : null}
            </Card>
          ) : null}

          {voucher ? (
            <Card className="gap-1">
              <Text className="font-semibold">Voucher</Text>
              <Text className="font-mono text-[13px]">{voucher.code}</Text>
              {voucher.description ? <Muted>{voucher.description}</Muted> : null}
            </Card>
          ) : null}

          <Card className="gap-3">
            <Text className="font-semibold">Status timeline</Text>
            {statuses.length === 0 ? (
              <Muted>No updates yet.</Muted>
            ) : (
              <View className="gap-3">
                {statuses.map((entry, index) => (
                  <View key={entry.id} className="flex-row gap-3">
                    <View
                      className="mt-1.5 size-2.5 rounded-full"
                      style={{
                        backgroundColor: index === 0 ? colors.brand[600] : colors.neutral[300],
                      }}
                    />
                    <View className="flex-1 gap-0.5">
                      <Text className="text-[14px] font-medium">
                        {entry.label ?? entry.status ?? 'Updated'}
                      </Text>
                      <Muted className="text-[12px]">{formatDateTime(entry.created_at)}</Muted>
                      {entry.comment ? (
                        <Muted className="text-[12px]">{entry.comment}</Muted>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </Screen>

      <ActionBar
        primaryLabel={nextLabel}
        onPrimary={
          next
            ? () =>
                void run(
                  () => manageStatus.mutateAsync({ status: next }),
                  `Status updated to ${nextLabel?.replace('Mark ', '')}.`,
                )
            : undefined
        }
        onMore={() => setSheetOpen(true)}
        busy={busy}
      />

      <ActionSheet
        visible={sheetOpen}
        title="Update this order"
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

/**
 * Pinned to the bottom rather than scrolled to: the actions are why a seller
 * opened the order, and an order with many items would otherwise bury them.
 */
function ActionBar({
  primaryLabel,
  onPrimary,
  onMore,
  busy,
}: {
  primaryLabel?: string;
  onPrimary?: () => void;
  onMore: () => void;
  busy: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row gap-3 border-t border-neutral-200 bg-white px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      {primaryLabel && onPrimary ? (
        <Button label={primaryLabel} onPress={onPrimary} loading={busy} className="flex-1" />
      ) : null}
      <Button
        label="Other actions"
        variant="secondary"
        onPress={onMore}
        disabled={busy}
        className={primaryLabel ? '' : 'flex-1'}
      />
    </View>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-[14px]">
          {item.qty} × {item.name ?? `#${item.product_id}`}
        </Text>
        {item.sku ? <Muted className="text-[12px]">{item.sku}</Muted> : null}
      </View>
      <Text className="text-[14px]">{formatMoney(item.discounted_price)}</Text>
    </View>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Muted>{label}</Muted>
      <Text className="text-[14px]">{formatMoney(value)}</Text>
    </View>
  );
}
