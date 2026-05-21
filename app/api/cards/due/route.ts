import { NextRequest } from 'next/server';
import { getCardRepository } from '@/lib/card-repository';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    if (!deviceId) {
      return Response.json({ error: 'deviceId diperlukan' }, { status: 400 });
    }

    const repo = getCardRepository();
    const cards = await repo.listDueCards(deviceId, new Date());
    return Response.json({ cards });
  } catch {
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
