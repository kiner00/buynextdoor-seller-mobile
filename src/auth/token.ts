import * as SecureStore from 'expo-secure-store';

/**
 * The seller's Sanctum token, and the only place it is allowed to live.
 *
 * The web rule is "the browser must never hold a credential it can read", kept
 * by an httpOnly cookie. Native has no httpOnly cookie to hide behind, so the
 * equivalent guarantee is the platform keystore: expo-secure-store puts this
 * in the iOS Keychain and Android's EncryptedSharedPreferences, both backed by
 * hardware-held keys and both unreadable by other apps.
 *
 * Never move this to AsyncStorage. AsyncStorage is a plaintext file inside the
 * app sandbox — readable by anything with filesystem access on a rooted or
 * jailbroken device, and swept up by device backups.
 */
const TOKEN_KEY = 'bnd.seller.token';

/**
 * Kept in memory as well as in the keystore. Every request needs the token and
 * SecureStore reads cross the native bridge, so hitting it per request would
 * put an async hop in front of the whole app. The keystore stays the source of
 * truth; this is a read-through cache that survives until the process dies.
 */
let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    cached = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A keystore read can fail on a device whose secure hardware is in a bad
    // state. Treat it as "not signed in" rather than crashing on launch.
    cached = null;
  }
  return cached;
}

/** Synchronous peek, for code paths that cannot await (interceptors, logging). */
export function peekToken(): string | null {
  return cached ?? null;
}

export async function setToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
