'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getDeviceId } from '@/lib/device-id';
import type { FlashCard } from '@/lib/types';

type Stage = 'loading' | 'reviewing' | 'answered' | 'complete' | 'empty';

export default function ReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stage, setStage] = useState<Stage>('loading');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ grade: number; feedback: string; nextDue: string } | null>(null);
  const [crossMode, setCrossMode] = useState<{ mode: string; concept: string } | null>(null);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    if (!deviceId) { setStage('empty'); return; }
    fetch(`/api/cards/due?deviceId=${deviceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.cards?.length) {
          setCards(data.cards);
          setStage('reviewing');
        } else {
          setStage('empty');
        }
      })
      .catch(() => setStage('empty'));
  }, []);

  const currentCard = cards[currentIdx];

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentCard) return;
    setGrading(true);
    try {
      const res = await fetch('/api/cards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.cardId,
          deviceId: currentCard.deviceId,
          userAnswer: userAnswer.trim(),
        }),
      });
      const data = await res.json();
      setFeedback({ grade: data.grade, feedback: data.feedback, nextDue: data.nextDue });
      if (data.crossModeSuggestion) setCrossMode(data.crossModeSuggestion);
      setStage('answered');
    } catch {
      setFeedback({ grade: -1, feedback: 'Gagal menilai, coba lagi', nextDue: '' });
      setStage('answered');
    } finally {
      setGrading(false);
    }
  };

  const handleNext = () => {
    setUserAnswer('');
    setFeedback(null);
    setCrossMode(null);
    if (currentIdx + 1 >= cards.length) {
      setStage('complete');
    } else {
      setCurrentIdx((i) => i + 1);
      setStage('reviewing');
    }
  };

  const handleCrossMode = async () => {
    if (!crossMode || !currentCard) return;
    // Create session and navigate to chat
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileType: 'mahasiswa' }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('belajar.sessionId', data.sessionId);
      localStorage.setItem('belajar.crossMode', JSON.stringify({
        mode: crossMode.mode,
        concept: crossMode.concept,
        question: currentCard.question,
        answer: currentCard.answer,
        userAnswer,
      }));
      router.push('/chat');
    }
  };

  const gradeEmoji = (g: number) => {
    if (g >= 4) return '🎉';
    if (g >= 3) return '👍';
    if (g >= 2) return '🤔';
    return '💪';
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-hairline">
        <button onClick={() => router.push('/')} className="text-sm text-muted hover:text-ink">← Beranda</button>
        <h1 className="text-sm font-medium text-ink">Review Memori</h1>
        {cards.length > 0 && stage !== 'complete' && (
          <span className="text-xs text-muted">{currentIdx + 1}/{cards.length}</span>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {stage === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="animate-pulse text-muted">Memuat kartu review...</div>
            </motion.div>
          )}

          {stage === 'empty' && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-ink font-medium mb-2">Belum ada kartu untuk di-review</p>
              <p className="text-sm text-muted mb-4">Mulai belajar dulu, nanti kartu otomatis muncul di sini</p>
              <button onClick={() => router.push('/')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                Mulai Belajar
              </button>
            </motion.div>
          )}

          {stage === 'reviewing' && currentCard && (
            <motion.div
              key={`card-${currentIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-md"
            >
              <div className="bg-surface rounded-xl p-6 shadow-sm border border-hairline">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mb-3 inline-block">
                  {currentCard.concept}
                </span>
                <p className="text-lg font-medium text-ink mb-6">{currentCard.question}</p>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Ketik jawabanmu..."
                  className="w-full p-3 border border-hairline rounded-lg text-sm resize-none h-24 focus:outline-none focus:border-primary"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim() || grading}
                  className="w-full mt-3 py-2.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  {grading ? 'Menilai...' : 'Kirim Jawaban'}
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'answered' && feedback && currentCard && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-surface rounded-xl p-6 shadow-sm border border-hairline">
                <div className="text-center mb-4">
                  <span className="text-3xl">{gradeEmoji(feedback.grade)}</span>
                  <p className="text-sm text-muted mt-1">
                    {feedback.grade >= 3 ? 'Bagus!' : feedback.grade >= 2 ? 'Hampir!' : 'Perlu review lagi'}
                  </p>
                </div>
                <div className="bg-canvas rounded-lg p-3 mb-3">
                  <p className="text-xs text-muted mb-1">Jawaban yang benar:</p>
                  <p className="text-sm text-ink">{currentCard.answer}</p>
                </div>
                <p className="text-sm text-muted mb-4">{feedback.feedback}</p>

                {crossMode && (
                  <button
                    onClick={handleCrossMode}
                    className="w-full mb-3 py-2 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/5"
                  >
                    🧠 Bedah pakai mode {crossMode.mode === 'socratic' ? 'Sokratik' : 'Latihan'}
                  </button>
                )}

                <button onClick={handleNext} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium">
                  {currentIdx + 1 >= cards.length ? 'Selesai' : 'Kartu Berikutnya →'}
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-xl font-semibold text-ink mb-2">Review Selesai!</p>
              <p className="text-sm text-muted mb-4">{cards.length} kartu telah di-review hari ini</p>
              <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium">
                Kembali ke Beranda
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
