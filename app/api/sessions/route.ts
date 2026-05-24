import { NextRequest } from 'next/server';
import { getSessionRepository } from '@/lib/session-repository';
import { resolveOwner, UnauthorizedError } from '@/lib/auth-server';
import { createSessionBodySchema, FirestoreError } from '@/lib/validation';
import type { Session } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Strip heavy field `documentContext.compiledMarkdown` dari list response.
 * Sidebar/dashboard tidak butuh isi markdown — hanya metadata.
 */
function stripHeavyFields(session: Session): Session {
  if (!session.documentContext) return session;
  const { compiledMarkdown, ...lightCtx } = session.documentContext;
  return {
    ...session,
    documentContext: {
      ...lightCtx,
      // Placeholder string biar tipe konsisten — tetap punya panjang 0
      compiledMarkdown: '',
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const owner = await resolveOwner(request);
    const repo = getSessionRepository();
    const sessions = await repo.listByOwner(owner.ownerType, owner.ownerId);
    return Response.json({
      sessions: sessions.map(stripHeavyFields),
    });
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



export async function POST(request: NextRequest) {
  try {
    const owner = await resolveOwner(request);
    const body = await request.json();
    const parsed = createSessionBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Profil tidak valid' }, { status: 400 });
    }

    const repo = getSessionRepository();
    const session = await repo.create({
      profileType: parsed.data.profileType,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
    });

    return Response.json(
      {
        sessionId: session.sessionId,
        currentMode: session.currentMode,
        ownerType: session.ownerType,
        ownerId: session.ownerId,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
      },
      { status: 201 }
    );
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
