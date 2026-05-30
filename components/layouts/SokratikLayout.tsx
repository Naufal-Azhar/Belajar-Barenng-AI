'use client';

import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import MessageRenderer from '@/components/MessageRenderer';
import LoadingCat from '@/components/LoadingCat';
import RailToggle from '@/components/RailToggle';
import type { ModeLayoutProps } from './LayoutRouter';
import type { Message, SocraticPayload } from '@/lib/types';

/**
 * Sokratik_Layout (Req 5). Two-column dengan rail kanan persistent berisi
 * depth indicator + hint stack 3 level + quick replies. Pola dari riset
 * Khanmigo + Paul-Elder Critical Thinking Framework.
 *
 * Mobile: rail collapse jadi bottom-sheet drawer (toggle).
 */
export default function SokratikLayout(props: ModeLayoutProps) {
  const {
    messages,
    isStreaming,
    onSend,
    onSocraticThought,
    onSocraticConfused,
  } = props;

  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Cari payload Sokratik terakhir untuk depth + hints di rail kanan
  const lastSocraticAi = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'ai' && m.payload && m.payload.kind === 'socratic') {
        return m.payload as SocraticPayload;
      }
    }
    return null;
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleQuickReply = (q: string) => {
    if (q === 'Saya bingung') {
      onSocraticConfused();
      return;
    }
    setInput((prev) => (prev ? prev : q + ' '));
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-1 min-h-0 md:flex-row flex-col">
      {/* Kolom kiri: chat + composer */}
      <section className="flex flex-1 min-w-0 flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4">
          {messages.length === 0 && (
            <EmptySocraticHint />
          )}
          {messages.map((msg, idx) => (
            <MessageRenderer
              key={idx}
              message={msg}
              activeMode="socratic"
              handlers={{
                onSubmitThought: onSocraticThought,
                onConfused: onSocraticConfused,
              }}
            />
          ))}
          {isStreaming && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-hairline bg-canvas px-4 py-3"
        >
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
              }}
              placeholder="Aku rasa..."
              rows={2}
              className="input flex-1 min-w-0 resize-none"
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="btn-primary"
            >
              {isStreaming ? '...' : 'Kirim'}
            </button>
            {/* Mobile: tombol buka drawer rail */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden rounded-md border border-hairline bg-canvas px-3 py-2 text-caption text-muted"
            >
              📊
            </button>
          </div>
        </motion.footer>
      </section>

      {/* Rail kanan (desktop ≥ 768px) — bisa di-collapse */}
      <RailToggle open={railOpen} onToggle={() => setRailOpen((v) => !v)} label="petunjuk" />
      {railOpen && (
        <SokratikRail
          payload={lastSocraticAi}
          onQuickReply={handleQuickReply}
          className="hidden md:flex"
        />
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-xl bg-canvas border-t border-hairline shadow-subtle p-4 max-h-[70vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-caption-upper uppercase tracking-wider text-muted">
              Petunjuk Sokratik
            </span>
            <button onClick={() => setDrawerOpen(false)} className="text-muted">
              ✕
            </button>
          </div>
          <SokratikRail
            payload={lastSocraticAi}
            onQuickReply={(q) => {
              handleQuickReply(q);
              setDrawerOpen(false);
            }}
            className="flex"
            mobileMode
          />
        </motion.div>
      )}
    </div>
  );
}

interface RailProps {
  payload: SocraticPayload | null;
  onQuickReply: (q: string) => void;
  className?: string;
  mobileMode?: boolean;
}

function SokratikRail({ payload, onQuickReply, className = '', mobileMode = false }: RailProps) {
  return (
    <aside
      style={!mobileMode ? { width: 'clamp(280px, 22vw, 320px)' } : undefined}
      className={`${className} flex-col gap-4 ${
        mobileMode
          ? ''
          : 'sticky top-0 self-start h-[calc(100vh-64px)] overflow-y-auto'
      } border-l border-hairline bg-surface-card p-5`}
    >
      {/* Depth indicator */}
      <div className="text-center">
        <div className="text-caption-upper uppercase tracking-wider text-muted mb-1">
          Kedalaman Diskusi
        </div>
        <div className="font-serif text-display-md text-ink leading-none">
          {payload?.depth ?? 1}
        </div>
        <div className="text-caption text-muted-soft mt-1">
          {(payload?.depth ?? 1) === 1 ? 'Tahap awal' : 'Lebih dalam'}
        </div>
      </div>

      <hr className="border-hairline-soft" />

      {/* Hint stack — visual progress 3 dot */}
      <div>
        <div className="text-caption-upper uppercase tracking-wider text-muted mb-2">
          Petunjuk
        </div>
        <p className="text-body-sm text-muted">
          Komponen pertanyaan di bawah punya tombol untuk reveal hint bertahap (samar → spesifik).
          Coba dulu sebelum buka.
        </p>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-2 w-2 rounded-full bg-hairline"
              aria-hidden
            />
          ))}
        </div>
      </div>

      <hr className="border-hairline-soft" />

      {/* Quick replies */}
      <div>
        <div className="text-caption-upper uppercase tracking-wider text-muted mb-2">
          Awali jawabanmu
        </div>
        <div className="flex flex-col gap-2">
          {['Aku rasa...', 'Mungkin karena...', 'Saya bingung'].map((q) => (
            <button
              key={q}
              onClick={() => onQuickReply(q)}
              className="text-left rounded-md border border-hairline bg-canvas px-3 py-2 text-body-sm text-body hover:border-primary hover:text-primary transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function EmptySocraticHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-cream max-w-md mx-auto text-center"
    >
      <div className="mb-3 flex justify-center">
        <video
          src="/writing-on-book.webm"
          autoPlay
          loop
          muted
          playsInline
          aria-label="Mode Sokratik"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
          className="block select-none max-w-[200px] sm:max-w-none"
        />
      </div>
      <h3 className="font-serif text-title-lg text-ink mb-1">Mode Sokratik</h3>
      <p className="text-body-sm text-muted">
        Aku gak akan langsung kasih jawaban. Aku akan ajukan pertanyaan
        yang bantu kamu nyampe jawabannya sendiri. Mulai dari topik yang ingin kamu pahami.
      </p>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      {/* EDIT CAPTION: Sokratik typing */}
      <LoadingCat caption="Lagi nyusun pertanyaan..." />
    </div>
  );
}

// References for messages array (avoid unused import warning when not used)
export type { Message };
