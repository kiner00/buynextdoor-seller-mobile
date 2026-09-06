import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../src/auth/session';
import { Button, Card, Heading, Muted, Screen } from '../src/ui';

/**
 * A valid account that isn't a seller account.
 *
 * Reachable because one BND login works across every portal — an admin or a
 * customer can authenticate here perfectly well, they just have nothing to see.
 * Signing them out is the only useful action, so it is the only one offered.
 */
export default function NotASellerScreen() {
  const { session, signOut } = useSession();
  const insets = useSafeAreaInsets();

  return (
    <Screen className="flex-1 bg-white">
      <View className="gap-4 px-6" style={{ paddingTop: insets.top + 64 }}>
        <Card className="gap-2">
          <Heading className="text-base">This app is for BND sellers</Heading>
          <Muted>
            {session?.user.email} is signed in, but it isn&apos;t a seller account. If you sell with
            BuyNextDoor, sign in with that account instead.
          </Muted>
        </Card>
        <Button label="Sign out" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
