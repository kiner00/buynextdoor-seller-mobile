import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import {
  useInventory,
  useStockMovements,
  useUpdateInventorySettings,
  type InventoryRow,
  type StockMovement,
} from '../../src/api/domains/inventory';
import { ApiError, NetworkError } from '../../src/api/errors';
import { formatCount, formatDateTime, formatMoney } from '../../src/lib/format';
import { cn } from '../../src/lib/cn';
import {
  ActionSheet,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Muted,
  Text,
  type SheetAction,
} from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

type Tab = 'stock' | 'movements';

export default function InventoryScreen() {
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');

  return (
    <>
      <Stack.Screen options={{ title: 'Inventory' }} />
      <View className="flex-1 bg-neutral-50">
        <View className="gap-3 border-b border-neutral-200 bg-white px-4 py-3">
          <View className="flex-row gap-2">
            <Chip label="My stock" active={tab === 'stock'} onPress={() => setTab('stock')} />
            <Chip
              label="Movements"
              active={tab === 'movements'}
              onPress={() => setTab('movements')}
            />
          </View>
          {tab === 'stock' ? (
            <Field
              label=""
              value={search}
              onChangeText={setSearch}
              placeholder="Search name or SKU"
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => setSubmitted(search.trim())}
              className="gap-0"
            />
          ) : null}
        </View>
        {tab === 'stock' ? <StockList search={submitted} /> : <MovementList />}
      </View>
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
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

function StockList({ search }: { search: string }) {
  const inventory = useInventory(search);
  const items = inventory.data?.pages.flatMap((page) => page.data) ?? [];
  const loadMore = useCallback(() => {
    if (inventory.hasNextPage && !inventory.isFetchingNextPage) void inventory.fetchNextPage();
  }, [inventory]);

  if (inventory.isPending) return <LoadingState />;
  if (inventory.isError) {
    return <ErrorState error={inventory.error} onRetry={() => void inventory.refetch()} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(row) => String(row.id)}
      renderItem={({ item }) => <StockRow row={item} />}
      contentContainerClassName="gap-3 p-4"
      contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshing={inventory.isRefetching && !inventory.isFetchingNextPage}
      onRefresh={() => void inventory.refetch()}
      ListEmptyComponent={<EmptyState title="No stock" message="Stock you hold shows up here." />}
      ListFooterComponent={
        inventory.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color={colors.brand[600]} />
          </View>
        ) : null
      }
    />
  );
}

function StockRow({ row }: { row: InventoryRow }) {
  const [sheet, setSheet] = useState(false);
  const update = useUpdateInventorySettings();
  // qty is the reliable signal; stock_availability drifts.
  const low = row.qty <= row.low_stock_threshold;
  const out = row.qty <= 0;

  const setActivation = (activation_type: 'ONHAND' | 'DROPSHIP') => {
    update.mutate(
      { productId: row.product_id, activation_type },
      {
        onError: (error) =>
          Alert.alert(
            'Could not update',
            error instanceof NetworkError || error instanceof ApiError
              ? error.message
              : 'Something went wrong.',
          ),
      },
    );
  };

  const actions: SheetAction[] = [
    { label: 'Carry as on-hand', onPress: () => setActivation('ONHAND') },
    { label: 'Carry as dropship', onPress: () => setActivation('DROPSHIP') },
  ];

  return (
    <>
      <Pressable
        onPress={() => setSheet(true)}
        accessibilityRole="button"
        className="flex-row gap-3 rounded-lg border border-neutral-200 bg-white p-4 active:bg-neutral-100"
      >
        <Image
          source={row.product.image ? { uri: row.product.image } : undefined}
          style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.neutral[100] }}
          contentFit="cover"
        />
        <View className="flex-1 gap-1">
          <Text className="text-[14px] font-medium" numberOfLines={2}>
            {row.product.name}
          </Text>
          {row.product.sku ? <Muted className="text-[12px]">{row.product.sku}</Muted> : null}
          <View className="flex-row flex-wrap items-center gap-x-3">
            <Text
              className={cn(
                'text-[13px] font-semibold',
                out ? 'text-red-600' : low ? 'text-amber-700' : 'text-neutral-900',
              )}
            >
              {formatCount(row.qty)} in stock{out ? ' · out' : low ? ' · low' : ''}
            </Text>
            <Muted className="text-[12px]">sold {formatCount(row.sold)}</Muted>
            {row.hub_selling_price !== null ? (
              <Muted className="text-[12px]">· {formatMoney(row.hub_selling_price)}</Muted>
            ) : null}
            {row.activation_type ? (
              <Muted className="text-[12px]">· {row.activation_type.toLowerCase()}</Muted>
            ) : null}
          </View>
        </View>
      </Pressable>
      <ActionSheet
        visible={sheet}
        title={row.product.name}
        actions={actions}
        onClose={() => setSheet(false)}
      />
    </>
  );
}

function MovementList() {
  const movements = useStockMovements();
  const items = movements.data?.pages.flatMap((page) => page.data) ?? [];
  const loadMore = useCallback(() => {
    if (movements.hasNextPage && !movements.isFetchingNextPage) void movements.fetchNextPage();
  }, [movements]);

  if (movements.isPending) return <LoadingState />;
  if (movements.isError) {
    return <ErrorState error={movements.error} onRetry={() => void movements.refetch()} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(row) => String(row.id)}
      renderItem={({ item }) => <MovementRow row={item} />}
      contentContainerClassName="gap-3 p-4"
      contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshing={movements.isRefetching && !movements.isFetchingNextPage}
      onRefresh={() => void movements.refetch()}
      ListEmptyComponent={<EmptyState title="No movements yet" />}
      ListFooterComponent={
        movements.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator color={colors.brand[600]} />
          </View>
        ) : null
      }
    />
  );
}

function MovementRow({ row }: { row: StockMovement }) {
  const inbound = row.qty >= 0;
  return (
    <View className="rounded-lg border border-neutral-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[14px] font-medium" numberOfLines={2}>
            {row.product_name}
          </Text>
          <Muted className="text-[12px]">
            {row.type}
            {row.remarks ? ` · ${row.remarks}` : ''}
          </Muted>
          <Muted className="text-[12px]">{formatDateTime(row.created_at)}</Muted>
        </View>
        <Text
          className={cn('text-[15px] font-semibold', inbound ? 'text-green-700' : 'text-red-600')}
        >
          {inbound ? '+' : ''}
          {formatCount(row.qty)}
        </Text>
      </View>
    </View>
  );
}
