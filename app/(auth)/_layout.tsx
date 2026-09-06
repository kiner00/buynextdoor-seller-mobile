import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/auth/session';
import { LoadingState } from '../../src/ui';

export default function AuthLayout() {
  const { status } = useSession();

  if (status === 'loading') return <LoadingState />;
  // Nothing in here is reachable once signed in — going "back" to login from
  // the portal should not be possible.
  if (status === 'authenticated') return <Redirect href="/dashboard" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
