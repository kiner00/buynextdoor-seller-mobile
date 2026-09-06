import { Redirect } from 'expo-router';
import { useSession } from '../src/auth/session';
import { LoadingState } from '../src/ui';

/**
 * The gate. Held here until the keystore has been read and the token verified,
 * so a signed-in seller never sees the login screen flash on a cold start.
 */
export default function Index() {
  const { status } = useSession();

  if (status === 'loading') return <LoadingState label="Signing you in…" />;
  return <Redirect href={status === 'authenticated' ? '/dashboard' : '/login'} />;
}
