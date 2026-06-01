'use client';

const DEVICE_KEY = 'belajar.deviceId';

// Ephemeral: pakai sessionStorage agar identitas tamu reset saat tab/browser
// ditutup. Refresh di tab yang sama tetap mempertahankan identitas.
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
