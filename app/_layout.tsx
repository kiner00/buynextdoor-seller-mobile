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
import { useNotificationRouting } from '../src/notifications/useNotificationRouting';

export default function RootLayout() {
  useEffect(() => installReactQueryNativeBridges(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Inside the query provider: signing out clears the cache. */}
          <SessionProvider>
            <StatusBar style="dark" />
            {/* Inside the provider: routing a tapped notification has to wait
                for the session, or it races the redirect to /login. */}
            <Navigation />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigation() {
  useNotificationRouting();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(portal)" />
    </Stack>
  );
}
