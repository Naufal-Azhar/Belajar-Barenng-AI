'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import LoadingCat from './LoadingCat';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface Props {
  sessionId: string;
  /** Dipanggil saat upload sukses dengan metadata file. */
  onUploadComplete: (info: { fileName: string; mimeType: string }) => void;
  /** Optional: dipanggil saat user pertama kali memilih file (sebelum compile). */
  onUploadStart?: () => void;
  /** Variant tampilan: 'compact' (di footer composer) atau 'card' (di Quiz Wizard). */
  variant?: 'compact' | 'card';
}

export default function DocumentUploader({
  sessionId,
  onUploadComplete,
  onUploadStart,
  variant = 'compact',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [icon, setIcon] = useState<string>('📎');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== PDF_MIME && file.type !== DOCX_MIME) {
      setError('Hanya file PDF atau DOCX yang didukung');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file melebihi batas 10 MB');
      return;
    }

    setError(null);
    setUploading(true);
    onUploadStart?.();

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal upload file');
        return;
      }

      const data = await res.json();
      setFileName(data.fileName);
      setIcon(data.mimeType === DOCX_MIME ? '📝' : '📄');
      onUploadComplete({ fileName: data.fileName, mimeType: data.mimeType });
    } catch {
      setError('Gagal upload file. Coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  // --- Card variant (untuk Quiz Wizard step 1) ---
  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={`${PDF_MIME},${DOCX_MIME},.pdf,.docx`}
          onChange={handleFileChange}
          className="hidden"
        />

        {fileName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-cream w-full text-center"
          >
            <div className="text-4xl mb-2">{icon}</div>
            <p className="text-title-sm font-sans text-ink mb-1">{fileName}</p>
            <p className="text-caption text-success">✓ Materi siap dipakai</p>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="card-cream w-full text-center hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                {/* EDIT CAPTION: PDF upload drop zone */}
                <LoadingCat variant="inline" caption="Lagi baca dokumen kamu..." />
                <p className="text-caption text-muted">Maks 10 MB · materi pelajaran</p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📎</div>
                <p className="text-title-sm font-sans text-ink mb-1">
                  Upload PDF atau DOCX
                </p>
                <p className="text-caption text-muted">Maks 10 MB · materi pelajaran</p>
              </>
            )}
          </motion.button>
        )}

        {error && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-caption text-error"
          >
            {error}
          </motion.span>
        )}
      </div>
    );
  }

  // --- Compact variant (default) ---
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={`${PDF_MIME},${DOCX_MIME},.pdf,.docx`}
        onChange={handleFileChange}
        className="hidden"
      />

      {fileName ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 rounded-md bg-success/10 border border-success/20 px-3 py-1.5 text-caption font-sans text-success"
        >
          <span>{icon}</span>
          <span className="max-w-[100px] truncate">{fileName}</span>
          <span>✓</span>
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md border border-hairline bg-canvas px-3 py-2 text-caption font-sans font-medium text-muted hover:bg-surface-soft transition-colors disabled:opacity-50"
        >
          {uploading ? (
            /* EDIT CAPTION: PDF upload submit button */
            <LoadingCat variant="button" caption="Mengirim..." />
          ) : (
            <>
              <span>📎</span>
              <span>PDF/DOCX</span>
            </>
          )}
        </motion.button>
      )}

      {error && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-caption text-error"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}
