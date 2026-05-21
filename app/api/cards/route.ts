import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { saveCardsBodySchema, FirestoreError } from '@/lib/validation';
import { getCardRepository } from '@/lib/card-repository';
import { createNewCardParams } from '@/lib/fsrs';
import type { FlashCard } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveCardsBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Request tidak valid' }, { status: 400 });
    }

    const { deviceId, sessionId, cards } = parsed.data;
    const repo = getCardRepository();
    const saved: FlashCard[] = [];

    for (const c of cards) {
      const existing = await repo.findByConceptPrefix(deviceId, c.concept);
      if (existing) continue; // dedupe

      const params = createNewCardParams();
      // Set due to tomorrow for new cards
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const card: FlashCard = {
        cardId: randomUUID(),
        deviceId,
        sessionId,
        question: c.question,
        answer: c.answer,
        concept: c.concept.toLowerCase(),
        ...params,
        due: tomorrow.toISOString(),
        weakStreak: 0,
        createdAt: new Date().toISOString(),
      };
      await repo.createCard(card);
      saved.push(card);
    }

    return Response.json({ saved: saved.length }, { status: 201 });
  } catch (err) {
    if (err instanceof FirestoreError) {
      return Response.json({ error: 'Layanan penyimpanan belum tersedia' }, { status: 503 });
    }
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
