// Markdown Compiler (Req 16)
// Server-side compilation: PDF → Gemini multimodal → Markdown
//                         DOCX → mammoth → Markdown
// Output: Compiled_Markdown teks-saja. Byte mentah TIDAK PERNAH dikembalikan.

import mammoth from 'mammoth';
import { CompilerError } from './validation';
import { GeminiError } from './validation';
import { getGeminiClient, pdfBufferToBase64 } from './gemini-client';
import { PDF_MIME, DOCX_MIME } from './validation';
import type { MaterialMimeType } from './types';

export interface CompileResult {
  compiledMarkdown: string;
  warnings?: string[];
}

export interface MarkdownCompiler {
  compilePdf(args: { pdfBase64: string }): Promise<CompileResult>;
  compileDocx(args: { buffer: Buffer }): Promise<CompileResult>;
  compile(args: { mimeType: MaterialMimeType; buffer: Buffer }): Promise<CompileResult>;
}

const PDF_INSTRUCTION =
  'Ekstrak konten utama PDF ini sebagai Markdown teks-saja untuk konteks belajar. ' +
  'Jangan sertakan gambar atau image data, hanya struktur dokumen (headings, list, tabel sederhana, paragraf). ' +
  'Pertahankan urutan asli. Output harus berupa Markdown valid tanpa code fence pembungkus.';

/**
 * Konversi HTML hasil mammoth ke Markdown.
 * Subset tag yang dikeluarkan mammoth: h1-h6, p, ul, ol, li, strong, em, a, br.
 * Implementasi in-house — tidak perlu dependency turndown untuk MVP.
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Headings (h1-h6)
  for (let level = 6; level >= 1; level--) {
    const prefix = '#'.repeat(level);
    md = md.replace(
      new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'),
      (_m, content: string) => `\n\n${prefix} ${stripTags(content).trim()}\n\n`,
    );
  }

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, content: string) => {
    return `\n\n${inlineHtmlToMd(content).trim()}\n\n`;
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, content: string) => {
    let counter = 0;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li, item: string) => {
      counter += 1;
      return `${counter}. ${inlineHtmlToMd(item).trim()}\n`;
    });
    return `\n\n${items}\n`;
  });

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, content: string) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li, item: string) => {
      return `- ${inlineHtmlToMd(item).trim()}\n`;
    });
    return `\n\n${items}\n`;
  });

  // Apply remaining inline conversions
  md = inlineHtmlToMd(md);

  // Collapse 3+ newlines to 2
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

function inlineHtmlToMd(s: string): string {
  return s
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, ''); // strip remaining tags
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

class DefaultMarkdownCompiler implements MarkdownCompiler {
  async compilePdf({ pdfBase64 }: { pdfBase64: string }): Promise<CompileResult> {
    try {
      const gemini = getGeminiClient();
      const text = await gemini.extractFromPdf({
        pdfBase64,
        mimeType: 'application/pdf',
        instruction: PDF_INSTRUCTION,
      });
      return { compiledMarkdown: text };
    } catch (err) {
      // Re-wrap GeminiError sebagai CompilerError supaya /api/upload bisa map
      if (err instanceof GeminiError) {
        throw new CompilerError(`PDF compilation failed: ${err.message}`, err);
      }
      throw new CompilerError(
        `PDF compilation failed: ${(err as Error).message}`,
        err,
      );
    }
  }

  async compileDocx({ buffer }: { buffer: Buffer }): Promise<CompileResult> {
    try {
      // Coba HTML dulu agar struktur (heading, list) terjaga
      const html = await mammoth.convertToHtml({ buffer });
      const compiledMarkdown = htmlToMarkdown(html.value);

      // Jika hasil kosong/terlalu pendek, fallback ke raw text
      if (compiledMarkdown.trim().length < 20) {
        const raw = await mammoth.extractRawText({ buffer });
        return {
          compiledMarkdown: raw.value.trim(),
          warnings: html.messages.map((m) => m.message),
        };
      }
      return {
        compiledMarkdown,
        warnings: html.messages.map((m) => m.message),
      };
    } catch (err) {
      throw new CompilerError(
        `DOCX compilation failed: ${(err as Error).message}`,
        err,
      );
    }
  }

  async compile({
    mimeType,
    buffer,
  }: {
    mimeType: MaterialMimeType;
    buffer: Buffer;
  }): Promise<CompileResult> {
    if (mimeType === PDF_MIME) {
      return this.compilePdf({ pdfBase64: pdfBufferToBase64(buffer) });
    }
    if (mimeType === DOCX_MIME) {
      return this.compileDocx({ buffer });
    }
    throw new CompilerError(`Unsupported MIME type: ${mimeType}`);
  }
}

let _compiler: MarkdownCompiler | null = null;

export function getMarkdownCompiler(): MarkdownCompiler {
  if (!_compiler) {
    _compiler = new DefaultMarkdownCompiler();
  }
  return _compiler;
}

/** For testing: inject a mock compiler. */
export function setMarkdownCompiler(compiler: MarkdownCompiler): void {
  _compiler = compiler;
}
