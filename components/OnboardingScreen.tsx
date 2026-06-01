'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { popContainer, popIn } from '@/lib/animations';
import { PixelBadge } from './Pixel';
import LoadingCat from './LoadingCat';

interface Props {
  onStart: () => Promise<void>;
}

const MODES = [
  { emoji: '📖', name: 'Penjelas', desc: 'Materi dijelaskan jelas + analogi' },
  { emoji: '🤔', name: 'Sokratik', desc: 'Dipandu lewat pertanyaan' },
  { emoji: '🎯', name: 'Kuis', desc: 'Uji pemahaman dengan soal' },
  { emoji: '✏️', name: 'Latihan', desc: 'Kerjakan soal langkah demi langkah' },
];

export default function OnboardingScreen({ onStart }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await onStart();
    } catch {
      setError('Gagal memulai sesi. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen lg:h-screen lg:overflow-hidden items-center justify-center bg-canvas px-5 py-8 overflow-hidden">
      {/* Soft playful glows (transform/opacity only — cheap) */}
      <div className="absolute -right-24 -top-24 z-0 h-96 w-96 rounded-full bg-accent-teal/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -left-32 bottom-0 z-0 h-80 w-80 rounded-full bg-accent-amber/10 blur-3xl pointer-events-none" aria-hidden="true" />

      <motion.div
        variants={popContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center"
      >
        <motion.div variants={popIn} className="mb-5">
          <PixelBadge>BelajarBareng</PixelBadge>
        </motion.div>

        <motion.h1
          variants={popIn}
          className="font-serif font-bold text-display-sm sm:text-display-md text-ink mb-3 leading-tight"
        >
          Belajar lebih dalam, bareng AI.
        </motion.h1>

        <motion.p variants={popIn} className="text-body-md text-body mb-7 max-w-md">
          Teman belajar personal yang sabar dan nggak pernah nge-judge. Pilih cara
          belajar yang pas — semuanya dalam satu tempat.
        </motion.p>

        {/* 4 mode highlights */}
        <motion.div
          variants={popIn}
          className="mb-8 grid w-full grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {MODES.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-hairline bg-surface-card p-3 text-left shadow-soft"
            >
              <span className="text-2xl" aria-hidden>{m.emoji}</span>
              <p className="mt-1 text-body-sm font-bold text-ink">{m.name}</p>
              <p className="text-caption text-muted-soft leading-snug">{m.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div variants={popIn} className="flex flex-col items-center">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-body-sm text-error"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary"
            whileHover={!loading ? { scale: 1.03 } : {}}
            whileTap={!loading ? { scale: 0.96 } : {}}
          >
            {loading ? (
              <LoadingCat variant="button" caption="Lagi nyiapin sesi..." />
            ) : (
              'Mulai Belajar →'
            )}
          </motion.button>

          <p className="mt-4 text-body-sm text-muted-soft">Tanpa registrasi. Langsung belajar.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
