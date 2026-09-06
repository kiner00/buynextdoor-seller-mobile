import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { devicesApi } from '../api/domains/devices';
import { DEVICE_NAME } from '../api/config';

/**
 * Getting a push token, and telling the API about it.
 *
 * Everything here is best-effort. A seller who declines the permission, or is
 * on a simulator, or is offline at the moment we ask, must still get a working
 * app — push is an addition to the product, never a gate on it. So every path
 * out of here resolves; none of it throws into the sign-in flow.
 */

/** Foreground behaviour: show the banner rather than swallowing it silently. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android needs a channel before anything will make a sound; without one the
 * notification arrives silently, which for "you have a new order" is the same
 * as not arriving.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Orders and alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * The EAS project id, which Expo's push service needs to mint a token for a
 * standalone build. Present in EAS builds and absent in bare Expo Go, where
 * the classic token path still works.
 */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** @returns the Expo push token, or null when we cannot or may not have one. */
export async function getPushToken(): Promise<string | null> {
  // A simulator has no push service to register with, and asking throws.
  if (!Device.isDevice) return null;

  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    // Only ask if we have not been refused before — iOS shows the prompt once
    // ever, so a re-ask is a no-op and re-asking on every launch just burns it.
    if (!granted && existing.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }

    if (!granted) return null;

    const id = projectId();
    const token = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);

    return token.data;
  } catch {
    // No network, no Play Services, a misconfigured project — none of which
    // should stop someone using the app.
    return null;
  }
}

/** Registers this install for push. Safe to call on every sign-in. */
export async function registerForPush(): Promise<string | null> {
  const token = await getPushToken();
  if (!token) return null;

  try {
    await devicesApi.register({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: DEVICE_NAME,
    });
    return token;
  } catch {
    // The API is the one place this can fail without the seller noticing, so
    // it fails quietly and gets retried on the next sign-in.
    return null;
  }
}

/**
 * Stops push to this install.
 *
 * Called before the token is cleared on sign-out, and deliberately awaited:
 * the whole point is that the next person to sign in on this phone does not
 * get the last one's orders.
 */
export async function unregisterForPush(token: string | null): Promise<void> {
  if (!token) return;

  try {
    await devicesApi.unregister(token);
  } catch {
    // Offline sign-out. The row is left behind, and the API drops it the first
    // time Expo reports the install as gone.
  }
}
