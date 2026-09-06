import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../src/api/queryClient';
import { installReactQueryNativeBridges } from '../src/api/reactQueryNative';
import { SessionProvider } from '../src/auth/session';

export default function RootLayout() {
  useEffect(() => installReactQueryNativeBridges(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Inside the query provider: signing out clears the cache. */}
          <SessionProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(portal)" />
            </Stack>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
