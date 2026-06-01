import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { touch, isActive, PRESENCE_MAX } from '@/lib/presence';

/**
 * Task 5 — Cap pengguna aktif.
 * touch() menerima sampai MAX, menolak device baru ke-(MAX+1),
 * dan membebaskan slot setelah TTL (~2 menit).
 */
describe('presence cap', () => {
  beforeEach(() => {
    (globalThis as any).__belajar_presence__ = new Map();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('menerima sampai MAX device', () => {
    for (let i = 0; i < PRESENCE_MAX; i++) {
      expect(touch(`dev-${i}`).admitted).toBe(true);
    }
  });

  it('menolak device baru saat penuh, tapi device lama tetap diterima', () => {
    for (let i = 0; i < PRESENCE_MAX; i++) touch(`dev-${i}`);
    expect(touch('newcomer').admitted).toBe(false);
    expect(touch('dev-0').admitted).toBe(true); // sudah punya slot
  });

  it('membebaskan slot setelah TTL', () => {
    for (let i = 0; i < PRESENCE_MAX; i++) touch(`dev-${i}`);
    expect(touch('newcomer').admitted).toBe(false);
    vi.advanceTimersByTime(120_001); // > TTL
    expect(touch('newcomer').admitted).toBe(true);
  });

  it('isActive konsisten dengan touch', () => {
    expect(isActive('x')).toBe(false);
    touch('x');
    expect(isActive('x')).toBe(true);
    vi.advanceTimersByTime(120_001);
    expect(isActive('x')).toBe(false);
  });
});
