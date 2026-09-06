import { apiFetch } from '../client';
import type { ApiEnvelope } from '../types';

/**
 * Where this install is reachable for push. Registered after sign-in and
 * forgotten on sign-out, so a shared phone never rings for the wrong account.
 */
export interface RegisterDeviceInput {
  token: string;
  platform: 'ios' | 'android';
  device_name?: string;
}

export const devicesApi = {
  register: (input: RegisterDeviceInput) =>
    apiFetch<ApiEnvelope<null>>('/devices', { method: 'POST', json: input }),

  unregister: (token: string) =>
    apiFetch<ApiEnvelope<null>>('/devices', { method: 'DELETE', json: { token } }),
};
