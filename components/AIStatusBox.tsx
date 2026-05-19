'use client';

import { motion } from 'framer-motion';
import LoadingCat from './LoadingCat';

export type AIStatusBoxStatus =
  | 'idle'
  | 'generating'
  | 'between'
  | 'completed'
  | 'stopped';

interface Props {
  status: AIStatusBoxStatus;
  /** Index soal saat ini (1-based) */
  currentIndex?: number;
  /** Total soal di batch */
  total?: number;
  /** Jumlah jawaban benar — untuk display di state completed */
  correctCount?: number;
  /** Stop = batalkan generation berjalan, transisi ke `completed` */
  onStop?: () => void;
  /** Skip = lompat soal, generation soal berikutnya */
  onSkip?: () => void;
}

function statusText({
  status,
  currentIndex,
  total,
  correctCount,
}: {
  status: AIStatusBoxStatus;
  currentIndex?: number;
  total?: number;
  correctCount?: number;
}): string {
  switch (status) {
    case 'idle':
      return 'Siap mulai kuis';
    case 'generating':
      // EDIT CAPTION: Kuis streaming (text saat AI nyiapin soal — counter X/Y otomatis).
      if (currentIndex && total) return `Lagi nyusun soal ${currentIndex}/${total}...`;
      return 'Lagi nyusun soal...';
    case 'between':
      return 'Bagus! Lanjut soal berikutnya.';
    case 'completed':
      if (typeof correctCount === 'number' && total)
        return `Selesai! ${correctCount}/${total} benar.`;
      return 'Kuis selesai!';
    case 'stopped':
      return 'Kuis dihentikan.';
  }
}

function statusEmoji(status: AIStatusBoxStatus): string {
  switch (status) {
    case 'generating':
      return '⏳';
    case 'between':
      return '✨';
    case 'completed':
      return '🎉';
    case 'stopped':
      return '⏹️';
    default:
      return '🤖';
  }
}

export default function AIStatusBox({
  status,
  currentIndex,
  total,
  correctCount,
  onStop,
  onSkip,
}: Props) {
  const text = statusText({ status, currentIndex, total, correctCount });
  const emoji = statusEmoji(status);
  const canStop = status === 'generating' || status === 'between';
  const canSkip = status === 'generating' || status === 'between';

  return (
    <motion.aside
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      // Container kotak persegi 280–320px sticky di sudut kanan (Req 6.5–6.6)
      // Width clamp(280px, 22vw, 320px); aspect-ratio 1:1.
      style={{
        width: 'clamp(280px, 22vw, 320px)',
        aspectRatio: '1 / 1',
      }}
      className="sticky top-24 hidden md:flex flex-col items-center justify-between rounded-lg border border-hairline bg-surface-card p-5 shadow-subtle"
      data-testid="ai-status-box"
    >
      <div className="flex flex-col items-center text-center">
        {status === 'generating' ? (
          <div className="mb-3">
            <LoadingCat variant="inline" caption="" />
          </div>
        ) : (
          <motion.div
            animate={{ rotate: 0 }}
            transition={{ duration: 0.3 }}
            className="text-5xl mb-3"
            aria-hidden
          >
            {emoji}
          </motion.div>
        )}
        <p className="text-title-sm font-sans text-ink mb-1">AI Pemandu</p>
        <p className="text-body-sm text-body leading-snug">{text}</p>
      </div>

      <div className="flex w-full gap-2">
        <button
          onClick={onSkip}
          disabled={!canSkip}
          className="flex-1 rounded-md border border-hairline bg-canvas px-2 py-1.5 text-caption font-sans font-medium text-muted hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Skip
        </button>
        <button
          onClick={onStop}
          disabled={!canStop}
          className="flex-1 rounded-md border border-error/30 bg-error/5 px-2 py-1.5 text-caption font-sans font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>
    </motion.aside>
  );
}

/**
 * Mobile fallback: sticky-bottom horizontal pill versi kompak.
 * Dipasang di KuisLayout untuk viewport < 768px.
 */
export function AIStatusBoxMobile({
  status,
  currentIndex,
  total,
  correctCount,
  onStop,
  onSkip,
}: Props) {
  const text = statusText({ status, currentIndex, total, correctCount });
  const emoji = statusEmoji(status);
  const canStop = status === 'generating' || status === 'between';
  const canSkip = status === 'generating' || status === 'between';

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky bottom-4 mx-4 flex md:hidden items-center gap-2 rounded-pill border border-hairline bg-surface-card px-3 py-2 shadow-subtle"
    >
      {status === 'generating' ? (
        <LoadingCat variant="button" caption="" />
      ) : (
        <span className="text-xl" aria-hidden>{emoji}</span>
      )}
      <span className="flex-1 truncate text-caption font-sans text-body">{text}</span>
      <button
        onClick={onSkip}
        disabled={!canSkip}
        className="rounded-md px-2 py-1 text-caption font-medium text-muted hover:text-ink disabled:opacity-30"
      >
        Skip
      </button>
      <button
        onClick={onStop}
        disabled={!canStop}
        className="rounded-md px-2 py-1 text-caption font-medium text-error disabled:opacity-30"
      >
        Stop
      </button>
    </motion.div>
  );
}
