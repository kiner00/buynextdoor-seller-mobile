import { View } from 'react-native';
import { Text } from './Text';
import { cn } from '../lib/cn';
import type { PaymentStatus, ShippingStatus } from '../api/domains/orders';

/**
 * Colour carries meaning here, so the label always spells it out too — a badge
 * that only differs by hue is unreadable to a colour-blind seller and invisible
 * in bright sunlight, which is where a lot of these get read.
 */
const SHIPPING: Record<ShippingStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  payment_confirmed: { label: 'Paid', className: 'bg-brand-100 text-brand-800' },
  for_pickup: { label: 'For pickup', className: 'bg-blue-100 text-blue-800' },
  in_transit: { label: 'In transit', className: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', className: 'bg-brand-100 text-brand-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  on_hold: { label: 'On hold', className: 'bg-neutral-200 text-neutral-700' },
  rts: { label: 'Return to sender', className: 'bg-red-100 text-red-800' },
  returned: { label: 'Returned', className: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', className: 'bg-neutral-200 text-neutral-700' },
};

const PAYMENT: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Unpaid', className: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paid', className: 'bg-brand-100 text-brand-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

export function ShippingStatusBadge({ status }: { status: ShippingStatus | null }) {
  // An unknown status still has to render: the API's enum can gain a value
  // before this app ships again, and a blank badge reads as "no status".
  const tone = status ? SHIPPING[status] : undefined;
  return <Badge label={tone?.label ?? status ?? 'Unknown'} className={tone?.className} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null }) {
  const tone = status ? PAYMENT[status] : undefined;
  return <Badge label={tone?.label ?? status ?? 'Unknown'} className={tone?.className} />;
}

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', className ?? 'bg-neutral-200')}>
      <Text className={cn('text-[12px] font-medium', className ?? 'text-neutral-700')}>
        {label}
      </Text>
    </View>
  );
}
