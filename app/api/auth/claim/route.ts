import { NextRequest } from 'next/server';
import { resolveOwner } from '@/lib/auth-server';
import { getSessionRepository } from '@/lib/session-repository';
import { FirestoreError } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Klaim data tamu (device) ke profil user yang sedang login.
 * Memindahkan sesi ber-ownerType 'device' (ownerId = deviceId) → 'user'.
 * Idempotent: sesi yang sudah user-owned tidak ikut termigrasi.
 *
 * Catatan: flashcard tetap device-scoped (di-key oleh deviceId) sehingga
 * tetap muncul di browser yang sama — tidak dimigrasi agar tidak hilang.
 */
export async function POST(request: NextRequest) {
  let owner;
  try {
    owner = await resolveOwner(request);
  } catch {
    return Response.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }
  if (owner.ownerType !== 'user') {
    return Response.json({ error: 'Harus login untuk klaim data' }, { status: 401 });
  }

  const deviceId = request.headers.get('x-device-id')?.trim();
  if (!deviceId) return Response.json({ migrated: 0 });

  try {
    const migrated = await getSessionRepository().migrateOwner(deviceId, owner.ownerId);
    return Response.json({ migrated });
  } catch (err) {
    if (err instanceof FirestoreError) {
      return Response.json({ error: 'Penyimpanan belum tersedia' }, { status: 503 });
    }
    return Response.json({ error: 'Gagal klaim data' }, { status: 500 });
  }
}
