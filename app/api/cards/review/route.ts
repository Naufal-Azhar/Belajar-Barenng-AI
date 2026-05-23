import { NextRequest } from 'next/server';
import { reviewBodySchema, LLMError } from '@/lib/validation';
import { getCardRepository } from '@/lib/card-repository';
import { getLLMClient } from '@/lib/llm-client';
import { scheduleCard, gradeToRating } from '@/lib/fsrs';

export const runtime = 'nodejs';

const REVIEW_PROMPT = `Kamu adalah penilai jawaban flashcard. Tugasmu:
1. Nilai jawaban user (grade 0-4): 0=salah total, 1=sedikit benar, 2=setengah benar, 3=benar tapi kurang lengkap, 4=sempurna
2. Beri feedback singkat (1-2 kalimat, bahasa Indonesia santai)
3. Buat ulang pertanyaan dengan sudut berbeda (rephrase) untuk review berikutnya

Jawab dalam JSON sesuai schema.`;

const REVIEW_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    grade: { type: 'integer' },
    feedback: { type: 'string' },
    rephrasedQuestion: { type: 'string' },
  },
  required: ['grade', 'feedback', 'rephrasedQuestion'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reviewBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Request tidak valid' }, { status: 400 });
    }

    const { cardId, deviceId, userAnswer } = parsed.data;
    const repo = getCardRepository();
    const card = await repo.getCard(deviceId, cardId);
    if (!card) {
      return Response.json({ error: 'Kartu tidak ditemukan' }, { status: 404 });
    }

    const llm = getLLMClient();
    const result = await llm.generateStructured<{ grade: number; feedback: string; rephrasedQuestion: string }>({
      systemPrompt: REVIEW_PROMPT,
      history: [],
      userMessage: `Pertanyaan: ${card.question}\nJawaban benar: ${card.answer}\nJawaban user: ${userAnswer}`,
      schemaName: 'ReviewGrading',
      schemaDescription: REVIEW_SCHEMA,
    });

    const grade = Math.max(0, Math.min(4, result.grade));
    const rating = gradeToRating(grade);
    const updated = scheduleCard(card, rating);
    const newWeakStreak = grade <= 1 ? card.weakStreak + 1 : 0;

    await repo.updateCard(deviceId, cardId, {
      ...updated,
      weakStreak: newWeakStreak,
      lastReview: new Date().toISOString(),
      question: result.rephrasedQuestion || card.question,
    });

    let crossModeSuggestion = null;
    if (newWeakStreak >= 3) {
      crossModeSuggestion = { mode: newWeakStreak % 2 === 0 ? 'latihan' : 'socratic', concept: card.concept };
    }

    return Response.json({ grade, feedback: result.feedback, nextDue: updated.due, crossModeSuggestion });
  } catch (err) {
    if (err instanceof LLMError) {
      return Response.json({ error: 'AI sedang sibuk, coba lagi' }, { status: 503 });
    }
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
