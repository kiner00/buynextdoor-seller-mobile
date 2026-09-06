import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Search, X } from 'lucide-react-native';
import {
  useActivateSku,
  useCatalogue,
  useDeactivateSku,
  type ActivationOption,
  type CatalogueRow,
} from '../../../src/api/domains/catalogue';
import { ApiError, NetworkError } from '../../../src/api/errors';
import { formatCount, formatMoney } from '../../../src/lib/format';
import { cn } from '../../../src/lib/cn';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Muted,
  Text,
} from '../../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../../src/theme/tokens';

type Filter = 'all' | 'owned' | 'dropship';

export default function CatalogueScreen() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const catalogue = useCatalogue({
    ...(submitted ? { search: submitted } : {}),
    ...(filter === 'owned' ? { owned: true } : {}),
    ...(filter === 'dropship' ? { activationType: 'DROPSHIP' as const } : {}),
  });

  const items = catalogue.data?.pages.flatMap((page) => page.data) ?? [];
  // Every page carries the same quota; the first is as good as the last.
  const quota = catalogue.data?.pages[0]?.sku_limit;

  const loadMore = useCallback(() => {
    if (catalogue.hasNextPage && !catalogue.isFetchingNextPage) void catalogue.fetchNextPage();
  }, [catalogue]);

  return (
    <View className="flex-1 bg-neutral-50">
      <View className="gap-3 border-b border-neutral-200 bg-white px-4 pb-3 pt-3">
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
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
          </View>
          {search.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearch('');
                setSubmitted('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
              className="items-center justify-center"
            >
              <X size={20} color={colors.neutral[500]} />
            </Pressable>
          ) : (
            <View
              style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
              className="items-center justify-center"
            >
              <Search size={20} color={colors.neutral[400]} />
            </View>
          )}
        </View>

        <View className="flex-row gap-2">
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Mine" active={filter === 'owned'} onPress={() => setFilter('owned')} />
          <Chip
            label="Dropship"
            active={filter === 'dropship'}
            onPress={() => setFilter('dropship')}
          />
        </View>

        {quota ? (
          <Muted className="text-[12px]">
            {formatCount(quota.current)} of{' '}
            {quota.limit === null ? 'unlimited' : formatCount(quota.limit)} SKUs activated
            {quota.at_warning ? ' · near your plan limit' : ''}
          </Muted>
        ) : null}
      </View>

      {catalogue.isPending ? (
        <LoadingState label="Loading catalogue…" />
      ) : catalogue.isError ? (
        <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(row) => String(row.id)}
          renderItem={({ item }) => <ProductCard row={item} />}
          contentContainerClassName="gap-3 p-4"
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={catalogue.isRefetching && !catalogue.isFetchingNextPage}
          onRefresh={() => void catalogue.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="Nothing here"
              message={
                submitted
                  ? `No products match “${submitted}”.`
                  : filter === 'owned'
                    ? "You haven't activated any SKUs yet."
                    : 'No products in this view.'
              }
            />
          }
          ListFooterComponent={
            catalogue.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={colors.brand[600]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
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

function ProductCard({ row }: { row: CatalogueRow }) {
  const activate = useActivateSku();
  const deactivate = useDeactivateSku();
  const busy = activate.isPending || deactivate.isPending;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      Alert.alert('Done', success);
    } catch (error) {
      Alert.alert(
        'Could not update this product',
        error instanceof NetworkError
          ? error.message
          : error instanceof ApiError
            ? (error.firstFieldError ?? error.message)
            : 'Something went wrong.',
      );
    }
  };

  // The seller's own price ladder is the interesting number, but which row is
  // theirs depends on their plan — which this screen does not know. The
  // platform price is what the card commits to; the ladder is shown as a range
  // so the saving is visible without claiming a tier that may not be theirs.
  const ladder = row.plan_prices.map((entry) => entry.price).filter((n) => Number.isFinite(n));
  const best = ladder.length > 0 ? Math.min(...ladder) : null;

  return (
    <Card className="gap-3">
      <View className="flex-row gap-3">
        <Image
          source={row.image ? { uri: row.image } : undefined}
          style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: colors.neutral[100] }}
          contentFit="cover"
          transition={120}
        />
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-medium" numberOfLines={2}>
            {row.name}
          </Text>
          {row.sku ? <Muted className="text-[12px]">{row.sku}</Muted> : null}
          <View className="flex-row items-baseline gap-2">
            <Text className="text-[16px] font-semibold">{formatMoney(row.price)}</Text>
            {best !== null && best < row.price ? (
              <Muted className="text-[12px]">from {formatMoney(best)} on a plan</Muted>
            ) : null}
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Muted className="text-[12px]">BND stock {formatCount(row.available_to_sell)}</Muted>
        {row.owned_qty > 0 ? (
          <Muted className="text-[12px]">· you hold {formatCount(row.owned_qty)}</Muted>
        ) : null}
        {row.current_activation ? (
          <View className="rounded-full bg-brand-100 px-2 py-0.5">
            <Text className="text-[11px] font-medium text-brand-800">
              {row.current_activation === 'ONHAND' ? 'On-hand' : 'Dropship'}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        {row.activation_options.map((option) => (
          <OptionButton
            key={option.type}
            option={option}
            busy={busy}
            onActivate={() =>
              void run(
                () =>
                  activate.mutateAsync({
                    productId: row.id,
                    activationType: option.type as 'DROPSHIP',
                  }),
                `${row.name} is now on your storefront.`,
              )
            }
            onDeactivate={() =>
              void run(
                () => deactivate.mutateAsync({ productId: row.id }),
                `${row.name} removed from your storefront.`,
              )
            }
          />
        ))}
      </View>
    </Card>
  );
}

function OptionButton({
  option,
  busy,
  onActivate,
  onDeactivate,
}: {
  option: ActivationOption;
  busy: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  // Already carrying it: the useful action is removing it.
  if (option.is_current) {
    return (
      <Button
        label={`Remove ${option.label.toLowerCase()}`}
        variant="secondary"
        onPress={onDeactivate}
        loading={busy}
      />
    );
  }

  // Not allowed: show the backend's own explanation rather than a dead button
  // with no reason, and never re-derive the rule here.
  if (!option.allowed) {
    return (
      <View className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <Text className="text-[13px] font-medium text-neutral-500">{option.label}</Text>
        {option.reason ? <Muted className="mt-0.5 text-[12px]">{option.reason}</Muted> : null}
      </View>
    );
  }

  // 'buy' needs a purchase order, which is the Create order screen — not a
  // single POST, so it must not look like one.
  if (option.action === 'buy') {
    return (
      <View className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <Text className="text-[13px] font-medium text-neutral-700">{option.label}</Text>
        <Muted className="mt-0.5 text-[12px]">
          Buy stock to carry this. Ordering isn&apos;t in the app yet — use the seller website.
        </Muted>
      </View>
    );
  }

  return (
    <Button label={`Offer as ${option.label.toLowerCase()}`} onPress={onActivate} loading={busy} />
  );
}
