import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useCatalogue } from '../../../src/api/domains/catalogue';
import { ProductCard } from '../../../src/features/catalogue/ProductCard';
import { formatCount } from '../../../src/lib/format';
import { cn } from '../../../src/lib/cn';
import { EmptyState, ErrorState, Field, LoadingState, Muted, Text } from '../../../src/ui';
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
