'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Message, ExplainerSectionLabel } from '@/lib/types';
import MessageRenderer from './MessageRenderer';
import LoadingCat from './LoadingCat';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onQuizAnswer: (answer: string) => void;
  onLatihanAttempt: (attempt: string) => void;
  onAskTerm?: (term: string) => void;
  onAskDeeper?: (sectionLabel: ExplainerSectionLabel) => void;
  onSocraticThought?: (thought: string) => void;
  onSocraticConfused?: () => void;
  onAskSimilar?: () => void;
  onAskHarder?: () => void;
}

/**
 * ChatStream — render area chat untuk mode Penjelas (PenjelasLayout pakai
 * komponen ini). Setelah refactor Task 6, switch statement decision tree
 * dipindah ke <MessageRenderer> agar konsisten dengan layout lain
 * (Sokratik/Kuis/Latihan).
 *
 * Empty state ("Mau belajar apa?") + LoadingCat tetap di sini karena
 * spesifik ke pola visual chat (bukan per-message).
 */
export default function ChatStream({
  messages,
  isStreaming,
  onQuizAnswer,
  onLatihanAttempt,
  onAskTerm,
  onAskDeeper,
  onSocraticThought,
  onSocraticConfused,
  onAskSimilar,
  onAskHarder,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center max-w-sm"
          >
            {/* Pixel fire mark */}
            <div className="mb-4 flex justify-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <video
                  src="/pixel-fire.webm"
                  width={64}
                  height={64}
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  className="w-16 h-16 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>
            </div>
            <h2 className="font-serif text-display-sm text-ink mb-2">
              Mau belajar apa?
            </h2>
            <p className="text-body-sm text-muted">
              Ketik topik atau upload PDF materi kamu. 
              Aku siap bantu jelasin dengan cara yang paling masuk di kepala.
            </p>
          </motion.div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageRenderer
          key={idx}
          message={msg}
          activeMode="explainer"
          handlers={{
            onAskTerm,
            onAskDeeper,
            onSubmitAnswer: onQuizAnswer,
            onSubmitAttempt: onLatihanAttempt,
            onSubmitThought: onSocraticThought,
            onConfused: onSocraticConfused,
            onAskSimilar,
            onAskHarder,
          }}
        />
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          {/* EDIT CAPTION: ChatStream typing indicator */}
          <LoadingCat caption="Lagi mikir..." />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
