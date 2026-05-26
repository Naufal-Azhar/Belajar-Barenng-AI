'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ChatStream from '@/components/ChatStream';
import DocumentUploader from '@/components/DocumentUploader';
import LoadingCat from '@/components/LoadingCat';
import type { ModeLayoutProps } from './LayoutRouter';

/**
 * Penjelas_Layout (Req 4.5). Chat AI↔user dengan composer yang menyertakan
 * inline DocumentUploader.
 */
export default function PenjelasLayout(props: ModeLayoutProps) {
  const {
    session,
    messages,
    isStreaming,
    onSend,
    onQuizAnswer,
    onLatihanAttempt,
    onAskTerm,
    onAskDeeper,
    onSocraticThought,
    onSocraticConfused,
    onAskSimilar,
    onAskHarder,
  } = props;

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleUploadComplete = ({ fileName }: { fileName: string }) => {
    onSend(
      `Saya sudah upload file "${fileName}". Tolong jelaskan isi materi ini.`,
      { intent: 'document-uploaded', actionLabel: `Upload: ${fileName}` },
    );
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <ChatStream
        messages={messages}
        isStreaming={isStreaming}
        onQuizAnswer={onQuizAnswer}
        onLatihanAttempt={onLatihanAttempt}
        onAskTerm={onAskTerm}
        onAskDeeper={onAskDeeper}
        onSocraticThought={onSocraticThought}
        onSocraticConfused={onSocraticConfused}
        onAskSimilar={onAskSimilar}
        onAskHarder={onAskHarder}
      />

      {/* Composer with inline DocumentUploader (Req 4.5) */}
      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="border-t border-hairline bg-canvas px-4 py-3"
      >
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <DocumentUploader
            sessionId={session.sessionId}
            onUploadComplete={handleUploadComplete}
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ketik pertanyaan..."
            className="input flex-1 min-w-0"
            disabled={isStreaming}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="btn-primary shrink-0"
          >
            {isStreaming ? (
              /* EDIT CAPTION: Penjelas send button (caption opsional, kucing-only OK) */
              <LoadingCat variant="button" caption="" />
            ) : (
              <><span className="hidden sm:inline">Kirim</span><span className="sm:hidden">→</span></>
            )}
          </motion.button>
        </div>
      </motion.footer>
    </div>
  );
}
