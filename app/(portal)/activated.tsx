import { useCallback } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { Stack } from 'expo-router';
import { useCatalogue } from '../../src/api/domains/catalogue';
import { ProductCard } from '../../src/features/catalogue/ProductCard';
import { formatCount } from '../../src/lib/format';
import { EmptyState, ErrorState, LoadingState, Muted } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

/** The catalogue, filtered to what this seller already carries. */
export default function ActivatedScreen() {
  const catalogue = useCatalogue({ owned: true });
  const items = catalogue.data?.pages.flatMap((page) => page.data) ?? [];
  const quota = catalogue.data?.pages[0]?.sku_limit;
  const loadMore = useCallback(() => {
    if (catalogue.hasNextPage && !catalogue.isFetchingNextPage) void catalogue.fetchNextPage();
  }, [catalogue]);

  return (
    <>
      <Stack.Screen options={{ title: 'Activated products' }} />
      <View className="flex-1 bg-neutral-50">
        {quota ? (
          <View className="border-b border-neutral-200 bg-white px-4 py-3">
            <Muted className="text-[12px]">
              {formatCount(quota.current)} of{' '}
              {quota.limit === null ? 'unlimited' : formatCount(quota.limit)} SKUs activated
            </Muted>
          </View>
        ) : null}
        {catalogue.isPending ? (
          <LoadingState />
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
                title="Nothing activated yet"
                message="Activate a SKU from the Catalogue tab and it shows up here."
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
    </>
  );
}
