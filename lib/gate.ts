import { createHmac, timingSafeEqual } from 'crypto';

// Gerbang kode akses bersama. Cookie ditandatangani dengan AUTH_SECRET supaya
// tidak bisa dipalsukan; diverifikasi di route Node (mis. /api/chat).
export const GATE_COOKIE = 'belajar.gate';
const MAX_AGE = 60 * 60 * 24; // 1 hari

function secret(): string {
  return process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
}
function accessCode(): string {
  return process.env.ACCESS_CODE || 'belajar-demo';
}
function expectedToken(): string {
  return createHmac('sha256', secret()).update('gate:' + accessCode()).digest('base64url');
}
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Bandingkan kode yang dimasukkan user dengan ACCESS_CODE (timing-safe). */
export function checkCode(input: string): boolean {
  return safeEqual((input || '').trim(), accessCode());
}

/** Verifikasi token cookie gate. */
export function verifyGate(token: string | undefined | null): boolean {
  return !!token && safeEqual(token, expectedToken());
}

export function buildGateCookie(): string {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GATE_COOKIE}=${expectedToken()}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=${MAX_AGE}`;
}
