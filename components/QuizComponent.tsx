'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizPayload } from '@/lib/types';

interface Props {
  payload: QuizPayload;
  onSubmitAnswer: (answer: string) => void;
  onAskSimilar?: () => void;
  onAskHarder?: () => void;
}

export default function QuizComponent({
  payload,
  onSubmitAnswer,
  onAskSimilar,
  onAskHarder,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [essayAnswer, setEssayAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const userAnswer = payload.type === 'mcq' ? selectedOption : essayAnswer;
  const isCorrect =
    submitted &&
    userAnswer.trim().toLowerCase() === payload.correctAnswer.trim().toLowerCase();

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    setSubmitted(true);
    onSubmitAnswer(userAnswer);
  };

  const optionState = (option: string) => {
    if (!submitted) {
      return selectedOption === option
        ? 'border-primary bg-canvas shadow-subtle'
        : 'border-hairline bg-canvas hover:border-primary/30';
    }
    // After submit
    if (option === payload.correctAnswer) {
      return 'border-success bg-success/10';
    }
    if (option === selectedOption) {
      return 'border-error bg-error/10';
    }
    return 'border-hairline bg-canvas opacity-60';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card my-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="badge-primary">
          {payload.type === 'mcq' ? 'Pilihan Ganda' : 'Essay'}
        </span>
      </div>

      <p className="mb-4 font-serif text-display-sm text-ink leading-snug">
        {payload.question}
      </p>

      {payload.type === 'mcq' && payload.options ? (
        <div className="mb-5 space-y-2">
          {payload.options.map((option, idx) => {
            const isCorrectOption = submitted && option === payload.correctAnswer;
            const isWrongPick =
              submitted && option === selectedOption && option !== payload.correctAnswer;
            return (
              <motion.label
                key={idx}
                whileHover={!submitted ? { scale: 1.01 } : undefined}
                whileTap={!submitted ? { scale: 0.99 } : undefined}
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-all duration-200 ${optionState(option)} ${submitted ? 'pointer-events-none' : ''}`}
              >
                <input
                  type="radio"
                  name="quiz-option"
                  value={option}
                  checked={selectedOption === option}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  disabled={submitted}
                  className="accent-primary"
                />
                <span className="flex-1 text-body-sm text-body">{option}</span>
                {isCorrectOption && (
                  <span className="text-caption font-sans font-medium text-success">
                    ✓ Benar
                  </span>
                )}
                {isWrongPick && (
                  <span className="text-caption font-sans font-medium text-error">
                    ✗ Pilihanmu
                  </span>
                )}
              </motion.label>
            );
          })}
        </div>
      ) : (
        <textarea
          value={essayAnswer}
          onChange={(e) => setEssayAnswer(e.target.value)}
          disabled={submitted}
          placeholder="Tulis jawabanmu di sini..."
          className="input mb-5 w-full resize-none"
          rows={3}
        />
      )}

      {!submitted && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className="btn-primary"
        >
          Cek Jawaban
        </motion.button>
      )}

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3"
          >
            <div
              className={`rounded-md border p-3.5 ${
                isCorrect
                  ? 'border-success/30 bg-success/5'
                  : 'border-error/30 bg-error/5'
              }`}
            >
              <p
                className={`mb-1 text-title-sm font-sans ${
                  isCorrect ? 'text-success' : 'text-error'
                }`}
              >
                {isCorrect ? '✓ Tepat sekali!' : '✗ Belum tepat'}
              </p>
              {payload.type === 'essay' && !isCorrect && (
                <p className="text-body-sm text-body">
                  Jawaban yang diharapkan:{' '}
                  <span className="font-medium text-ink">
                    {payload.correctAnswer}
                  </span>
                </p>
              )}
              {payload.explanation && (
                <p className="mt-1.5 text-body-sm text-body leading-relaxed">
                  {payload.explanation}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {onAskSimilar && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onAskSimilar}
                  className="btn-secondary"
                >
                  Soal serupa
                </motion.button>
              )}
              {onAskHarder && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onAskHarder}
                  className="btn-secondary"
                >
                  Lebih sulit
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
