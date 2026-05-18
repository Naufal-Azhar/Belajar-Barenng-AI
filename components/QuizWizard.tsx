'use client';

import { useReducer, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentUploader from './DocumentUploader';
import { reduceQuiz } from '@/lib/quiz-state-machine';
import type { QuizState, QuizConfig, QuizType, QuizCount } from '@/lib/types';

interface Props {
  sessionId: string;
  /** Apakah sesi sudah punya documentContext (compiledMarkdown). Mempengaruhi state awal. */
  hasDocument?: boolean;
  /** Dipanggil saat wizard selesai → state running. Layout akan trigger generation soal pertama. */
  onComplete: (config: QuizConfig) => void;
}

const TYPE_OPTIONS: { value: QuizType; label: string; desc: string; emoji: string }[] = [
  { value: 'mcq', label: 'Pilihan Ganda', desc: 'Cepat dan mudah dikoreksi', emoji: '🅰️' },
  { value: 'essay', label: 'Essay', desc: 'Latih jawaban tertulis', emoji: '✍️' },
  { value: 'mixed', label: 'Campuran', desc: 'Variasi keduanya', emoji: '🎲' },
];

const COUNT_OPTIONS: QuizCount[] = [3, 5, 10];

export default function QuizWizard({ sessionId, hasDocument = false, onComplete }: Props) {
  const initialState: QuizState = hasDocument ? 'compiled' : 'idle';
  const [state, dispatch] = useReducer(reduceQuiz, initialState);
  const [type, setType] = useState<QuizType | null>(null);
  const [count, setCount] = useState<QuizCount>(5);

  const handleUploadStart = () => {
    dispatch({ kind: 'UPLOAD_STARTED' });
  };

  const handleUploadComplete = () => {
    dispatch({ kind: 'COMPILE_DONE' });
  };

  const openConfigure = () => {
    dispatch({ kind: 'CONFIGURE_OPENED' });
  };

  const handleConfirm = () => {
    if (!type) return;
    const config: QuizConfig = { type, count, answeredCount: 0 };
    dispatch({ kind: 'CONFIRM_CONFIG', config });
    onComplete(config);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Stepper indicator */}
      <div className="mb-6 flex items-center justify-center gap-2 text-caption font-sans text-muted">
        <StepDot active={['idle', 'uploading'].includes(state)} done={['compiled', 'configuring', 'running'].includes(state)} label="1. Materi" />
        <span>›</span>
        <StepDot active={state === 'compiled' || state === 'configuring'} done={state === 'running'} label="2. Tipe" />
        <span>›</span>
        <StepDot active={state === 'configuring'} done={state === 'running'} label="3. Jumlah" />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload (idle / uploading) */}
        {(state === 'idle' || state === 'uploading') && (
          <motion.div
            key="step-upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="font-serif text-display-sm text-ink mb-2">Upload materi kuis</h2>
              <p className="text-body-sm text-muted">
                Pilih PDF atau DOCX yang ingin dikuiskan. Sistem akan baca materinya dulu.
              </p>
            </div>
            <DocumentUploader
              sessionId={sessionId}
              variant="card"
              onUploadStart={handleUploadStart}
              onUploadComplete={handleUploadComplete}
            />
          </motion.div>
        )}

        {/* Step 2: Type chooser (compiled, before user picks type) */}
        {state === 'compiled' && (
          <motion.div
            key="step-type"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="font-serif text-display-sm text-ink mb-2">Pilih tipe soal</h2>
              <p className="text-body-sm text-muted">
                Mau soal pilihan ganda, essay, atau campuran?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setType(opt.value);
                    openConfigure();
                  }}
                  className="card-cream text-center hover:border-primary/40 transition-colors"
                >
                  <div className="text-3xl mb-2">{opt.emoji}</div>
                  <div className="font-sans text-title-sm text-ink mb-0.5">{opt.label}</div>
                  <div className="text-caption text-muted">{opt.desc}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Count chooser (configuring) */}
        {state === 'configuring' && (
          <motion.div
            key="step-count"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="font-serif text-display-sm text-ink mb-2">Berapa soal?</h2>
              <p className="text-body-sm text-muted">
                Tipe terpilih:{' '}
                <span className="font-medium text-ink">
                  {TYPE_OPTIONS.find((t) => t.value === type)?.label}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {COUNT_OPTIONS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCount(c)}
                  className={`rounded-lg border p-6 text-center transition-all ${
                    count === c
                      ? 'border-primary bg-canvas shadow-subtle'
                      : 'border-hairline bg-surface-card hover:border-primary/30'
                  }`}
                >
                  <div className="font-serif text-display-md text-ink">{c}</div>
                  <div className="text-caption text-muted">soal</div>
                </motion.button>
              ))}
            </div>
            <div className="flex justify-center pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                className="btn-primary"
              >
                Mulai Kuis
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const cls = done
    ? 'text-success font-medium'
    : active
      ? 'text-ink font-medium'
      : 'text-muted-soft';
  return <span className={cls}>{label}</span>;
}
