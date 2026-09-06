import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import Constants from 'expo-constants';
import { apiFetch } from '../api/client';
import type { Message } from '../api/domains/chat';

/**
 * Laravel Echo over Reverb, for live chat.
 *
 * Best-effort by design. The API registers `/broadcasting/auth` with Laravel's
 * default `web` middleware, which authorizes a session cookie and not a bearer
 * token — so from a phone the private-channel handshake is expected to be
 * refused until the API opts that route into `auth:sanctum`. Every thread
 * therefore polls as its floor, and this module only ever turns polling off
 * once a subscription has actually succeeded. Nothing here can break chat; it
 * can only make it faster.
 */
type ReverbEcho = Echo<'reverb'>;

let instance: ReverbEcho | null = null;

interface ReverbConfig {
  key: string;
  host: string;
  port: number;
  scheme: 'http' | 'https';
}

function config(): ReverbConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { reverb?: Partial<ReverbConfig> };
  const key = process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? extra.reverb?.key;
  const host = process.env.EXPO_PUBLIC_REVERB_HOST ?? extra.reverb?.host;
  if (!key || !host) return null;
  return {
    key,
    host,
    port: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? extra.reverb?.port ?? 443),
    scheme: (process.env.EXPO_PUBLIC_REVERB_SCHEME ?? extra.reverb?.scheme ?? 'https') as
      'http' | 'https',
  };
}

export function getEcho(): ReverbEcho | null {
  if (instance) return instance;
  const cfg = config();
  if (!cfg) return null;

  instance = new Echo<'reverb'>({
    broadcaster: 'reverb',
    Pusher,
    key: cfg.key,
    wsHost: cfg.host,
    wsPort: cfg.port,
    wssPort: cfg.port,
    forceTLS: cfg.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: { name: string }) => ({
      authorize: (
        socketId: string,
        callback: (error: Error | null, data: { auth: string } | null) => void,
      ) => {
        apiFetch<{ auth: string }>('/broadcasting/auth', {
          method: 'POST',
          json: { socket_id: socketId, channel_name: channel.name },
        })
          .then((data) => callback(null, data))
          .catch((error: unknown) =>
            callback(error instanceof Error ? error : new Error('Channel auth failed'), null),
          );
      },
    }),
  });
  return instance;
}

/** Tear down on sign-out so the next account never inherits a socket. */
export function disconnectEcho(): void {
  instance?.disconnect();
  instance = null;
}

/**
 * Subscribe to one conversation. Resolves `onLive(true)` only once the
 * private channel is actually subscribed — that is the signal to stop polling.
 */
export function subscribeToConversation(
  conversationId: number,
  onMessage: (message: Message) => void,
  onLive: (live: boolean) => void,
): () => void {
  const echo = getEcho();
  if (!echo) {
    onLive(false);
    return () => {};
  }

  const name = `conversation.${conversationId}`;
  const channel = echo.private(name);

  channel
    .subscribed(() => onLive(true))
    .error(() => onLive(false))
    .listen('.message.sent', (payload: { message: Message }) => onMessage(payload.message));

  return () => {
    echo.leave(name);
    onLive(false);
  };
}
