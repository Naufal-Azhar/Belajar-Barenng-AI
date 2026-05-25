'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';
import LoadingCat from './LoadingCat';

interface Props {
  onStart: () => Promise<void>;
}

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
    <div className="relative flex min-h-screen bg-canvas overflow-hidden">

      {/* ── GIF Background — full screen, subtle ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      >
        <img
          src="/leaf-bg.gif"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
      </div>

      {/* ── Left panel — semua konten rata kiri ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col justify-center px-5 sm:px-10 py-8 sm:py-16 w-full max-w-xl lg:max-w-lg xl:max-w-xl"
      >
        {/* Brand Mark */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink">
            <path
              d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-sans text-caption-upper uppercase tracking-widest text-muted text-xs">
            BelajarBareng
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-serif text-display-sm sm:text-display-lg text-ink mb-4 leading-tight"
        >
          Belajar lebih<br />dalam, bareng AI.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-body-md text-body mb-6 sm:mb-10 max-w-sm"
        >
          Teman belajar personal yang sabar, nggak pernah nge-judge,
          dan selalu siap bantu kamu paham. Cocok buat pelajar SMA, mahasiswa,
          maupun pembelajar mandiri.
        </motion.p>

        {/* ── CTA: single Mulai Belajar button ── */}
        <motion.div variants={itemVariants}>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-body-sm text-error"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            onClick={handleStart}
            disabled={loading}
            className="btn-primary max-w-sm w-full"
            whileHover={!loading ? { scale: 1.01 } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
          >
            {loading ? (
              /* EDIT CAPTION: Onboarding start button */
              <LoadingCat variant="button" caption="Lagi nyiapin sesi..." />
            ) : (
              'Mulai Belajar →'
            )}
          </motion.button>
        </motion.div>

        <motion.p variants={itemVariants} className="mt-8 text-body-sm text-muted-soft">
          Tanpa registrasi. Langsung belajar.
        </motion.p>
      </motion.div>

      {/* ── Right panel — kosong untuk sekarang ── */}
      <div className="relative z-10 hidden lg:flex flex-1 items-center justify-center" />

    </div>
  );
}
