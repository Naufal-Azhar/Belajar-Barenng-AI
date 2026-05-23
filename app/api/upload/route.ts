import { NextRequest } from 'next/server';
import {
  validateUpload,
  FirestoreError,
  CompilerError,
  PDF_MIME,
  DOCX_MIME,
} from '@/lib/validation';
import { getSessionRepository } from '@/lib/session-repository';
import { getMarkdownCompiler } from '@/lib/markdown-compiler';
import { uploadFile } from '@/lib/storage';
import type { DocumentContext, MaterialMimeType } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const file = formData.get('file') as File | null;

    if (!sessionId) {
      return Response.json({ error: 'Session ID diperlukan' }, { status: 400 });
    }

    if (!file) {
      return Response.json({ error: 'File diperlukan' }, { status: 400 });
    }

    // Validate session exists
    const repo = getSessionRepository();
    const session = await repo.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    // Validate MIME + size (PDF or DOCX, ≤ 10 MB)
    const validation = validateUpload(file.type, file.size);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }

    // Cache reuse (Req 16.6): jika file dengan name+size yang sama sudah pernah
    // di-compile untuk sesi ini, skip kompilasi ulang.
    const existing = session.documentContext;
    if (
      existing &&
      existing.fileName === file.name &&
      existing.sizeBytes === file.size &&
      existing.mimeType === file.type
    ) {
      return Response.json({
        fileName: existing.fileName,
        sizeBytes: existing.sizeBytes,
        mimeType: existing.mimeType,
        ready: true,
        cached: true,
      });
    }

    // Compile via Markdown_Compiler. Buffer mentah & base64 string keluar dari
    // scope di akhir block ini — tidak pernah ditulis ke Session_Store (Req 16.5).
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type as MaterialMimeType;

    const compiler = getMarkdownCompiler();
    const result = await compiler.compile({ mimeType, buffer });

    if (!result.compiledMarkdown.trim()) {
      // Edge case: dokumen kosong / blank — jangan tulis Document_Context parsial
      throw new CompilerError('Compiled markdown is empty');
    }

    const docContext: DocumentContext = {
      fileName: file.name,
      sizeBytes: file.size,
      mimeType,
      compiledMarkdown: result.compiledMarkdown,
      uploadedAt: new Date().toISOString(),
      ...(result.warnings && result.warnings.length > 0
        ? { compilerWarnings: result.warnings }
        : {}),
    };

    // Persist original file to Cloud Storage (non-blocking, best-effort)
    const gcsUri = await uploadFile(sessionId, file.name, buffer, mimeType).catch(() => null);
    if (gcsUri) docContext.gcsUri = gcsUri;

    await repo.setDocumentContext(sessionId, docContext);

    return Response.json({
      fileName: file.name,
      sizeBytes: file.size,
      mimeType,
      ready: true,
    });
  } catch (err) {
    if (err instanceof CompilerError) {
      // Req 16.7: pesan AI sibuk + TIDAK menulis Document_Context parsial
      return Response.json(
        { error: 'AI sedang sibuk, coba lagi sebentar' },
        { status: 502 },
      );
    }
    if (err instanceof FirestoreError) {
      return Response.json(
        { error: 'Layanan penyimpanan belum tersedia, coba lagi' },
        { status: 503 },
      );
    }
    return Response.json(
      { error: 'Terjadi kesalahan tak terduga' },
      { status: 500 },
    );
  }
}
