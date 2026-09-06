import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../src/api/domains/auth';
import { ApiError, NetworkError } from '../../src/api/errors';
import { Button, Field, Heading, Muted, Screen, Text } from '../../src/ui';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof NetworkError
          ? cause.message
          : cause instanceof ApiError
            ? (cause.firstFieldError ?? cause.message)
            : 'Could not send the reset link.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen className="flex-1 bg-white">
      <View className="gap-6 px-6" style={{ paddingTop: insets.top + 32 }}>
        <View className="gap-2">
          <Heading className="text-2xl">Reset your password</Heading>
          <Muted>
            We&apos;ll email you a link. Opening it on this phone takes you back into the app.
          </Muted>
        </View>

        {sent ? (
          <View className="gap-4">
            <View className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <Text className="text-[14px] text-brand-800">
                If {email.trim()} has an account, the reset link is on its way.
              </Text>
            </View>
            <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : (
          <View className="gap-4">
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              editable={!submitting}
            />
            {error ? (
              <View className="rounded-lg border border-red-200 bg-red-50 p-3">
                <Text className="text-[14px] text-red-700">{error}</Text>
              </View>
            ) : null}
            <Button
              label="Send reset link"
              onPress={onSubmit}
              loading={submitting}
              disabled={email.trim().length === 0 || submitting}
            />
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        )}
      </View>
    </Screen>
  );
}
