import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  PREFERENCE_LABELS,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../../src/api/domains/notifications';
import { ErrorState, LoadingState, Muted, Screen, Text } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

/**
 * Which events reach the phone. One switch per event type, for push only —
 * the inbox and email are the website's concern, and a seller muting their
 * phone should not accidentally mute their inbox (the channels are
 * independent on the API precisely so this is safe).
 */
export default function NotificationSettingsScreen() {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  if (preferences.isPending) return <LoadingState />;
  if (preferences.isError) {
    return <ErrorState error={preferences.error} onRetry={() => void preferences.refetch()} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Push notifications' }} />
      <Screen>
        <View className="gap-4 p-4">
          <Muted>Choose what buzzes your phone. Your inbox and email are unaffected.</Muted>
          <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {preferences.data.map((row, index) => (
              <View
                key={row.type}
                className={`flex-row items-center justify-between px-4 py-3 ${index === 0 ? '' : 'border-t border-neutral-200'}`}
              >
                <Text className="flex-1 text-[15px]">
                  {PREFERENCE_LABELS[row.type] ?? row.type}
                </Text>
                <Switch
                  value={row.push_enabled}
                  onValueChange={(push_enabled) => update.mutate({ type: row.type, push_enabled })}
                  trackColor={{ true: colors.brand[500], false: colors.neutral[300] }}
                  thumbColor={colors.white}
                  accessibilityLabel={PREFERENCE_LABELS[row.type] ?? row.type}
                />
              </View>
            ))}
          </View>
        </View>
      </Screen>
    </>
  );
}
