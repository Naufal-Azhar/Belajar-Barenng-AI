'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import QuizComponent from '@/components/QuizComponent';
import QuizWizard from '@/components/QuizWizard';
import AIStatusBox, { AIStatusBoxMobile } from '@/components/AIStatusBox';
import type { ModeLayoutProps } from './LayoutRouter';
import type { QuizConfig, QuizPayload } from '@/lib/types';
import type { AIStatusBoxStatus } from '@/components/AIStatusBox';

/**
 * Kuis_Layout (Req 6, 17). Split layout:
 *  - Kiri: QuizWizard (pre-quiz) atau QuizComponent (running) atau ringkasan (completed)
 *  - Kanan: AIStatusBox kotak persegi 280–320px sticky
 */
export default function KuisLayout(props: ModeLayoutProps) {
  const {
    session,
    messages,
    isStreaming,
    onSend,
    onQuizAnswer,
    onAskSimilar,
    onAskHarder,
    onQuizSkip,
    onQuizStop,
  } = props;

  const [config, setConfig] = useState<QuizConfig | null>(session.quizConfig ?? null);
  const [stopped, setStopped] = useState(false);

  const hasDocument = !!session.documentContext?.compiledMarkdown;

  // Soal aktif = QuizPayload terakhir di messages
  const activeQuiz = useMemo<QuizPayload | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'ai' && m.payload?.kind === 'quiz') {
        return m.payload as QuizPayload;
      }
    }
    return null;
  }, [messages]);

  // Hitung jumlah soal yang sudah dijawab user dalam batch ini
  const answeredCount = useMemo(() => {
    if (!config) return 0;
    let count = 0;
    let started = false;
    for (const m of messages) {
      if (m.role === 'ai' && m.payload?.kind === 'quiz') started = true;
      if (started && m.role === 'user' && m.mode === 'quiz') count++;
    }
    return Math.min(count, config.count);
  }, [messages, config]);

  const handleConfigComplete = (cfg: QuizConfig) => {
    setConfig(cfg);
    // Trigger generation soal pertama via /api/chat
    onSend(
      `Mulai kuis. Tipe: ${cfg.type}. Jumlah soal: ${cfg.count}. ` +
        `Buatkan soal pertama (index 1 dari ${cfg.count}).`,
    );
  };

  const handleSkip = () => {
    onQuizSkip();
  };

  const handleStop = () => {
    setStopped(true);
    onQuizStop();
  };

  const handleNext = () => {
    if (!config) return;
    if (answeredCount + 1 < config.count) {
      onSend(
        `Lanjut soal ${answeredCount + 2} dari ${config.count}. ` +
          `Tipe: ${config.type}.`,
      );
    }
  };

  // --- Status untuk AI Status Box ---
  const total = config?.count ?? 0;
  let status: AIStatusBoxStatus = 'idle';
  let currentIndex = answeredCount + 1;
  if (stopped) {
    status = 'stopped';
  } else if (config && answeredCount >= config.count) {
    status = 'completed';
  } else if (isStreaming) {
    status = 'generating';
  } else if (config && activeQuiz) {
    status = 'between';
  }

  // --- Render kolom kiri ---
  let leftColumn: React.ReactNode;

  if (!config) {
    // Pre-quiz: tampilkan Wizard
    leftColumn = (
      <QuizWizard
        sessionId={session.sessionId}
        hasDocument={hasDocument}
        onComplete={handleConfigComplete}
      />
    );
  } else if (status === 'completed' || status === 'stopped') {
    leftColumn = (
      <div className="flex h-full items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-cream max-w-md w-full text-center"
        >
          <div className="text-5xl mb-3">{status === 'stopped' ? '⏹️' : '🎉'}</div>
          <h2 className="font-serif text-display-sm text-ink mb-2">
            {status === 'stopped' ? 'Kuis dihentikan' : 'Kuis selesai!'}
          </h2>
          <p className="text-body-sm text-muted mb-4">
            Kamu menyelesaikan {answeredCount} dari {config.count} soal.
          </p>
          <button
            onClick={() => {
              setConfig(null);
              setStopped(false);
            }}
            className="btn-primary w-full"
          >
            Mulai Kuis Baru
          </button>
        </motion.div>
      </div>
    );
  } else {
    // Running — tampilkan progress + soal aktif
    const progressPct = (answeredCount / config.count) * 100;
    leftColumn = (
      <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
        {/* Progress bar */}
        <div className="mb-4 max-w-2xl mx-auto w-full">
          <div className="flex justify-between text-caption font-sans text-muted mb-1">
            <span>Progress</span>
            <span>
              {answeredCount}/{config.count}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-soft">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          {activeQuiz ? (
            <>
              <QuizComponent
                payload={activeQuiz}
                onSubmitAnswer={onQuizAnswer}
                onAskSimilar={onAskSimilar}
                onAskHarder={onAskHarder}
              />
              {answeredCount + 1 < config.count && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleNext}
                    disabled={isStreaming}
                    className="btn-secondary"
                  >
                    Soal Berikutnya →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="card-cream text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-body-md text-muted">
                AI lagi nyiapin soal pertama...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 md:flex-row flex-col">
      <section className="flex-1 min-w-0 overflow-hidden">{leftColumn}</section>

      {/* Rail kanan: AI Status Box (sticky pada desktop) */}
      <div className="hidden md:flex md:flex-col md:items-end p-5 border-l border-hairline bg-surface-card">
        <AIStatusBox
          status={status}
          currentIndex={currentIndex}
          total={total}
          correctCount={answeredCount}
          onStop={handleStop}
          onSkip={handleSkip}
        />
      </div>

      {/* Mobile fallback: sticky-bottom pill */}
      <AIStatusBoxMobile
        status={status}
        currentIndex={currentIndex}
        total={total}
        correctCount={answeredCount}
        onStop={handleStop}
        onSkip={handleSkip}
      />
    </div>
  );
}
