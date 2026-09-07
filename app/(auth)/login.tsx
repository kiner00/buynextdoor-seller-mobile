import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Link } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../src/auth/session';
import { useGoogleSignIn } from '../../src/auth/google';
import { ApiError, NetworkError } from '../../src/api/errors';
import type { MobileLoginPayload } from '../../src/api/domains/auth';
import {
  AuthBrandShell,
  Button,
  Field,
  GoogleButton,
  Heading,
  Muted,
  PasswordField,
  Text,
} from '../../src/ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signIn, adoptSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const google = useGoogleSignIn('login', (payload: MobileLoginPayload) => adoptSession(payload));

  // Same rules as the web's zod schema, shown inline once a field is touched.
  const emailError =
    touched.email && email.trim().length === 0
      ? 'Email is required'
      : touched.email && !EMAIL.test(email.trim())
        ? 'Enter a valid email'
        : (fieldErrors.email ?? null);
  const passwordError =
    touched.password && password.length === 0 ? 'Password is required' : (fieldErrors.password ?? null);

  const canSubmit = EMAIL.test(email.trim()) && password.length > 0 && !submitting && !google.busy;

  const onSubmit = async () => {
    setTouched({ email: true, password: true });
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) {
        // The API puts credential failures under `email`, like the web.
        setFieldErrors({
          email: cause.fieldErrors.email?.[0],
          password: cause.fieldErrors.password?.[0],
        });
      } else {
        setFormError(
          cause instanceof NetworkError || cause instanceof ApiError
            ? cause.message
            : 'Could not sign you in. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const storeUrl = (Constants.expoConfig?.extra as { storeUrl?: string } | undefined)?.storeUrl;

  return (
    <AuthBrandShell footnote="This app is for BuyNextDoor sellers. Buyers use the website or the storefront app.">
      <View className="gap-5">
        <View className="gap-1">
          <Heading className="text-2xl">Welcome back</Heading>
          <Muted>Sign in to your seller dashboard.</Muted>
        </View>

        {formError || google.error ? (
          <View className="rounded-lg border border-red-200 bg-red-50 p-3">
            <Text className="text-[14px] text-red-700">{formError ?? google.error}</Text>
          </View>
        ) : null}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          editable={!submitting}
        />

        <View>
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[13px] font-medium text-neutral-700">Password</Text>
            <Link href="/forgot-password" asChild>
              <Text className="text-[12px] font-medium text-brand-700">Forgot password?</Text>
            </Link>
          </View>
          <PasswordField
            label=""
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            autoComplete="current-password"
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={() => void onSubmit()}
            returnKeyType="go"
            className="mt-1.5 gap-1.5"
          />
        </View>

        <Button label="Sign in" onPress={() => void onSubmit()} loading={submitting} disabled={!canSubmit} />

        {google.available ? (
          <>
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-neutral-200" />
              <Muted className="text-[12px]">or</Muted>
              <View className="h-px flex-1 bg-neutral-200" />
            </View>
            <GoogleButton label="Continue with Google" onPress={google.start} disabled={google.busy || submitting} />
          </>
        ) : null}

        <Text className="text-center text-[14px] text-neutral-600">
          New here?{' '}
          <Link href="/register" asChild>
            <Text className="text-[14px] font-medium text-brand-700">Create a seller account</Text>
          </Link>
        </Text>

        {storeUrl ? (
          <Muted className="text-center text-[12px]">
            Shopping instead?{' '}
            <Text className="text-[12px] font-medium text-brand-700" onPress={() => void Linking.openURL(storeUrl)}>
              Go to the BuyNextDoor storefront
            </Text>
          </Muted>
        ) : null}
      </View>
    </AuthBrandShell>
  );
}
