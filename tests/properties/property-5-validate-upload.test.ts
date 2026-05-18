// Property 5: Upload validation rejects invalid input.
// Validates: Requirements 2.5, 2.6, 2.7
// Tag: Feature: belajar-bareng-ai, Property 5: Upload validation rejects invalid input

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateUpload, MAX_MATERIAL_SIZE, PDF_MIME, DOCX_MIME } from '@/lib/validation';
import { FC_DEFAULTS } from '../helpers/fast-check-config';

const someUnknownMimes = [
  'image/png',
  'application/json',
  'text/plain',
  'application/zip',
  'application/msword',
  '',
  'application/octet-stream',
];

describe('Property 5: Upload validation rejects invalid input', () => {
  it('PDF ≤ 10MB → ok', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_MATERIAL_SIZE }), (size) => {
        const r = validateUpload(PDF_MIME, size);
        expect(r.ok).toBe(true);
      }),
      FC_DEFAULTS,
    );
  });

  it('DOCX ≤ 10MB → ok', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_MATERIAL_SIZE }), (size) => {
        const r = validateUpload(DOCX_MIME, size);
        expect(r.ok).toBe(true);
      }),
      FC_DEFAULTS,
    );
  });

  it('PDF or DOCX > 10MB → 413 with size message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(PDF_MIME, DOCX_MIME),
        fc.integer({ min: MAX_MATERIAL_SIZE + 1, max: MAX_MATERIAL_SIZE * 2 }),
        (mime, size) => {
          const r = validateUpload(mime, size);
          expect(r).toEqual({
            ok: false,
            status: 413,
            error: 'Ukuran file melebihi batas 10 MB',
          });
        },
      ),
      FC_DEFAULTS,
    );
  });

  it('non-PDF and non-DOCX MIME → 400 with PDF/DOCX message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...someUnknownMimes),
        fc.integer({ min: 0, max: MAX_MATERIAL_SIZE }),
        (mime, size) => {
          const r = validateUpload(mime, size);
          expect(r).toEqual({
            ok: false,
            status: 400,
            error: 'Hanya file PDF atau DOCX yang didukung',
          });
        },
      ),
      FC_DEFAULTS,
    );
  });
});
