'use client';

import { useMemo, useState, useReducer, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { revealReducer } from '@/components/LatihanComponent';
import MessageRenderer from '@/components/MessageRenderer';
import RailToggle from '@/components/RailToggle';
import type { ModeLayoutProps } from './LayoutRouter';
import type { Message, LatihanPayload } from '@/lib/types';

/**
 * Latihan_Layout (Req 7). Two-column attempt-first:
 *  - Kiri: pertanyaan + textarea attempt + tombol Coba/Cek
 *           (setelah revealed.every(Boolean): tombol difficulty)
 *  - Kanan: rail steps reveal-on-demand (locked sebelum hasAttempted)
 *
 * Pola dari riset Khan Academy + Brilliant + Anki.
 */
export default function LatihanLayout(props: ModeLayoutProps) {
  const {
    messages,
    isStreaming,
    onSend,
    onLatihanAttempt,
    onLatihanEasier,
    onLatihanHarder,
    onLatihanNew,
  } = props;

  // Soal aktif = LatihanPayload terakhir
  const activeLatihan = useMemo<LatihanPayload | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'ai' && m.payload?.kind === 'latihan') {
        return m.payload as LatihanPayload;
      }
    }
    return null;
  }, [messages]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <LatihanHistorySection
        messages={messages}
        onLatihanAttempt={onLatihanAttempt}
      />
      <div className="flex flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:flex-row flex-col px-3 py-4 sm:px-4 sm:py-6 gap-6">
        {!activeLatihan ? (
          <EmptyLatihanHint onSend={onSend} isStreaming={isStreaming} />
        ) : (
          <ActiveLatihan
            payload={activeLatihan}
            isStreaming={isStreaming}
            onAttempt={onLatihanAttempt}
            onEasier={onLatihanEasier}
            onHarder={onLatihanHarder}
            onNew={onLatihanNew}
          />
        )}
      </div>
    </div>
  );
}

/**
 * History section di atas konten utama LatihanLayout. Pola sama dengan
 * KuisHistorySection: render pesan sebelumnya (lintas mode) lewat
 * MessageRenderer activeMode='latihan'. Default collapsed kalau pesan > 3.
 */
interface LatihanHistorySectionProps {
  messages: Message[];
  onLatihanAttempt: (attempt: string) => void;
}

function LatihanHistorySection({
  messages,
  onLatihanAttempt,
}: LatihanHistorySectionProps) {
  if (messages.length === 0) return null;

  return (
    <section
      aria-label="Riwayat sesi"
      className="border-b border-hairline bg-canvas px-3 py-3 sm:px-4 sm:py-4 max-h-[40vh] overflow-y-auto shrink-0"
    >
      <details open={messages.length <= 3}>
        <summary className="text-caption-upper uppercase tracking-wider text-muted cursor-pointer mb-2 select-none">
          Riwayat sesi ({messages.length} pesan)
        </summary>
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <MessageRenderer
              key={idx}
              message={msg}
              activeMode="latihan"
              handlers={{
                onSubmitAttempt: onLatihanAttempt,
              }}
            />
          ))}
        </div>
      </details>
    </section>
  );
}

interface ActiveProps {
  payload: LatihanPayload;
  isStreaming: boolean;
  onAttempt: (attempt: string) => void;
  onEasier: () => void;
  onHarder: () => void;
  onNew: () => void;
}

function ActiveLatihan({
  payload,
  isStreaming,
  onAttempt,
  onEasier,
  onHarder,
  onNew,
}: ActiveProps) {
  const [revealed, dispatchReveal] = useReducer(
    revealReducer,
    Array(payload.steps.length).fill(false),
  );
  const [attempt, setAttempt] = useState('');
  const [hasAttempted, setHasAttempted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state ketika payload berubah (soal baru)
  useEffect(() => {
    setHasAttempted(false);
    setAttempt('');
  }, [payload]);

  const handleSubmit = () => {
    const trimmed = attempt.trim();
    if (!trimmed) return;
    onAttempt(trimmed);
    setAttempt('');
    setHasAttempted(true);
    if (!revealed[0]) dispatchReveal({ type: 'REVEAL', index: 0 });
    inputRef.current?.focus();
  };

  const totalSteps = payload.steps.length;
  const revealedCount = revealed.filter(Boolean).length;
  const allRevealed = revealedCount === totalSteps;
  const progressPct = totalSteps > 0 ? (revealedCount / totalSteps) * 100 : 0;

  return (
    <>
      {/* Kolom kiri: pertanyaan + attempt input + difficulty controls */}
      <section className="flex-1 min-w-0 max-w-2xl md:overflow-y-auto md:pr-2">
        <div className="card mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-teal/10 px-3 py-1 text-caption font-sans font-medium text-accent-teal mb-3">
            <span>🏋️</span>
            <span>
              Latihan
              {payload.difficulty ? ` · ${payload.difficulty}` : ''}
            </span>
          </span>
          <p className="font-serif text-display-sm text-ink leading-snug mb-4">
            {payload.question}
          </p>

          {!hasAttempted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 rounded-md border border-hairline bg-surface-soft p-3"
            >
              <p className="text-caption font-sans font-medium text-muted">Coba dulu yuk</p>
              <p className="mt-0.5 text-body-sm text-body">
                Tulis dugaan atau langkah pertamamu sebelum lihat panduan. Salah pun gak apa-apa.
              </p>
            </motion.div>
          )}

          <textarea
            ref={inputRef}
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            placeholder={hasAttempted ? 'Lanjut coba...' : 'Coba jawab di sini...'}
            rows={3}
            className="input mb-3 w-full resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={!attempt.trim() || isStreaming}
            className="btn-primary w-full sm:w-auto"
          >
            {hasAttempted ? 'Cek Lagi' : 'Coba'}
          </button>

          {/* Mobile: toggle steps drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden mt-2 w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-caption font-sans font-medium text-muted hover:text-ink transition-colors"
          >
            📋 Lihat Langkah ({revealed.filter(Boolean).length}/{totalSteps})
          </button>
        </div>

        {/* Difficulty controls — hanya muncul setelah semua step terbuka (Req 7.5) */}
        <AnimatePresence>
          {allRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="card-cream"
            >
              <p className="text-caption-upper uppercase tracking-wider text-muted mb-2">
                Lanjut latihan
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={onEasier} disabled={isStreaming} className="btn-secondary">
                  Lebih mudah
                </button>
                <button onClick={onHarder} disabled={isStreaming} className="btn-secondary">
                  Lebih sulit
                </button>
                <button onClick={onNew} disabled={isStreaming} className="btn-secondary">
                  Soal baru
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Kolom kanan: steps rail — bisa di-collapse */}
      <RailToggle open={railOpen} onToggle={() => setRailOpen((v) => !v)} label="langkah" />
      {railOpen && (
      <aside
        style={{ width: 'clamp(280px, 24vw, 340px)' }}
        className="hidden md:flex flex-col gap-3 sticky top-0 self-start max-h-[calc(100vh-64px)] overflow-y-auto rounded-2xl border border-hairline bg-surface-card p-4 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <span className="text-caption-upper uppercase tracking-wider text-muted">
            Langkah Penyelesaian
          </span>
          <span className="text-caption font-sans font-medium text-muted">
            {revealedCount}/{totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-pill bg-surface-soft">
          <motion.div
            className="h-full bg-accent-teal"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="space-y-2 mt-1">
          {payload.steps.map((step, idx) => {
            const stepLocked = !hasAttempted;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`rounded-md border p-3 ${
                  revealed[idx]
                    ? 'border-hairline bg-canvas'
                    : 'border-hairline-soft bg-surface-soft/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-title-sm font-sans text-ink">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-pill bg-accent-teal/15 text-caption font-medium text-accent-teal">
                      {idx + 1}
                    </span>
                    <span className={revealed[idx] ? '' : 'text-muted'}>
                      {revealed[idx] ? step.title : `Langkah ${idx + 1}`}
                    </span>
                  </span>
                  {!revealed[idx] && (
                    <button
                      onClick={() => dispatchReveal({ type: 'REVEAL', index: idx })}
                      disabled={stepLocked}
                      className="rounded-md bg-canvas border border-hairline px-2 py-1 text-caption font-sans font-medium text-muted hover:text-ink hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={stepLocked ? 'Coba jawab dulu untuk membuka' : undefined}
                    >
                      {stepLocked ? '🔒' : 'Tampilkan'}
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {revealed[idx] && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-body-sm text-body"
                    >
                      {step.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </aside>
      )}

      {/* Mobile drawer for steps */}
      {drawerOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-2xl bg-canvas border-t border-hairline shadow-pop p-4 max-h-[70vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-caption-upper uppercase tracking-wider text-muted">
              Langkah Penyelesaian ({revealedCount}/{totalSteps})
            </span>
            <button onClick={() => setDrawerOpen(false)} className="text-muted text-lg">✕</button>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-pill bg-surface-soft mb-3">
            <div className="h-full bg-accent-teal" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="space-y-2">
            {payload.steps.map((step, idx) => {
              const stepLocked = !hasAttempted;
              return (
                <div
                  key={idx}
                  className={`rounded-md border p-3 ${
                    revealed[idx] ? 'border-hairline bg-surface-card' : 'border-hairline-soft bg-surface-soft/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2 text-title-sm font-sans text-ink">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-pill bg-accent-teal/15 text-caption font-medium text-accent-teal">
                        {idx + 1}
                      </span>
                      <span className={revealed[idx] ? '' : 'text-muted'}>
                        {revealed[idx] ? step.title : `Langkah ${idx + 1}`}
                      </span>
                    </span>
                    {!revealed[idx] && (
                      <button
                        onClick={() => dispatchReveal({ type: 'REVEAL', index: idx })}
                        disabled={stepLocked}
                        className="rounded-md bg-canvas border border-hairline px-2 py-1 text-caption font-sans font-medium text-muted hover:text-ink hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {stepLocked ? '🔒' : 'Tampilkan'}
                      </button>
                    )}
                  </div>
                  {revealed[idx] && (
                    <p className="mt-2 text-body-sm text-body">{step.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </>
  );
}

function EmptyLatihanHint({
  onSend,
  isStreaming,
}: {
  onSend: (text: string) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-cream max-w-md text-center"
      >
        <div className="mb-2 flex justify-center">
          <video
            src="/cat-movement.webm"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Mode Latihan"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
            className="block select-none max-w-[200px] sm:max-w-none"
          />
        </div>
        <h3 className="font-serif text-title-lg text-ink mb-1">Mode Latihan</h3>
        <p className="text-body-sm text-muted mb-4">
          Aku akan kasih soal langkah-demi-langkah. Coba dulu jawab,
          baru kita buka langkah-langkah penyelesaiannya.
        </p>
        <button
          onClick={() => onSend('Berikan saya satu soal latihan dengan langkah-langkah penyelesaian.')}
          disabled={isStreaming}
          className="btn-primary"
        >
          Mulai Latihan
        </button>
      </motion.div>
    </div>
  );
}
