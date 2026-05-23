// Markdown Compiler (Req 16)
// Server-side compilation: PDF → pdf-parse → Markdown
//                         DOCX → mammoth → Markdown
// Output: Compiled_Markdown teks-saja. Byte mentah TIDAK PERNAH dikembalikan.

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { CompilerError } from './validation';
import { PDF_MIME, DOCX_MIME } from './validation';
import type { MaterialMimeType } from './types';

export interface CompileResult {
  compiledMarkdown: string;
  warnings?: string[];
}

export interface MarkdownCompiler {
  compilePdf(args: { buffer: Buffer }): Promise<CompileResult>;
  compileDocx(args: { buffer: Buffer }): Promise<CompileResult>;
  compile(args: { mimeType: MaterialMimeType; buffer: Buffer }): Promise<CompileResult>;
}

/**
 * Convert raw extracted text to basic Markdown.
 * Detects ALL-CAPS or short title-case lines as H2 headings.
 */
export function rawTextToMarkdown(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const lines: string[] = [];

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Detect heading: ALL-CAPS line ≤ 80 chars, or short title-case ≤ 60 chars
    if (trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      lines.push(`\n## ${trimmed}\n`);
    } else if (trimmed.length <= 60 && /^[A-Z]/.test(trimmed) && !trimmed.includes('.')) {
      lines.push(`\n## ${trimmed}\n`);
    } else {
      lines.push(trimmed);
    }
  }

  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Konversi HTML hasil mammoth ke Markdown.
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  for (let level = 6; level >= 1; level--) {
    const prefix = '#'.repeat(level);
    md = md.replace(
      new RegExp(`<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'gi'),
      (_m, content: string) => `\n\n${prefix} ${stripTags(content).trim()}\n\n`,
    );
  }

  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, content: string) => `\n\n${inlineHtmlToMd(content).trim()}\n\n`);

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, content: string) => {
    let counter = 0;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li, item: string) => {
      counter += 1;
      return `${counter}. ${inlineHtmlToMd(item).trim()}\n`;
    });
    return `\n\n${items}\n`;
  });

  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, content: string) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li, item: string) => `- ${inlineHtmlToMd(item).trim()}\n`);
    return `\n\n${items}\n`;
  });

  md = inlineHtmlToMd(md);
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
    .replace(/<[^>]+>/g, '');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

class DefaultMarkdownCompiler implements MarkdownCompiler {
  async compilePdf({ buffer }: { buffer: Buffer }): Promise<CompileResult> {
    try {
      const data = await pdfParse(buffer);
      const compiledMarkdown = rawTextToMarkdown(data.text);
      return { compiledMarkdown };
    } catch (err) {
      throw new CompilerError(`PDF compilation failed: ${(err as Error).message}`, err);
    }
  }

  async compileDocx({ buffer }: { buffer: Buffer }): Promise<CompileResult> {
    try {
      const html = await mammoth.convertToHtml({ buffer });
      const compiledMarkdown = htmlToMarkdown(html.value);

      if (compiledMarkdown.trim().length < 20) {
        const raw = await mammoth.extractRawText({ buffer });
        return { compiledMarkdown: raw.value.trim(), warnings: html.messages.map((m) => m.message) };
      }
      return { compiledMarkdown, warnings: html.messages.map((m) => m.message) };
    } catch (err) {
      throw new CompilerError(`DOCX compilation failed: ${(err as Error).message}`, err);
    }
  }

  async compile({ mimeType, buffer }: { mimeType: MaterialMimeType; buffer: Buffer }): Promise<CompileResult> {
    if (mimeType === PDF_MIME) return this.compilePdf({ buffer });
    if (mimeType === DOCX_MIME) return this.compileDocx({ buffer });
    throw new CompilerError(`Unsupported MIME type: ${mimeType}`);
  }
}

let _compiler: MarkdownCompiler | null = null;

export function getMarkdownCompiler(): MarkdownCompiler {
  if (!_compiler) _compiler = new DefaultMarkdownCompiler();
  return _compiler;
}

export function setMarkdownCompiler(compiler: MarkdownCompiler): void {
  _compiler = compiler;
}
