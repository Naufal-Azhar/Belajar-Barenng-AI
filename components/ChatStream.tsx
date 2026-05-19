'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Message, ExplainerSectionLabel } from '@/lib/types';
import MessageBubble from './MessageBubble';
import QuizComponent from './QuizComponent';
import LatihanComponent from './LatihanComponent';
import ExplainerComponent from './ExplainerComponent';
import SocraticComponent from './SocraticComponent';
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

      {messages.map((msg, idx) => {
        if (msg.role === 'ai' && msg.payload) {
          switch (msg.payload.kind) {
            case 'explainer':
              return (
                <ExplainerComponent
                  key={idx}
                  payload={msg.payload}
                  onAskTerm={onAskTerm}
                  onAskDeeper={onAskDeeper}
                />
              );
            case 'socratic':
              return (
                <SocraticComponent
                  key={idx}
                  payload={msg.payload}
                  onSubmitThought={onSocraticThought ?? (() => {})}
                  onConfused={onSocraticConfused}
                />
              );
            case 'quiz':
              return (
                <QuizComponent
                  key={idx}
                  payload={msg.payload}
                  onSubmitAnswer={onQuizAnswer}
                  onAskSimilar={onAskSimilar}
                  onAskHarder={onAskHarder}
                />
              );
            case 'latihan':
              return (
                <LatihanComponent
                  key={idx}
                  payload={msg.payload}
                  onSubmitAttempt={onLatihanAttempt}
                />
              );
          }
        }

        return (
          <MessageBubble key={idx} role={msg.role} content={msg.content} />
        );
      })}

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
