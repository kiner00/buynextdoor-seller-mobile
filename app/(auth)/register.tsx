import { Linking, View } from 'react-native';
import { Link } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../src/auth/session';
import { useGoogleSignIn } from '../../src/auth/google';
import type { MobileLoginPayload } from '../../src/api/domains/auth';
import { AuthBrandShell, Button, GoogleButton, Heading, Muted, Text } from '../../src/ui';

/**
 * Becoming a seller. Google-only, exactly like the web's register page: the
 * account it creates is a FREE-plan seller (`intent=partner_free`), not a
 * shopper, and there is no form to fill because Google already knows who you
 * are. The button is hidden until the Google client IDs exist in app.json.
 */
export default function RegisterScreen() {
  const { adoptSession } = useSession();
  const google = useGoogleSignIn('partner_free', (payload: MobileLoginPayload) => adoptSession(payload));
  const storeUrl = (Constants.expoConfig?.extra as { storeUrl?: string } | undefined)?.storeUrl;

  return (
    <AuthBrandShell footnote="Free to start. Upgrade any time from the seller website.">
      <View className="gap-5">
        <View className="gap-1">
          <Heading className="text-2xl">Become a seller</Heading>
          <Muted>Sell BuyNextDoor products to your neighbourhood — no stock, no fees to start.</Muted>
        </View>

        {google.error ? (
          <View className="rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-[14px] text-red-700">{google.error}</Text>
          </View>
        ) : null}

        {google.available ? (
          <GoogleButton label="Sign up with Google" onPress={google.start} disabled={google.busy} />
        ) : (
          <View className="gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <Text className="text-[14px] font-medium">Sign up on the website for now</Text>
            <Muted>Google sign-up in the app is on its way. Until then, create your seller account at seller.buynextdoor.ph and sign in here.</Muted>
            {storeUrl ? (
              <Button
                label="Open the website"
                variant="secondary"
                onPress={() => void Linking.openURL('https://seller.buynextdoor.ph/register')}
              />
            ) : null}
          </View>
        )}

        <Text className="text-center text-[14px] text-neutral-600">
          Already a seller?{' '}
          <Link href="/login" asChild>
            <Text className="text-[14px] font-medium text-brand-700">Sign in</Text>
          </Link>
        </Text>
      </View>
    </AuthBrandShell>
  );
}
