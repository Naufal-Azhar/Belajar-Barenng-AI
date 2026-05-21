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
    const allCards = await repo.listAllCards(deviceId);
    const now = new Date();
    const dueCards = allCards.filter((c) => new Date(c.due) <= now);
    const mastered = allCards.filter((c) => c.stability > 30);

    // Streak: count consecutive days with lastReview
    const reviewDates = new Set(
      allCards
        .filter((c) => c.lastReview)
        .map((c) => new Date(c.lastReview!).toISOString().slice(0, 10))
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (reviewDates.has(d.toISOString().slice(0, 10))) {
        streak++;
      } else if (i > 0) break; // allow today to not be reviewed yet
    }

    return Response.json({
      totalCards: allCards.length,
      dueToday: dueCards.length,
      mastered: mastered.length,
      streak,
    });
  } catch {
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
