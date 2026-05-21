import { NextRequest } from 'next/server';
import { reviewBodySchema, GeminiError } from '@/lib/validation';
import { getCardRepository } from '@/lib/card-repository';
import { getGeminiClient } from '@/lib/gemini-client';
import { scheduleCard, gradeToRating } from '@/lib/fsrs';

export const runtime = 'nodejs';

const REVIEW_PROMPT = `Kamu adalah penilai jawaban flashcard. Tugasmu:
1. Nilai jawaban user (grade 0-4): 0=salah total, 1=sedikit benar, 2=setengah benar, 3=benar tapi kurang lengkap, 4=sempurna
2. Beri feedback singkat (1-2 kalimat, bahasa Indonesia santai)
3. Buat ulang pertanyaan dengan sudut berbeda (rephrase) untuk review berikutnya

Jawab dalam JSON sesuai schema.`;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    grade: { type: 'integer' },
    feedback: { type: 'string' },
    rephrasedQuestion: { type: 'string' },
  },
  required: ['grade', 'feedback', 'rephrasedQuestion'],
};

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

    // AI grading + rephrase
    const gemini = getGeminiClient();
    const result = await gemini.generateStructured<{
      grade: number;
      feedback: string;
      rephrasedQuestion: string;
    }>({
      systemPrompt: REVIEW_PROMPT,
      history: [],
      userMessage: `Pertanyaan: ${card.question}\nJawaban benar: ${card.answer}\nJawaban user: ${userAnswer}`,
      schema: REVIEW_SCHEMA,
    });

    const grade = Math.max(0, Math.min(4, result.grade));
    const rating = gradeToRating(grade);

    // Schedule card
    const updated = scheduleCard(card, rating);
    const newWeakStreak = grade <= 1 ? card.weakStreak + 1 : 0;

    // Update card in DB
    await repo.updateCard(deviceId, cardId, {
      ...updated,
      weakStreak: newWeakStreak,
      lastReview: new Date().toISOString(),
      question: result.rephrasedQuestion || card.question,
    });

    // Cross-mode suggestion if weak
    let crossModeSuggestion = null;
    if (newWeakStreak >= 3) {
      crossModeSuggestion = {
        mode: newWeakStreak % 2 === 0 ? 'latihan' : 'socratic',
        concept: card.concept,
      };
    }

    return Response.json({
      grade,
      feedback: result.feedback,
      nextDue: updated.due,
      crossModeSuggestion,
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return Response.json({ error: 'AI sedang sibuk, coba lagi' }, { status: 503 });
    }
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
