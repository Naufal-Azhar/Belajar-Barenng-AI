'use client';

import { getDeviceId } from './device-id';

/**
 * Wrapper fetch untuk semua API call yang owner-scoped.
 * Selalu menyertakan cookie session (kalau login) + header X-Device-Id
 * (fallback mode tamu). Server `resolveOwner` memprioritaskan cookie user,
 * lalu device.
 */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('X-Device-Id')) headers.set('X-Device-Id', getDeviceId());
  return fetch(input, { ...init, credentials: 'include', headers });
}
