import { NextRequest } from 'next/server';
import {
  chatBodySchema,
  FirestoreError,
  GeminiError,
  quizPayloadSchema,
  latihanPayloadSchema,
  explainerPayloadSchema,
  socraticPayloadSchema,
  SchemaValidationError,
} from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';
import { getGeminiClient } from '@/lib/gemini-client';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { createSseStream } from '@/lib/sse';
import type {
  LearningMode,
  QuizPayload,
  LatihanPayload,
  ExplainerPayload,
  SocraticPayload,
} from '@/lib/types';

export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Request tidak valid' }, { status: 400 });
    }

    const { sessionId, message, mode } = parsed.data;

    // Validate message not empty
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return Response.json(
        { error: 'Pesan tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Validate message length
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: 'Pesan terlalu panjang (max 4000 karakter)' },
        { status: 400 }
      );
    }

    const repo = getSessionRepository();
    const session = await repo.get(sessionId);

    if (!session) {
      return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    // Update mode if provided
    const activeMode: LearningMode = mode || session.currentMode;
    if (mode && mode !== session.currentMode) {
      await repo.update(sessionId, { currentMode: mode });
    }

    // Save user message
    await repo.appendMessage(sessionId, {
      sessionId,
      role: 'user',
      mode: activeMode,
      content: trimmedMessage,
      createdAt: new Date().toISOString(),
    });

    // Get history
    const messages = await repo.listMessages(sessionId);
    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      text: m.content,
    }));

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      profile: session.profileType,
      mode: activeMode,
      documentContext: session.documentContext,
      topic: session.topic,
    });

    const gemini = getGeminiClient();

    // All modes return structured payload now
    const { stream, write, close } = createSseStream();

    type AnyPayload =
      | ExplainerPayload
      | SocraticPayload
      | QuizPayload
      | LatihanPayload;

    (async () => {
      try {
        const schema = buildSchemaForMode(activeMode);

        const payload = await gemini.generateStructured<AnyPayload>({
          systemPrompt,
          history: history.slice(0, -1),
          userMessage: trimmedMessage,
          schema,
        });

        // Validate with Zod
        const validators: Record<LearningMode, { safeParse: (p: unknown) => { success: boolean } }> = {
          explainer: explainerPayloadSchema,
          socratic: socraticPayloadSchema,
          quiz: quizPayloadSchema,
          latihan: latihanPayloadSchema,
        };
        const result = validators[activeMode].safeParse(payload);
        if (!result.success) {
          throw new SchemaValidationError(`Invalid ${activeMode} payload from AI`);
        }

        // Save AI message with payload
        const aiMsg = await repo.appendMessage(sessionId, {
          sessionId,
          role: 'ai',
          mode: activeMode,
          content: JSON.stringify(payload),
          payload,
          createdAt: new Date().toISOString(),
        });

        write({ type: 'payload', data: payload });
        write({ type: 'done', data: { messageId: aiMsg.messageId } });
      } catch (err) {
        if (err instanceof GeminiError) {
          write({ type: 'error', data: { message: 'AI sedang sibuk, coba lagi sebentar' } });
        } else if (err instanceof SchemaValidationError) {
          write({ type: 'error', data: { message: 'AI sedang sibuk, coba lagi sebentar' } });
        } else {
          write({ type: 'error', data: { message: 'Terjadi kesalahan tak terduga' } });
        }
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
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

function buildSchemaForMode(mode: LearningMode): object {
  switch (mode) {
    case 'quiz':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['quiz'] },
          type: { type: 'string', enum: ['mcq', 'essay'] },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswer: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['kind', 'type', 'question', 'correctAnswer'],
      };
    case 'latihan':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['latihan'] },
          question: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
              },
              required: ['title', 'detail'],
            },
          },
        },
        required: ['kind', 'question', 'steps'],
      };
    case 'explainer':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['explainer'] },
          title: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', enum: ['Inti', 'Analogi', 'Contoh', 'TL;DR'] },
                body: { type: 'string' },
              },
              required: ['label', 'body'],
            },
          },
          keyTerms: { type: 'array', items: { type: 'string' } },
        },
        required: ['kind', 'title', 'sections'],
      };
    case 'socratic':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['socratic'] },
          question: { type: 'string' },
          hints: { type: 'array', items: { type: 'string' } },
          depth: { type: 'integer' },
        },
        required: ['kind', 'question', 'hints'],
      };
  }
}
