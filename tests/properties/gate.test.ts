import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Task 6 — Gerbang kode akses.
 * checkCode hanya menerima kode benar; verifyGate menerima token dari
 * buildGateCookie dan menolak token sembarang.
 */
describe('gate', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
    process.env.ACCESS_CODE = 'rahasia123';
  });

  async function load() {
    // import dinamis agar env terbaca saat modul dieksekusi
    return await import('@/lib/gate');
  }

  it('checkCode menerima kode benar, menolak yang salah', async () => {
    const { checkCode } = await load();
    expect(checkCode('rahasia123')).toBe(true);
    expect(checkCode('  rahasia123  ')).toBe(true); // trim
    expect(checkCode('salah')).toBe(false);
    expect(checkCode('')).toBe(false);
  });

  it('verifyGate menerima token dari buildGateCookie', async () => {
    const { buildGateCookie, verifyGate, GATE_COOKIE } = await load();
    const cookie = buildGateCookie();
    const token = cookie.split(';')[0].slice(`${GATE_COOKIE}=`.length);
    expect(verifyGate(token)).toBe(true);
    expect(verifyGate('token-palsu')).toBe(false);
    expect(verifyGate(undefined)).toBe(false);
  });
});
