import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/auth/session';
import { LoadingState } from '../../src/ui';
import { colors } from '../../src/theme/tokens';

/**
 * Everything behind the sign-in wall.
 *
 * A Stack wrapping the tabs, rather than tabs alone: the portal has 22
 * sections and only four earn a permanent tab. The rest are reached from More
 * and pushed onto this stack, so they arrive with a real back button instead
 * of replacing a tab's contents.
 */
export default function PortalLayout() {
  const { status, session } = useSession();

  if (status === 'loading') return <LoadingState />;
  if (status === 'anonymous') return <Redirect href="/login" />;

  // Mirrors the web's <AuthGuard role="hubowner">. An admin or a customer can
  // hold a valid token; it just isn't a token for this app.
  if (session && !session.isHubOwner) return <Redirect href="/not-a-seller" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.neutral[900],
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.neutral[50] },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
