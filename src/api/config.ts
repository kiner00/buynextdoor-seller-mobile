import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * Read from `expo.extra.apiUrl` in app.json rather than `process.env`: a
 * native binary has no environment to read at runtime, so the value has to be
 * baked into the bundle at build time. EAS build profiles override it per
 * channel (see eas.json) — that is the one place staging and production
 * diverge.
 *
 * `EXPO_PUBLIC_API_URL` still wins when set, which is what makes
 * `EXPO_PUBLIC_API_URL=http://192.168.1.5:8001 npm start` work against a
 * laptop running the API locally. `localhost` is the phone itself, never your
 * machine, so a LAN IP is required for on-device development.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_BASE_URL = (fromEnv ?? fromConfig ?? 'http://localhost:8001').replace(/\/+$/, '');

/**
 * Names this install in the seller's token list, so a lost phone can be
 * revoked without signing out their other devices.
 */
export const DEVICE_NAME =
  `${Constants.deviceName ?? 'Unknown device'} (${Constants.expoConfig?.name ?? 'BND Seller'})`.slice(
    0,
    255,
  );
