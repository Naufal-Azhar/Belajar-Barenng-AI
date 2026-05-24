import type { NextRequest } from 'next/server';
import type { OwnerType } from './types';

/**
 * Identitas pemilik request — hasil resolve dari header.
 * Phase 1-4: hanya 'device' (X-Device-Id header).
 * Phase 5+: tambah 'user' (Firebase ID token verification).
 */
export interface Owner {
  ownerType: OwnerType;
  ownerId: string;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Identitas tidak dapat di-resolve') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Resolve pemilik request dari headers.
 *
 * Sementara di Phase 1-4: hanya membaca `X-Device-Id` (anonymous mode).
 * Akan di-extend di Task 14 untuk juga verifikasi Authorization Bearer ID token
 * (Firebase Auth). Logika fallback:
 *   1. Kalau ada `Authorization: Bearer <token>` valid → user mode
 *   2. Else, kalau ada `X-Device-Id` → device mode
 *   3. Else throw UnauthorizedError → 400
 */
export async function resolveOwner(req: NextRequest | Request): Promise<Owner> {
  // Future: Firebase Auth verification block here (Task 14)

  // Headers reader (Request and NextRequest both expose .headers.get)
  const deviceId = req.headers.get('x-device-id');
  if (deviceId && deviceId.trim().length > 0) {
    return { ownerType: 'device', ownerId: deviceId.trim() };
  }

  throw new UnauthorizedError('X-Device-Id header diperlukan');
}
