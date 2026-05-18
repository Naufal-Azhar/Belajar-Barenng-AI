import { NextRequest } from 'next/server';
import {
  summaryBodySchema,
  summaryPayloadSchema,
  FirestoreError,
  GeminiError,
  SchemaValidationError,
} from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';
import { getGeminiClient } from '@/lib/gemini-client';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import type { SummaryPayload } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = summaryBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Request tidak valid' }, { status: 400 });
    }

    const { sessionId } = parsed.data;
    const repo = getSessionRepository();
    const session = await repo.get(sessionId);

    if (!session) {
      return Response.json(
        { error: 'Sesi tidak ditemukan atau kosong' },
        { status: 404 }
      );
    }

    const messages = await repo.listMessages(sessionId);
    if (messages.length === 0) {
      return Response.json(
        { error: 'Sesi tidak ditemukan atau kosong' },
        { status: 404 }
      );
    }

    // Build conversation context for summary
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `${buildSystemPrompt({
      profile: session.profileType,
      mode: session.currentMode,
      documentContext: session.documentContext,
      topic: session.topic,
    })}\n\nBuatkan ringkasan sesi belajar ini dalam format JSON dengan field: topicsCovered (array string topik yang dibahas), keyPoints (array string poin pemahaman), recommendations (array string rekomendasi topik lanjutan), createdAt (ISO string waktu sekarang).`;

    const gemini = getGeminiClient();
    const schema = {
      type: 'object',
      properties: {
        topicsCovered: { type: 'array', items: { type: 'string' } },
        keyPoints: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string' },
      },
      required: ['topicsCovered', 'keyPoints', 'recommendations', 'createdAt'],
    };

    const payload = await gemini.generateStructured<SummaryPayload>({
      systemPrompt,
      history: [],
      userMessage: `Berikut percakapan sesi belajar:\n\n${conversationText}`,
      schema,
    });

    // Validate
    const result = summaryPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new SchemaValidationError('Invalid summary payload from AI');
    }

    await repo.saveSummary(sessionId, payload);

    return Response.json(payload);
  } catch (err) {
    if (err instanceof GeminiError || err instanceof SchemaValidationError) {
      return Response.json(
        { error: 'AI sedang sibuk, coba lagi sebentar' },
        { status: 502 }
      );
    }
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
