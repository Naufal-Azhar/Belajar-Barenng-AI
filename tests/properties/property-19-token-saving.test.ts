// Property 19: Token-saving invariant — no raw bytes in prompts.
// Validates: Requirements 16.4, 16.5
// Tag: Feature: belajar-bareng-ai, Property 19: No raw bytes in prompts

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { FC_DEFAULTS } from '../helpers/fast-check-config';
import type {
  LearningMode,
  DocumentContext,
  MaterialMimeType,
} from '@/lib/types';

const MODES: LearningMode[] = ['explainer', 'socratic', 'quiz', 'latihan'];
const MIMES: MaterialMimeType[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Generator markdown text yang “normal” — tidak mengandung magic bytes / base64 long-run.
// Pakai fc.string dengan filter, hindari char yang membentuk magic bytes secara kebetulan.
const SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,?!#-:\n\t';
const safeMarkdownArb = fc
  .stringOf(fc.constantFrom(...SAFE_CHARS.split('')), { minLength: 20, maxLength: 400 })
  .filter((s) => !/%PDF-|PK\x03\x04|[A-Za-z0-9+/]{200,}={0,2}/.test(s));

const docContextArb: fc.Arbitrary<DocumentContext> = fc.record({
  fileName: fc.constantFrom('materi.pdf', 'modul.docx', 'slide.pdf'),
  sizeBytes: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
  mimeType: fc.constantFrom(...MIMES),
  compiledMarkdown: safeMarkdownArb,
  uploadedAt: fc.constant(new Date().toISOString()),
});

const modeArb = fc.constantFrom(...MODES);
const topicArb = fc.option(fc.string({ minLength: 0, maxLength: 60 }), { nil: undefined });

const BASE64_LONG_RUN = /[A-Za-z0-9+/]{200,}={0,2}/;
const PDF_HEADER = '%PDF-';
const ZIP_SIG = 'PK\x03\x04';

describe('Property 19: Token-saving invariant — no raw bytes in prompts', () => {
  it('prompt contains compiledMarkdown but never raw PDF/DOCX bytes', () => {
    fc.assert(
      fc.property(modeArb, docContextArb, topicArb, (mode, ctx, topic) => {
        const prompt = buildSystemPrompt({
          mode,
          documentContext: ctx,
          topic: topic as string | undefined,
        });

        // Sanity: harus mengandung compiledMarkdown
        expect(prompt).toContain(ctx.compiledMarkdown);

        // No PDF magic header
        expect(prompt.includes(PDF_HEADER)).toBe(false);
        // No DOCX/ZIP signature
        expect(prompt.includes(ZIP_SIG)).toBe(false);
        // No long base64 run (heuristic untuk byte mentah)
        expect(BASE64_LONG_RUN.test(prompt)).toBe(false);
      }),
      FC_DEFAULTS,
    );
  });

  it('prompt without documentContext stays bytes-free as well', () => {
    fc.assert(
      fc.property(modeArb, topicArb, (mode, topic) => {
        const prompt = buildSystemPrompt({
          mode,
          topic: topic as string | undefined,
        });
        expect(prompt.includes(PDF_HEADER)).toBe(false);
        expect(prompt.includes(ZIP_SIG)).toBe(false);
        expect(BASE64_LONG_RUN.test(prompt)).toBe(false);
      }),
      FC_DEFAULTS,
    );
  });
});
