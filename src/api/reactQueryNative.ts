import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * React Query's focus tracking is written against `window`, which React Native
 * does not have — so without this, `refetchOnWindowFocus` never fires and a
 * seller who leaves the app for ten minutes comes back to stale numbers.
 * Mapping AppState onto it restores the intended behaviour.
 *
 * Call once, from the root layout.
 */
export function installReactQueryNativeBridges(): () => void {
  const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    // Web has its own focus handling and does not need the bridge.
    if (Platform.OS === 'web') return;
    focusManager.setFocused(state === 'active');
  });

  return () => subscription.remove();
}
