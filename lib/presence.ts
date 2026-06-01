// Cap pengguna aktif (in-memory, andalkan Cloud Run --max-instances 1).
// Registry deviceId → last-seen ms. Slot bebas otomatis setelah TTL.

const MAX_ACTIVE = Number(process.env.MAX_ACTIVE_USERS) || 20;
const TTL_MS = 120_000; // 2 menit

const globalKey = '__belajar_presence__';

function registry(): Map<string, number> {
  const g = globalThis as any;
  if (!g[globalKey]) g[globalKey] = new Map<string, number>();
  return g[globalKey];
}

function prune(now: number): Map<string, number> {
  const reg = registry();
  for (const id of Array.from(reg.keys())) {
    if (now - (reg.get(id) as number) > TTL_MS) reg.delete(id);
  }
  return reg;
}

/**
 * Catat aktivitas device. Returns admitted=false jika slot penuh & device baru.
 */
export function touch(deviceId: string): { admitted: boolean; active: number } {
  const now = Date.now();
  const reg = prune(now);
  if (!reg.has(deviceId) && reg.size >= MAX_ACTIVE) {
    return { admitted: false, active: reg.size };
  }
  reg.set(deviceId, now);
  return { admitted: true, active: reg.size };
}

/** Apakah device sedang dalam slot aktif (belum kedaluwarsa). */
export function isActive(deviceId: string): boolean {
  const reg = prune(Date.now());
  return reg.has(deviceId);
}

export const PRESENCE_MAX = MAX_ACTIVE;
