'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';
import { PixelBadge, PixelDivider } from './Pixel';
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

      {/* ── Background: subtle warm pixel grid + soft leaf glow ── */}
      <div className="pixel-grid absolute inset-0 z-0 pointer-events-none opacity-60" aria-hidden="true" />
      <div
        className="absolute -right-24 -top-24 z-0 h-96 w-96 rounded-full bg-accent-teal/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Left panel — semua konten rata kiri ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col justify-center px-5 sm:px-10 py-8 sm:py-16 w-full max-w-xl lg:max-w-lg xl:max-w-xl"
      >
        {/* Brand Mark — pixel logo + badge eyebrow */}
        <motion.div variants={itemVariants} className="mb-8 flex items-center gap-3">
          <span className="grid grid-cols-2 grid-rows-2 gap-0.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 bg-primary" />
            <span className="h-2.5 w-2.5 bg-accent-amber" />
            <span className="h-2.5 w-2.5 bg-accent-leaf" />
            <span className="h-2.5 w-2.5 bg-primary" />
          </span>
          <PixelBadge>BelajarBareng</PixelBadge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-serif text-display-sm sm:text-display-lg text-ink mb-4 leading-tight"
        >
          Belajar lebih<br />dalam, bareng AI.
        </motion.h1>

        <motion.div variants={itemVariants}>
          <PixelDivider className="mb-5 max-w-[120px] text-accent-amber" />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-body-md text-body mb-6 sm:mb-10 max-w-sm"
        >
          Teman belajar personal yang sabar, nggak pernah nge-judge,
          dan selalu siap bantu kamu paham. Cocok buat pelajar SMA, mahasiswa,
          maupun pembelajar mandiri.
        </motion.p>

        {/* ── CTA: Mulai Belajar + pixel-fire accent ── */}
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

          <div className="flex items-center gap-3 max-w-sm">
            <motion.button
              onClick={handleStart}
              disabled={loading}
              className="btn-primary flex-1"
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
            <video
              src="/pixel-fire.webm"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="pixelated h-12 w-12 shrink-0 motion-reduce:hidden"
            />
          </div>
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
