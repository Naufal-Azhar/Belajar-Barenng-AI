import { NextRequest } from 'next/server';
import { createSessionBodySchema, FirestoreError } from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSessionBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Profil tidak valid' },
        { status: 400 }
      );
    }

    const repo = getSessionRepository();
    const session = await repo.create({ profileType: parsed.data.profileType });

    return Response.json(
      { sessionId: session.sessionId, currentMode: session.currentMode },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 }
      );
    }
    return Response.json(
      { error: 'Terjadi kesalahan tak terduga' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return Response.json({ error: 'Session ID diperlukan' }, { status: 400 });
    }

    const repo = getSessionRepository();
    const session = await repo.get(sessionId);

    if (!session) {
      return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const messages = await repo.listMessages(sessionId);

    return Response.json({ session, messages });
  } catch (err) {
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 }
      );
    }
    return Response.json(
      { error: 'Terjadi kesalahan tak terduga' },
      { status: 500 }
    );
  }
}
