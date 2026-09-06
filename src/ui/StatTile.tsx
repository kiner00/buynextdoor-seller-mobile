import { View } from 'react-native';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { Card } from './Card';
import { Muted, Text } from './Text';
import { formatCount, formatMoney } from '../lib/format';
import type { Metric } from '../api/domains/seller';
import { colors } from '../theme/tokens';

/**
 * One dashboard number, with its movement against the previous period.
 *
 * The delta is the point of the tile — "₱48,200" alone doesn't say whether the
 * month is going well. Direction is carried by an arrow as well as colour, so
 * it still reads for a red/green colour-blind seller.
 */
export function StatTile({
  title,
  metric,
  money = false,
}: {
  title: string;
  metric: Metric;
  money?: boolean;
}) {
  const change = metric.percentageChange;
  const up = change > 0;
  const flat = change === 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="flex-1 gap-1">
      <Muted numberOfLines={1}>{title}</Muted>
      <Text className="text-xl font-semibold" numberOfLines={1} adjustsFontSizeToFit>
        {money ? formatMoney(metric.current) : formatCount(metric.current)}
      </Text>
      {flat ? (
        <Muted className="text-[12px]">No change</Muted>
      ) : (
        <View className="flex-row items-center gap-1">
          <Arrow size={13} color={up ? colors.success : colors.danger} />
          <Text className={up ? 'text-[12px] text-green-600' : 'text-[12px] text-red-600'}>
            {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
      )}
    </Card>
  );
}
