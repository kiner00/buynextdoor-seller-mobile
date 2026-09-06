import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import {
  useActivateSku,
  useDeactivateSku,
  type ActivationOption,
  type CatalogueRow,
} from '../../api/domains/catalogue';
import { ApiError, NetworkError } from '../../api/errors';
import { formatCount, formatMoney } from '../../lib/format';
import { Button, Card, Muted, Text } from '../../ui';
import { colors } from '../../theme/tokens';

/**
 * One catalogue SKU with its activation controls. Shared by the Catalogue tab
 * and the Activated screen, which is the same list filtered to what the seller
 * already carries.
 */
export function ProductCard({ row }: { row: CatalogueRow }) {
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

  // Which ladder row is the seller's depends on their plan, which this card
  // does not know. The platform price is what it commits to; the best plan
  // price is shown as a range so the saving is visible without claiming a tier.
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
                () => activate.mutateAsync({ productId: row.id, activationType: 'DROPSHIP' }),
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
  // Closed door: the backend's own sentence, never a rule re-derived here.
  if (!option.allowed) {
    return (
      <View className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <Text className="text-[13px] font-medium text-neutral-500">{option.label}</Text>
        {option.reason ? <Muted className="mt-0.5 text-[12px]">{option.reason}</Muted> : null}
      </View>
    );
  }
  // 'buy' needs a purchase order — a whole screen, not a single POST.
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
