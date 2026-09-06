import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSession } from '../auth/session';

/**
 * Where a tapped notification lands.
 *
 * A push that opens the app to the dashboard has wasted the tap — the seller
 * still has to go find the order it was about. The payload carries `type` and
 * the order's reference precisely so this can be answered without a lookup.
 */
function destinationFor(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  const type = typeof data.type === 'string' ? data.type : null;
  const reference =
    typeof data.reference_number === 'string' && data.reference_number.length > 0
      ? data.reference_number
      : typeof data.order_id === 'number'
        ? String(data.order_id)
        : null;

  switch (type) {
    case 'new_order':
    case 'order_cancelled':
    case 'order_completed':
    case 'order_expired':
    case 'order_ready_for_pickup':
    case 'order_in_transit':
      return reference ? `/order/${encodeURIComponent(reference)}` : '/orders';
    case 'commission_earned':
    case 'commission_voided':
      return '/wallet';
    case 'low_stock':
    case 'out_of_stock':
      return '/inventory';
    case 'support_message':
      return '/messages';
    default:
      // An unknown type still opens the app; it just does not guess a screen.
      return null;
  }
}

/**
 * Handles both ways a notification opens a screen: tapped while the app is
 * running, and tapped to launch it from cold. The cold-start case is the one
 * that is easy to miss and the more common one for "you have a new order".
 *
 * Mount once, from the root layout.
 */
export function useNotificationRouting(): void {
  const { status } = useSession();
  // A cold-start notification arrives before the session is known. It is held
  // here and followed once the gate says we are signed in, otherwise the
  // navigation races the redirect to /login and loses.
  const pending = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      const target = destinationFor(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (target) pending.current = target;
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = destinationFor(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
      if (!target) return;
      pending.current = target;
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !pending.current) return;

    const target = pending.current;
    pending.current = null;
    router.push(target as never);
  }, [status]);
}
