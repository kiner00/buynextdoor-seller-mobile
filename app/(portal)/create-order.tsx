import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus, Search } from 'lucide-react-native';
import {
  useCreateManualOrder,
  useSellableProducts,
  type PaymentMethod,
  type PickerProduct,
  type ShippingMethod,
} from '../../src/api/domains/manualOrders';
import { ApiError, NetworkError } from '../../src/api/errors';
import { formatMoney } from '../../src/lib/format';
import { cn } from '../../src/lib/cn';
import { Button, Card, Field, Muted, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

type Line = { product: PickerProduct; qty: number };
type Step = 'items' | 'customer';

const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: 'COP', label: 'Cash on pickup' },
  { value: 'COD', label: 'Cash on delivery' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

/**
 * Ringing up a walk-in customer, in two steps: what they are buying, then who
 * they are. A seller sets no prices here — the API prices at their own selling
 * price, and negotiating is an admin's job.
 */
export default function CreateOrderScreen() {
  const [step, setStep] = useState<Step>('items');
  const [lines, setLines] = useState<Line[]>([]);
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.price * line.qty, 0),
    [lines],
  );

  const setQty = (product: PickerProduct, qty: number) =>
    setLines((current) => {
      const rest = current.filter((line) => line.product.id !== product.id);
      return qty > 0 ? [...rest, { product, qty }] : rest;
    });

  return (
    <>
      <Stack.Screen options={{ title: step === 'items' ? 'Create order' : 'Customer' }} />
      {step === 'items' ? (
        <ItemsStep lines={lines} setQty={setQty} total={total} onNext={() => setStep('customer')} />
      ) : (
        <CustomerStep lines={lines} total={total} onBack={() => setStep('items')} />
      )}
    </>
  );
}

function ItemsStep({
  lines,
  setQty,
  total,
  onNext,
}: {
  lines: Line[];
  setQty: (product: PickerProduct, qty: number) => void;
  total: number;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const products = useSellableProducts(submitted);
  const rows = products.data?.pages.flatMap((page) => page.data) ?? [];
  const qtyOf = (id: number) => lines.find((line) => line.product.id === id)?.qty ?? 0;
  const loadMore = useCallback(() => {
    if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
  }, [products]);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="flex-row items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3">
        <View className="flex-1">
          <Field
            label=""
            value={search}
            onChangeText={setSearch}
            placeholder="Search your products"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => setSubmitted(search.trim())}
            className="gap-0"
          />
        </View>
        <Search size={20} color={colors.neutral[400]} />
      </View>
      {products.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => String(row.id)}
          renderItem={({ item }) => (
            <ProductLine product={item} qty={qtyOf(item.id)} setQty={setQty} />
          )}
          contentContainerClassName="gap-2 p-4"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Muted className="p-4 text-center">No products match.</Muted>}
        />
      )}
      <View
        className="border-t border-neutral-200 bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-3 flex-row items-baseline justify-between">
          <Muted>
            {count} item{count === 1 ? '' : 's'}
          </Muted>
          <Text className="text-lg font-semibold">{formatMoney(total)}</Text>
        </View>
        <Button label="Next: customer" onPress={onNext} disabled={lines.length === 0} />
      </View>
    </View>
  );
}

function ProductLine({
  product,
  qty,
  setQty,
}: {
  product: PickerProduct;
  qty: number;
  setQty: (p: PickerProduct, q: number) => void;
}) {
  const stock = product.hub_stock_qty ?? product.stock_qty;
  return (
    <Card className={cn('flex-row items-center gap-3', qty > 0 && 'border-brand-300 bg-brand-50')}>
      <View className="flex-1">
        <Text className="text-[14px] font-medium" numberOfLines={2}>
          {product.name}
        </Text>
        <Muted className="text-[12px]">
          {formatMoney(product.price)}
          {stock !== null ? ` · ${stock} in stock` : ''}
        </Muted>
      </View>
      <View className="flex-row items-center gap-2">
        <Stepper
          icon={<Minus size={16} color={colors.neutral[700]} />}
          onPress={() => setQty(product, qty - 1)}
          disabled={qty === 0}
        />
        <Text className="w-6 text-center font-semibold">{qty}</Text>
        <Stepper
          icon={<Plus size={16} color={colors.neutral[700]} />}
          onPress={() => setQty(product, qty + 1)}
        />
      </View>
    </Card>
  );
}

function Stepper({
  icon,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={cn(
        'items-center justify-center rounded-full border border-neutral-300 bg-white',
        disabled && 'opacity-40',
      )}
      style={{ width: MIN_TOUCH_TARGET - 8, height: MIN_TOUCH_TARGET - 8 }}
    >
      {icon}
    </Pressable>
  );
}

function CustomerStep({
  lines,
  total,
  onBack,
}: {
  lines: Line[];
  total: number;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const create = useCreateManualOrder();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [shipping, setShipping] = useState<ShippingMethod>('PICKUP');
  const [payment, setPayment] = useState<PaymentMethod>('COP');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');

  const delivery = shipping === 'DELIVERY';
  const canSubmit =
    name.trim().length > 0 &&
    (!delivery || (mobile.trim() && address.trim() && city.trim())) &&
    !create.isPending;

  const submit = async () => {
    try {
      const result = await create.mutateAsync({
        customer_name: name.trim(),
        ...(email.trim() ? { customer_email: email.trim() } : {}),
        order_items: lines.map((line) => ({ product_id: line.product.id, qty: line.qty })),
        payment_method: payment,
        shipping_method: shipping,
        ...(note.trim() ? { shipping_note: note.trim() } : {}),
        ...(delivery
          ? {
              customer_address: {
                mobile_number: mobile.trim(),
                address_one: address.trim(),
                city: city.trim(),
                address: `${address.trim()}, ${city.trim()}`,
              },
            }
          : {}),
      });
      const reference = result.reference_number ?? (result.id ? String(result.id) : null);
      Alert.alert('Order placed', reference ? `Reference ${reference}` : 'The order is in.', [
        {
          text: 'View order',
          onPress: () =>
            reference
              ? router.replace({ pathname: '/order/[reference]', params: { reference } })
              : router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not place the order',
        error instanceof ApiError
          ? (error.firstFieldError ?? error.message)
          : error instanceof NetworkError
            ? error.message
            : 'Something went wrong.',
      );
    }
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <FlatList
        data={[0]}
        keyExtractor={() => 'form'}
        keyboardShouldPersistTaps="handled"
        renderItem={() => (
          <View className="gap-4 p-4">
            <Field label="Customer name" value={name} onChangeText={setName} />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Optional"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              Fulfilment
            </Text>
            <View className="flex-row gap-2">
              <Chip
                label="Pickup"
                active={!delivery}
                onPress={() => {
                  setShipping('PICKUP');
                  setPayment('COP');
                }}
              />
              <Chip
                label="Delivery"
                active={delivery}
                onPress={() => {
                  setShipping('DELIVERY');
                  setPayment('COD');
                }}
              />
            </View>
            {delivery ? (
              <>
                <Field
                  label="Mobile number"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                />
                <Field label="Street address" value={address} onChangeText={setAddress} />
                <Field label="City" value={city} onChangeText={setCity} />
              </>
            ) : null}

            <Text className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              Payment
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PAYMENTS.filter((p) => (delivery ? p.value !== 'COP' : p.value !== 'COD')).map(
                (p) => (
                  <Chip
                    key={p.value}
                    label={p.label}
                    active={payment === p.value}
                    onPress={() => setPayment(p.value)}
                  />
                ),
              )}
            </View>
            <Field
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Optional"
              multiline
              numberOfLines={2}
            />

            <Card className="gap-1">
              {lines.map((line) => (
                <View key={line.product.id} className="flex-row justify-between">
                  <Text className="flex-1 text-[14px]" numberOfLines={1}>
                    {line.qty} × {line.product.name}
                  </Text>
                  <Text className="text-[14px]">{formatMoney(line.product.price * line.qty)}</Text>
                </View>
              ))}
              <View className="mt-2 flex-row justify-between border-t border-neutral-200 pt-2">
                <Text className="font-semibold">Total</Text>
                <Text className="font-semibold">{formatMoney(total)}</Text>
              </View>
            </Card>
          </View>
        )}
      />
      <View
        className="flex-row gap-3 border-t border-neutral-200 bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button label="Back" variant="secondary" onPress={onBack} disabled={create.isPending} />
        <Button
          label="Place order"
          onPress={() => void submit()}
          loading={create.isPending}
          disabled={!canSubmit}
          className="flex-1"
        />
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      className={cn(
        'justify-center rounded-full border px-3.5',
        active ? 'border-brand-600 bg-brand-50' : 'border-neutral-300 bg-white',
      )}
      style={{ minHeight: MIN_TOUCH_TARGET - 8 }}
    >
      <Text
        className={cn('text-[14px]', active ? 'font-semibold text-brand-800' : 'text-neutral-700')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
