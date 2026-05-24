import { NextRequest } from 'next/server';
import { getSessionRepository } from '@/lib/session-repository';
import { resolveOwner, UnauthorizedError } from '@/lib/auth-server';
import { updateSessionTitleSchema, FirestoreError } from '@/lib/validation';
import type { Session } from '@/lib/types';

export const runtime = 'nodejs';

interface RouteContext {
  params: { sessionId: string };
}

/**
 * Helper: load session, verify ownership.
 * Returns Response untuk early-return (404/403/400), atau { session } untuk lanjut.
 */
async function loadOwnedSession(
  request: NextRequest,
  sessionId: string,
): Promise<{ session: Session } | Response> {
  const owner = await resolveOwner(request);
  const repo = getSessionRepository();
  const session = await repo.get(sessionId);

  if (!session || session.isArchived) {
    return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }
  if (session.ownerType !== owner.ownerType || session.ownerId !== owner.ownerId) {
    return Response.json({ error: 'Akses ditolak' }, { status: 403 });
  }
  return { session };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await loadOwnedSession(request, params.sessionId);
    if (result instanceof Response) return result;

    const repo = getSessionRepository();
    const messages = await repo.listMessages(params.sessionId);
    return Response.json({ session: result.session, messages });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 }
      );
    }
    return Response.json({ error: 'Terjadi kesalahan tak terduga' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await loadOwnedSession(request, params.sessionId);
    if (result instanceof Response) return result;

    const body = await request.json();
    const parsed = updateSessionTitleSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Title tidak valid (1-100 karakter)' }, { status: 400 });
    }

    const repo = getSessionRepository();
    await repo.updateTitle(params.sessionId, parsed.data.title.trim());
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 }
      );
    }
    return Response.json({ error: 'Terjadi kesalahan tak terduga' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const result = await loadOwnedSession(request, params.sessionId);
    if (result instanceof Response) return result;

    const repo = getSessionRepository();
    await repo.archive(params.sessionId);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 }
      );
    }
    return Response.json({ error: 'Terjadi kesalahan tak terduga' }, { status: 500 });
  }
}
