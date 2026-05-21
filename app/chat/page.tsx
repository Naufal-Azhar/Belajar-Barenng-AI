'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { useChatStream } from '@/hooks/useChatStream';
import { useExtractionTrigger } from '@/hooks/useExtractionTrigger';
import ModeSelector from '@/components/ModeSelector';
import ErrorBanner from '@/components/ErrorBanner';
import ExtractionModal from '@/components/ExtractionModal';
import LayoutRouter from '@/components/layouts/LayoutRouter';
import type { LearningMode, ExplainerSectionLabel } from '@/lib/types';

/**
 * /chat page — header + LayoutRouter. Page tipis: messages dimiliki parent
 * (useSession), bukan layout, sehingga mode switch tidak menghapus history
 * (Property 18).
 */
export default function ChatPage() {
  const router = useRouter();
  const { status, session, messages, dispatch } = useSession();
  const { sendMessage, isStreaming, lastError, retry, setLastError } = useChatStream(
    session?.sessionId,
    dispatch,
  );
  const [endingSession, setEndingSession] = useState(false);
  const [showExtraction, setShowExtraction] = useState(false);
  const { shouldShow: extractionReady, accept: acceptExtraction, dismiss: dismissExtraction } = useExtractionTrigger(messages, session);

  // Cross-mode bridge: auto-send message if coming from review
  useEffect(() => {
    if (status !== 'ready' || !session) return;
    const raw = localStorage.getItem('belajar.crossMode');
    if (!raw) return;
    localStorage.removeItem('belajar.crossMode');
    try {
      const data = JSON.parse(raw);
      const mode = data.mode === 'latihan' ? 'latihan' : 'socratic';
      dispatch({ type: 'SET_MODE', mode });
      sendMessage({
        message: `Bantu saya memahami konsep: ${data.concept}. Saya sudah coba menjawab "${data.userAnswer}" tapi jawaban yang benar adalah "${data.answer}".`,
        mode,
      });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === 'no-session') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-body-md text-muted mb-4">Sesi tidak ditemukan</p>
          <a href="/" className="btn-primary">
            Mulai Baru
          </a>
        </motion.div>
      </div>
    );
  }

  if (status === 'hydrating' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-body-sm text-muted-soft animate-pulse">Memuat sesi...</div>
      </div>
    );
  }

  const handleModeChange = (mode: LearningMode) => {
    dispatch({ type: 'SET_MODE', mode });
  };

  const handleEndSession = async () => {
    if (!session.sessionId) return;
    setEndingSession(true);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      if (res.ok) {
        const summary = await res.json();
        sessionStorage.setItem('belajar.summary', JSON.stringify(summary));
        router.push('/summary');
      } else {
        const data = await res.json();
        setLastError(data.error || 'Gagal membuat ringkasan');
      }
    } catch {
      setLastError('Gagal membuat ringkasan');
    } finally {
      setEndingSession(false);
    }
  };

  // --- Shared handlers passed down to LayoutRouter ---
  const onSend = (message: string) => {
    sendMessage({ message, mode: session.currentMode });
  };

  const onQuizAnswer = (answer: string) => {
    sendMessage({
      message: JSON.stringify({ kind: 'quiz_answer', answer }),
      mode: 'quiz',
    });
  };

  const onLatihanAttempt = (attempt: string) => {
    sendMessage({ message: attempt, mode: 'latihan' });
  };

  const onAskTerm = (term: string) => {
    sendMessage({
      message: `Bisa jelasin lebih detail tentang istilah "${term}"?`,
      mode: 'explainer',
    });
  };

  const onAskDeeper = (sectionLabel: ExplainerSectionLabel) => {
    sendMessage({
      message: `Tolong perdalam bagian ${sectionLabel.toLowerCase()} dari penjelasan barusan.`,
      mode: 'explainer',
    });
  };

  const onSocraticThought = (thought: string) => {
    sendMessage({ message: thought, mode: 'socratic' });
  };

  const onSocraticConfused = () => {
    sendMessage({
      message: 'Saya bingung, bisa pancing dengan pertanyaan yang lebih dasar?',
      mode: 'socratic',
    });
  };

  const onAskSimilar = () => {
    sendMessage({ message: 'Berikan soal serupa dengan tingkat kesulitan yang sama.', mode: 'quiz' });
  };

  const onAskHarder = () => {
    sendMessage({ message: 'Berikan soal yang lebih sulit dari sebelumnya.', mode: 'quiz' });
  };

  const onQuizSkip = () => {
    sendMessage({ message: 'Skip soal ini, langsung ke soal berikutnya.', mode: 'quiz' });
  };

  const onQuizStop = () => {
    setLastError(null);
    // Tidak kirim message, hanya hentikan UI side. State machine `running → completed`
    // dihandle oleh KuisLayout via handler ini.
  };

  const onLatihanEasier = () => {
    sendMessage({ message: 'Berikan soal yang lebih mudah dengan topik sama.', mode: 'latihan' });
  };

  const onLatihanHarder = () => {
    sendMessage({ message: 'Berikan soal yang lebih sulit dari sebelumnya.', mode: 'latihan' });
  };

  const onLatihanNew = () => {
    sendMessage({ message: 'Berikan soal latihan baru di tingkat kesulitan yang sama.', mode: 'latihan' });
  };

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas px-3 sm:px-4 py-2 sm:py-3"
      >
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink">
            <path
              d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-nav-link font-sans font-medium text-ink hidden sm:inline">BelajarBareng</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleEndSession}
          disabled={endingSession || messages.length === 0}
          className="rounded-md border border-hairline px-2 sm:px-3 py-1.5 text-caption font-sans font-medium text-muted hover:text-error hover:border-error/30 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {endingSession ? '...' : 'Akhiri'}
        </motion.button>

        <div className="w-full sm:w-auto sm:flex-1 sm:mx-4 sm:max-w-md order-last sm:order-none">
          <ModeSelector currentMode={session.currentMode} onChange={handleModeChange} />
        </div>
      </motion.header>

      {lastError && (
        <ErrorBanner
          message={lastError}
          onRetry={() => {
            setLastError(null);
            retry();
          }}
        />
      )}

      {/* Extraction trigger banner */}
      {extractionReady && !showExtraction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-primary text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-sm"
        >
          <span>💡 Simpan konsep ke memori?</span>
          <button onClick={() => { acceptExtraction(); setShowExtraction(true); }} className="font-medium underline">Ya</button>
          <button onClick={dismissExtraction} className="opacity-70">Nanti</button>
        </motion.div>
      )}

      {showExtraction && session && (
        <ExtractionModal sessionId={session.sessionId} onClose={() => setShowExtraction(false)} />
      )}

      {/* Layout Router — pilih layout sesuai currentMode */}
      <LayoutRouter
        currentMode={session.currentMode}
        session={session}
        messages={messages}
        isStreaming={isStreaming}
        onSend={onSend}
        onQuizAnswer={onQuizAnswer}
        onLatihanAttempt={onLatihanAttempt}
        onAskTerm={onAskTerm}
        onAskDeeper={onAskDeeper}
        onSocraticThought={onSocraticThought}
        onSocraticConfused={onSocraticConfused}
        onAskSimilar={onAskSimilar}
        onAskHarder={onAskHarder}
        onQuizSkip={onQuizSkip}
        onQuizStop={onQuizStop}
        onLatihanEasier={onLatihanEasier}
        onLatihanHarder={onLatihanHarder}
        onLatihanNew={onLatihanNew}
      />
    </div>
  );
}
