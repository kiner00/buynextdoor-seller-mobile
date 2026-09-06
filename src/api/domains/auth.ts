import { apiFetch } from '../client';
import { DEVICE_NAME } from '../config';
import type { ApiEnvelope, SessionPayload } from '../types';

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * What login returns to a native client. Identical to the web payload plus
 * `token` — the Sanctum personal-access token the API mints when a request
 * names a device. The web never sends `device_name`, so it keeps getting a
 * session cookie and no token in the body.
 */
export interface MobileLoginPayload extends SessionPayload {
  token: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiFetch<ApiEnvelope<MobileLoginPayload>>('/login', {
      method: 'POST',
      anonymous: true,
      json: { ...input, device_name: DEVICE_NAME },
    }),

  me: () => apiFetch<ApiEnvelope<SessionPayload>>('/me'),

  /** Revokes just this device's token, server-side. */
  logout: () => apiFetch<ApiEnvelope<null>>('/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    apiFetch<ApiEnvelope<null>>('/forgot-password', {
      method: 'POST',
      anonymous: true,
      json: { email },
    }),

  changePassword: (input: { current_password: string; password: string }) =>
    apiFetch<ApiEnvelope<null>>('/change-password', { method: 'POST', json: input }),
};
