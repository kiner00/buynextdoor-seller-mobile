import { useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { apiFetch } from '../api/client';
import { DEVICE_NAME } from '../api/config';
import type { ApiEnvelope } from '../api/types';
import type { MobileLoginPayload } from '../api/domains/auth';

// Lets the auth browser hand control back to the app when Google is done.
WebBrowser.maybeCompleteAuthSession();

interface GoogleIds {
  androidClientId: string;
  iosClientId: string;
  webClientId: string;
}

function ids(): GoogleIds {
  const extra = (Constants.expoConfig?.extra ?? {}) as { google?: Partial<GoogleIds> };
  return {
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? extra.google?.androidClientId ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? extra.google?.iosClientId ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? extra.google?.webClientId ?? '',
  };
}

/** True once at least one platform client id exists — the button hides until then. */
export function googleConfigured(): boolean {
  const g = ids();
  return Boolean(g.androidClientId || g.iosClientId || g.webClientId);
}

export type GoogleIntent = 'login' | 'partner_free';

/**
 * Sign in — or, with `intent: 'partner_free'`, sign up as a free seller — with
 * Google, from a phone.
 *
 * The web's flow is a browser round trip that ends in a session cookie. A
 * phone cannot use that, so Google runs on the device and hands back an ID
 * token, which the API verifies and exchanges for a Sanctum token. Same
 * account-resolution rules as the web (SocialAuthService); only the transport
 * differs.
 */
export function useGoogleSignIn(
  intent: GoogleIntent,
  onSignedIn: (payload: MobileLoginPayload) => Promise<void>,
) {
  const g = ids();
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: g.androidClientId || undefined,
    iosClientId: g.iosClientId || undefined,
    webClientId: g.webClientId || undefined,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everything happens from the tap, not from an effect watching `response`:
  // promptAsync() resolves with the same result object, and handling it here
  // keeps the state changes in an event handler where they belong.
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success') {
        setError('Google sign-in failed. Please try again.');
        return;
      }
      const idToken = result.params.id_token;
      if (!idToken) {
        setError('Google did not return a sign-in. Please try again.');
        return;
      }
      const envelope = await apiFetch<ApiEnvelope<MobileLoginPayload>>('/google/native', {
        method: 'POST',
        anonymous: true,
        json: {
          id_token: idToken,
          device_name: DEVICE_NAME,
          ...(intent === 'partner_free' ? { intent } : {}),
        },
      });
      await onSignedIn(envelope.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign you in with Google.');
    } finally {
      setBusy(false);
    }
  };

  return {
    available: googleConfigured() && Boolean(request),
    busy,
    error,
    start: () => void start(),
  };
}
