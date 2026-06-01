import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Session token sederhana: `base64url(payload).hmacSHA256(payload)`.
 * Ditandatangani dengan AUTH_SECRET supaya tidak bisa dipalsukan klien.
 * Disimpan sebagai cookie HTTP-only.
 *
 * Ini bukan JWT penuh — cukup untuk profil username (bukan data sensitif).
 */

export const AUTH_COOKIE = 'belajar.session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

interface TokenPayload {
  ownerId: string;
  iat: number;
}

function getSecret(): string {
  // Fallback dev-only — WAJIB di-set via env (AUTH_SECRET) di produksi.
  return process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signToken(ownerId: string): string {
  const payload: TokenPayload = { ownerId, iat: Date.now() };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined | null): { ownerId: string } | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (!payload.ownerId) return null;
    return { ownerId: payload.ownerId };
  } catch {
    return null;
  }
}

/** Parse header Cookie jadi map. Bekerja dgn Request native (untuk test) & NextRequest. */
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('cookie') ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function readSessionToken(req: Request): string | null {
  return parseCookies(req)[AUTH_COOKIE] ?? null;
}

function cookieFlags(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function buildSessionCookie(ownerId: string): string {
  const token = signToken(ownerId);
  return `${AUTH_COOKIE}=${token}; ${cookieFlags()}; Max-Age=${MAX_AGE_SECONDS}`;
}

export function buildClearCookie(): string {
  return `${AUTH_COOKIE}=; ${cookieFlags()}; Max-Age=0`;
}
