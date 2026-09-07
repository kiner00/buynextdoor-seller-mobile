import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../../src/api/domains/auth';
import { ApiError, NetworkError } from '../../src/api/errors';
import { AuthBrandShell, Button, Field, Heading, Muted, Text } from '../../src/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !EMAIL.test(email.trim()) ? 'Enter a valid email' : null;

  const onSubmit = async () => {
    setTouched(true);
    if (!EMAIL.test(email.trim())) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof NetworkError || cause instanceof ApiError
          ? (cause instanceof ApiError ? (cause.firstFieldError ?? cause.message) : cause.message)
          : 'Could not send the reset link.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBrandShell>
      <View className="gap-5">
        <View className="gap-1">
          <Heading className="text-2xl">Reset your password</Heading>
          <Muted>We&apos;ll email you a link. Opening it on this phone brings you back here.</Muted>
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
              onBlur={() => setTouched(true)}
              error={emailError}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              editable={!submitting}
              onSubmitEditing={() => void onSubmit()}
              returnKeyType="send"
            />
            {error ? (
              <View className="rounded-lg border border-red-200 bg-red-50 p-3">
                <Text className="text-[14px] text-red-700">{error}</Text>
              </View>
            ) : null}
            <Button label="Send reset link" onPress={() => void onSubmit()} loading={submitting} disabled={!EMAIL.test(email.trim()) || submitting} />
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        )}
      </View>
    </AuthBrandShell>
  );
}
