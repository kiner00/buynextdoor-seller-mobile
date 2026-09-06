import { Alert, Pressable, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { useBranches, useDeleteBranch, type Branch } from '../../src/api/domains/branches';
import { Button, EmptyState, ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';
import { MIN_TOUCH_TARGET, colors } from '../../src/theme/tokens';

export default function BranchesScreen() {
  const branches = useBranches();
  const remove = useDeleteBranch();

  if (branches.isPending) return <LoadingState />;
  if (branches.isError)
    return <ErrorState error={branches.error} onRetry={() => void branches.refetch()} />;

  const confirmDelete = (branch: Branch) =>
    Alert.alert(`Delete ${branch.name}?`, 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(branch.id) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Branches' }} />
      <Screen onRefresh={() => void branches.refetch()} refreshing={branches.isRefetching}>
        <View className="gap-4 p-4">
          <Button label="Add branch" onPress={() => router.push('/branch/new')} />
          {branches.data.length === 0 ? (
            <EmptyState title="No branches" />
          ) : (
            <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {branches.data.map((branch, index) => (
                <Link
                  key={branch.id}
                  href={{ pathname: '/branch/[id]', params: { id: String(branch.id) } }}
                  asChild
                >
                  <Pressable
                    onLongPress={() => !branch.is_main && confirmDelete(branch)}
                    className={`flex-row items-center gap-3 px-4 active:bg-neutral-100 ${index === 0 ? '' : 'border-t border-neutral-200'}`}
                    style={{ minHeight: MIN_TOUCH_TARGET + 16 }}
                  >
                    <MapPin size={20} color={colors.neutral[600]} />
                    <View className="flex-1 py-2">
                      <Text className="text-[15px] font-medium">
                        {branch.name}
                        {branch.is_main ? <Muted className="text-[12px]"> · main</Muted> : null}
                      </Text>
                      <Muted className="text-[12px]" numberOfLines={2}>
                        {branch.full_address ??
                          [branch.address_one, branch.city].filter(Boolean).join(', ')}
                      </Muted>
                    </View>
                    <ChevronRight size={18} color={colors.neutral[400]} />
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
          <Muted>Long-press a branch to delete it. The main branch cannot be deleted.</Muted>
        </View>
      </Screen>
    </>
  );
}
