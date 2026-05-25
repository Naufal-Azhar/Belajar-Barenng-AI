import { z } from 'zod';

// --- Domain schemas ---

export const learningModeSchema = z.enum(['explainer', 'socratic', 'quiz', 'latihan']);

export const quizPayloadSchema = z.object({
  kind: z.literal('quiz'),
  type: z.enum(['mcq', 'essay']),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

export const latihanPayloadSchema = z.object({
  kind: z.literal('latihan'),
  question: z.string().min(1),
  steps: z.array(
    z.object({
      title: z.string().min(1),
      detail: z.string().min(1),
    })
  ).min(1),
});

export const explainerPayloadSchema = z.object({
  kind: z.literal('explainer'),
  title: z.string().min(1),
  sections: z
    .array(
      z.object({
        label: z.enum(['Inti', 'Analogi', 'Contoh', 'TL;DR']),
        body: z.string().min(1),
      })
    )
    .min(1),
  keyTerms: z.array(z.string()).optional(),
});

export const socraticPayloadSchema = z.object({
  kind: z.literal('socratic'),
  question: z.string().min(1),
  hints: z.array(z.string()).min(1),
  depth: z.number().int().nonnegative().optional(),
});

export const summaryPayloadSchema = z.object({
  topicsCovered: z.array(z.string()).min(1),
  keyPoints: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
  createdAt: z.string(),
});

// --- Request body schemas ---

// POST /api/sessions tidak butuh body sekarang — sesi diciptakan dengan ownerType+ownerId saja
export const createSessionBodySchema = z.object({}).passthrough();

export const chatBodySchema = z.object({
  sessionId: z.string().min(1),
  message: z.string(),
  mode: learningModeSchema.optional(),
});

export const summaryBodySchema = z.object({
  sessionId: z.string().min(1),
});

// PATCH /api/sessions/:id body — rename session
export const updateSessionTitleSchema = z.object({
  title: z.string().min(1).max(100),
});

// --- ASRM schemas ---

export const extractBodySchema = z.object({
  sessionId: z.string().min(1),
  deviceId: z.string().min(1),
});

export const extractedCardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  concept: z.string().min(1),
});

export const saveCardsBodySchema = z.object({
  deviceId: z.string().min(1),
  sessionId: z.string().min(1),
  cards: z.array(extractedCardSchema).min(1).max(10),
});

export const reviewBodySchema = z.object({
  cardId: z.string().min(1),
  deviceId: z.string().min(1),
  userAnswer: z.string().min(1),
});

// --- Upload validation ---

export const MAX_MATERIAL_SIZE = 10 * 1024 * 1024; // 10 MB

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const ALLOWED_MATERIAL_MIMES = [PDF_MIME, DOCX_MIME] as const;

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; status: 400 | 413; error: string };

export function validateUpload(mimeType: string, sizeBytes: number): UploadValidationResult {
  // MIME check first (Req 2.7)
  if (!ALLOWED_MATERIAL_MIMES.includes(mimeType as typeof ALLOWED_MATERIAL_MIMES[number])) {
    return { ok: false, status: 400, error: 'Hanya file PDF atau DOCX yang didukung' };
  }
  // Size check (Req 2.6)
  if (sizeBytes > MAX_MATERIAL_SIZE) {
    return { ok: false, status: 413, error: 'Ukuran file melebihi batas 10 MB' };
  }
  return { ok: true };
}

// --- Custom errors ---

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

/** @deprecated Use LLMError instead */
export const GeminiError = LLMError;

export class FirestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestoreError';
  }
}

/**
 * Markdown_Compiler error (Req 16.7).
 * /api/upload memetakan ini ke HTTP 502 dan TIDAK menulis Document_Context parsial.
 */
export class CompilerError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CompilerError';
  }
}
