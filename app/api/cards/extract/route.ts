import { NextRequest } from 'next/server';
import { extractBodySchema, FirestoreError, GeminiError } from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';
import { getGeminiClient } from '@/lib/gemini-client';
import type { ExtractedCard } from '@/lib/types';

export const runtime = 'nodejs';

const EXTRACTION_PROMPT = `Kamu adalah asisten yang mengekstrak konsep penting dari sesi belajar menjadi flashcard.

Dari konteks percakapan dan materi berikut, buat 3-5 flashcard. Setiap kartu harus:
- question: pertanyaan singkat dan jelas (1-2 kalimat)
- answer: jawaban ringkas dan akurat (1-3 kalimat)
- concept: tag konsep 1-3 kata (lowercase)

Fokus pada konsep inti yang perlu diingat jangka panjang. Hindari pertanyaan trivial.`;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          concept: { type: 'string' },
        },
        required: ['question', 'answer', 'concept'],
      },
    },
  },
  required: ['cards'],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = extractBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Request tidak valid' }, { status: 400 });
    }

    const { sessionId } = parsed.data;
    const repo = getSessionRepository();
    const session = await repo.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const messages = await repo.listMessages(sessionId);
    const lastMessages = messages.slice(-10);

    // Build context for extraction
    let context = '';
    if (session.documentContext?.compiledMarkdown) {
      context += `Materi:\n${session.documentContext.compiledMarkdown.slice(0, 3000)}\n\n`;
    }
    if (session.topic) {
      context += `Topik: ${session.topic}\n\n`;
    }
    context += 'Percakapan terakhir:\n';
    for (const m of lastMessages) {
      context += `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 500)}\n`;
    }

    const gemini = getGeminiClient();
    const result = await gemini.generateStructured<{ cards: ExtractedCard[] }>({
      systemPrompt: EXTRACTION_PROMPT,
      history: [],
      userMessage: context,
      schema: EXTRACTION_SCHEMA,
    });

    const cards = (result.cards || []).slice(0, 5);
    return Response.json({ cards });
  } catch (err) {
    if (err instanceof GeminiError) {
      return Response.json({ error: 'AI sedang sibuk, coba lagi' }, { status: 503 });
    }
    if (err instanceof FirestoreError) {
      return Response.json({ error: 'Layanan penyimpanan belum tersedia' }, { status: 503 });
    }
    return Response.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
