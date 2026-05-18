'use client';

import { useReducer, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LatihanPayload } from '@/lib/types';

interface Props {
  payload: LatihanPayload;
  onSubmitAttempt: (attempt: string) => void;
}

// Exported for testing
export type RevealAction = { type: 'REVEAL'; index: number };
export type RevealState = boolean[];

export function revealReducer(state: RevealState, action: RevealAction): RevealState {
  if (action.type === 'REVEAL') {
    const next = [...state];
    next[action.index] = true;
    return next;
  }
  return state;
}

export default function LatihanComponent({ payload, onSubmitAttempt }: Props) {
  const [revealed, dispatch] = useReducer(
    revealReducer,
    Array(payload.steps.length).fill(false)
  );
  const [attempt, setAttempt] = useState('');
  // Attempt-first gating: step pertama baru bisa di-reveal kalau user sudah submit attempt
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleSubmit = () => {
    if (!attempt.trim()) return;
    onSubmitAttempt(attempt);
    setAttempt('');
    setHasAttempted(true);
    // auto reveal step pertama setelah attempt pertama
    if (!revealed[0]) dispatch({ type: 'REVEAL', index: 0 });
  };

  const revealedCount = revealed.filter(Boolean).length;
  const totalSteps = payload.steps.length;
  const progressPct = totalSteps > 0 ? (revealedCount / totalSteps) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card my-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-teal/10 px-3 py-1 text-caption font-sans font-medium text-accent-teal">
          <span>🏋️</span>
          <span>Latihan Step-by-Step</span>
        </span>
        <span className="text-caption font-sans font-medium text-muted">
          {revealedCount}/{totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-pill bg-surface-soft">
        <motion.div
          className="h-full bg-accent-teal"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <p className="mb-5 font-serif text-display-sm text-ink leading-snug">
        {payload.question}
      </p>

      {/* Attempt-first banner */}
      {!hasAttempted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-md border border-hairline bg-surface-soft p-3"
        >
          <p className="text-caption font-sans font-medium text-muted">
            Coba dulu yuk
          </p>
          <p className="mt-0.5 text-body-sm text-body">
            Tulis dugaan atau langkah pertamamu sebelum lihat panduan. Salah pun gak apa-apa.
          </p>
        </motion.div>
      )}

      <div className="mb-5 space-y-3">
        {payload.steps.map((step, idx) => {
          const locked = !hasAttempted && idx === 0 ? false : !hasAttempted;
          // sebenarnya kita lock semua step sebelum attempt; setelah attempt step 0 auto-reveal,
          // step lain tetap perlu klik "Tampilkan"
          const stepLocked = !hasAttempted;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-md border p-4 transition-colors ${
                revealed[idx]
                  ? 'border-hairline bg-canvas'
                  : 'border-hairline-soft bg-surface-soft/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-title-sm font-sans text-ink">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-pill bg-accent-teal/15 text-caption font-medium text-accent-teal">
                    {idx + 1}
                  </span>
                  <span className={revealed[idx] ? '' : 'text-muted'}>
                    {revealed[idx] ? step.title : `Langkah ${idx + 1}`}
                  </span>
                </span>
                {!revealed[idx] && (
                  <motion.button
                    whileHover={!stepLocked ? { scale: 1.05 } : undefined}
                    whileTap={!stepLocked ? { scale: 0.95 } : undefined}
                    onClick={() => dispatch({ type: 'REVEAL', index: idx })}
                    disabled={stepLocked}
                    className="rounded-md bg-canvas border border-hairline px-3 py-1.5 text-caption font-sans font-medium text-muted hover:text-ink hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={stepLocked ? 'Coba jawab dulu untuk membuka' : undefined}
                  >
                    {stepLocked ? '🔒 Terkunci' : 'Tampilkan'}
                  </motion.button>
                )}
              </div>

              <AnimatePresence>
                {revealed[idx] && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-body-sm text-body border-t border-hairline-soft pt-3"
                  >
                    {step.detail}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          placeholder={
            hasAttempted ? 'Lanjut coba langkah berikutnya...' : 'Coba jawab di sini...'
          }
          className="input flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!attempt.trim()}
          className="btn-primary"
        >
          {hasAttempted ? 'Cek' : 'Coba'}
        </motion.button>
      </div>
    </motion.div>
  );
}
