import { useEffect, useState } from 'react';
import { View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Text } from './Text';

/**
 * Says so when the phone is offline. Without this, a request that never
 * arrives just spins, and a seller on patchy mobile data blames the app.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is null while NetInfo is still deciding; only a
      // definite `false` should show the banner.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View className="bg-neutral-800 px-4 py-1.5">
      <Text className="text-center text-[12px] font-medium text-white">
        You&apos;re offline — showing what was last loaded
      </Text>
    </View>
  );
}
