import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeviceId } from '@/lib/device-id';

/**
 * Task 1 — Identitas klien ephemeral.
 * getDeviceId() harus stabil dalam satu tab (sessionStorage) dan TIDAK
 * menulis ke localStorage (agar identitas reset saat tab ditutup).
 */
describe('getDeviceId (ephemeral)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('stabil dalam satu tab', () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it('disimpan di sessionStorage, bukan localStorage', () => {
    const localSpy = vi.spyOn(Storage.prototype, 'setItem');
    getDeviceId();
    expect(sessionStorage.getItem('belajar.deviceId')).toBeTruthy();
    expect(localStorage.getItem('belajar.deviceId')).toBeNull();
    localSpy.mockRestore();
  });

  it('tab baru (sessionStorage kosong) → id baru', () => {
    const first = getDeviceId();
    sessionStorage.clear();
    const second = getDeviceId();
    expect(second).not.toBe(first);
  });
});
