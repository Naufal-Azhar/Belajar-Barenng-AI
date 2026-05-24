import { NextRequest } from 'next/server';
import {
  chatBodySchema,
  FirestoreError,
  LLMError,
  quizPayloadSchema,
  latihanPayloadSchema,
  explainerPayloadSchema,
  socraticPayloadSchema,
  SchemaValidationError,
} from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';
import { getLLMClient } from '@/lib/llm-client';
import { buildSystemPrompt, BASE_TONE_GENERAL } from '@/lib/prompt-builder';
import { createSseStream } from '@/lib/sse';
import { isNonAcademic } from '@/lib/intent';
import { generateAutoTitle } from '@/lib/auto-title';
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

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return Response.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: 'Pesan terlalu panjang (max 4000 karakter)' }, { status: 400 });
    }

    const repo = getSessionRepository();
    const session = await repo.get(sessionId);

    if (!session) {
      return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (session.endedAt) {
      return Response.json({ error: 'Sesi sudah berakhir, tidak bisa lanjut chat' }, { status: 409 });
    }

    if (session.isArchived) {
      return Response.json({ error: 'Sesi sudah dihapus' }, { status: 404 });
    }

    const activeMode: LearningMode = mode || session.currentMode;
    if (mode && mode !== session.currentMode) {
      await repo.update(sessionId, { currentMode: mode });
    }

    // Auto-title: set title pada first user message kalau session belum punya title.
    // Tidak menimpa title yang sudah di-rename user secara manual.
    if (!session.title || session.title.trim().length === 0) {
      const autoTitle = generateAutoTitle(trimmedMessage);
      await repo.updateTitle(sessionId, autoTitle);
    } else {
      // Bump updatedAt agar sesi naik ke atas di sidebar
      await repo.touch(sessionId);
    }

    await repo.appendMessage(sessionId, {
      sessionId,
      role: 'user',
      mode: activeMode,
      content: trimmedMessage,
      createdAt: new Date().toISOString(),
    });

    const messages = await repo.listMessages(sessionId);
    const history = messages.slice(0, -1).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    const systemPrompt = buildSystemPrompt({
      profile: session.profileType,
      mode: activeMode,
      documentContext: session.documentContext,
      topic: session.topic,
    });

    const llm = getLLMClient();
    const { stream, write, close } = createSseStream();

    console.log('[chat] mode=%s msg-len=%d', activeMode, trimmedMessage.length);

    type AnyPayload = ExplainerPayload | SocraticPayload | QuizPayload | LatihanPayload;

    (async () => {
      try {
        // Non-academic messages → stream plain text
        if (isNonAcademic(trimmedMessage)) {
          let fullText = '';
          for await (const chunk of llm.streamText({ systemPrompt: BASE_TONE_GENERAL, history, userMessage: trimmedMessage })) {
            fullText += chunk;
            write({ type: 'text-chunk', data: { text: chunk } });
          }
          const aiMsg = await repo.appendMessage(sessionId, {
            sessionId,
            role: 'ai',
            mode: activeMode,
            content: fullText,
            createdAt: new Date().toISOString(),
          });
          write({ type: 'done', data: { messageId: aiMsg.messageId } });
          return;
        }

        const schema = buildSchemaForMode(activeMode);

        const payload = await llm.generateStructured<AnyPayload>({
          systemPrompt,
          history,
          userMessage: trimmedMessage,
          schemaName: activeMode,
          schemaDescription: JSON.stringify(schema),
        });

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
        console.error('[chat] AI error:', (err as Error).message || err);
        if (err instanceof LLMError || err instanceof SchemaValidationError) {
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
      return Response.json({ error: 'Layanan penyimpanan belum tersedia, coba lagi' }, { status: 503 });
    }
    return Response.json({ error: 'Terjadi kesalahan tak terduga' }, { status: 500 });
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
          steps: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' } }, required: ['title', 'detail'] } },
        },
        required: ['kind', 'question', 'steps'],
      };
    case 'explainer':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['explainer'] },
          title: { type: 'string' },
          sections: { type: 'array', items: { type: 'object', properties: { label: { type: 'string', enum: ['Inti', 'Analogi', 'Contoh', 'TL;DR'] }, body: { type: 'string' } }, required: ['label', 'body'] } },
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
