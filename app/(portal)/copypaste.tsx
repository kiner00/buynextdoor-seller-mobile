import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { usePostingItems, type PostingRow } from '../../src/api/domains/postingMaterials';
import { formatCount } from '../../src/lib/format';
import { EmptyState, ErrorState, Field, LoadingState, Muted, Text } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

/** Ready-made posts for each product — pick one, share it. */
export default function CopypasteScreen() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const list = usePostingItems(submitted);
  const rows = list.data?.pages.flatMap((page) => page.data) ?? [];
  const loadMore = useCallback(() => {
    if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
  }, [list]);

  return (
    <>
      <Stack.Screen options={{ title: 'Copypaste posting' }} />
      <View className="flex-1 bg-neutral-50">
        <View className="border-b border-neutral-200 bg-white px-4 py-3">
          <Field
            label=""
            value={search}
            onChangeText={setSearch}
            placeholder="Search products"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => setSubmitted(search.trim())}
            className="gap-0"
          />
        </View>
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.item.id)}
            renderItem={({ item }) => <Row row={item} />}
            contentContainerClassName="gap-3 p-4"
            contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            ListEmptyComponent={<EmptyState title="No posting materials yet" />}
            ListFooterComponent={
              list.isFetchingNextPage ? (
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

function Row({ row }: { row: PostingRow }) {
  const { item } = row;
  return (
    <Link
      href={{ pathname: '/copypaste/[productId]', params: { productId: String(item.id) } }}
      asChild
    >
      <Pressable className="flex-row items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 active:bg-neutral-100">
        <Image
          source={item.image ? { uri: item.image } : undefined}
          style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.neutral[100] }}
          contentFit="cover"
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-[14px] font-medium" numberOfLines={2}>
            {item.name}
          </Text>
          <Muted className="text-[12px]">
            {formatCount(item.published_count)} post{item.published_count === 1 ? '' : 's'}
            {item.has_new ? ' · new' : ''}
            {row.is_activated ? ' · in your store' : ''}
          </Muted>
        </View>
        <ChevronRight size={18} color={colors.neutral[400]} />
      </Pressable>
    </Link>
  );
}
