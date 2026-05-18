'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SocraticPayload } from '@/lib/types';

interface Props {
  payload: SocraticPayload;
  onSubmitThought: (thought: string) => void;
  onConfused?: () => void;
}

export default function SocraticComponent({
  payload,
  onSubmitThought,
  onConfused,
}: Props) {
  const [thought, setThought] = useState('');
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const handleSubmit = () => {
    const trimmed = thought.trim();
    if (!trimmed) return;
    onSubmitThought(trimmed);
    setThought('');
    setHintsRevealed(0);
  };

  const revealNextHint = () => {
    if (hintsRevealed < payload.hints.length) {
      setHintsRevealed((n) => n + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card my-4 border-l-4 border-l-primary"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-3 py-1 text-caption font-sans font-medium text-primary">
          <span>🤔</span>
          <span>Sokratik</span>
        </span>
        {typeof payload.depth === 'number' && payload.depth > 0 && (
          <span className="text-caption font-sans text-muted-soft">
            Kedalaman {payload.depth}
          </span>
        )}
      </div>

      <p className="mb-5 font-serif text-display-md text-ink leading-tight">
        {payload.question}
      </p>

      <label className="mb-2 block text-caption font-sans font-medium text-muted">
        Jawabanmu (gak harus benar, yang penting nyoba)
      </label>
      <textarea
        value={thought}
        onChange={(e) => setThought(e.target.value)}
        placeholder="Aku rasa..."
        rows={3}
        className="input mb-3 w-full resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {['Aku rasa...', 'Mungkin karena...', 'Saya bingung'].map((quick) => (
          <motion.button
            key={quick}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (quick === 'Saya bingung') {
                onConfused?.();
                return;
              }
              setThought((prev) => (prev ? prev : quick + ' '));
            }}
            className="rounded-pill border border-hairline bg-canvas px-3 py-1 text-caption font-sans text-muted hover:border-primary hover:text-primary transition-colors"
          >
            {quick}
          </motion.button>
        ))}
      </div>

      {payload.hints.length > 0 && (
        <div className="mb-4 rounded-md bg-surface-soft p-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-sans font-medium text-muted">
              Petunjuk bertahap ({hintsRevealed}/{payload.hints.length})
            </span>
            {hintsRevealed < payload.hints.length && (
              <button
                onClick={revealNextHint}
                className="text-caption font-sans font-medium text-primary hover:underline"
              >
                {hintsRevealed === 0 ? 'Butuh petunjuk?' : 'Petunjuk berikutnya'}
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {hintsRevealed > 0 && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1.5"
              >
                {payload.hints.slice(0, hintsRevealed).map((hint, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 text-body-sm text-body"
                  >
                    <span className="font-mono text-caption text-muted-soft">
                      {idx + 1}.
                    </span>
                    <span>{hint}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={!thought.trim()}
        className="btn-primary w-full sm:w-auto"
      >
        Lanjutkan diskusi
      </motion.button>
    </motion.div>
  );
}
