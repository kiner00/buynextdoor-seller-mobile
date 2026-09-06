import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../src/auth/session';
import { ApiError, NetworkError } from '../../src/api/errors';
import { Button, Field, Heading, Muted, Screen, Text } from '../../src/ui';

export default function LoginScreen() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // No navigation here: the gate in (auth)/_layout redirects as soon as
      // status flips to authenticated. Pushing as well would race it.
    } catch (cause) {
      setError(
        cause instanceof NetworkError
          ? cause.message
          : cause instanceof ApiError
            ? (cause.firstFieldError ?? cause.message)
            : 'Could not sign you in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <Screen className="flex-1 bg-white">
        <View className="gap-6 px-6" style={{ paddingTop: insets.top + 48 }}>
          <View className="gap-2">
            <Heading className="text-2xl">Welcome back</Heading>
            <Muted>Sign in to your BuyNextDoor seller account.</Muted>
          </View>

          <View className="gap-4">
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              editable={!submitting}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••"
              editable={!submitting}
              onSubmitEditing={() => canSubmit && onSubmit()}
              returnKeyType="go"
            />

            {error ? (
              <View className="rounded-lg border border-red-200 bg-red-50 p-3">
                <Text className="text-[14px] text-red-700">{error}</Text>
              </View>
            ) : null}

            <Button
              label="Sign in"
              onPress={onSubmit}
              loading={submitting}
              disabled={!canSubmit}
              className="mt-2"
            />

            <Link href="/forgot-password" asChild>
              <Button label="Forgot password?" variant="ghost" />
            </Link>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
