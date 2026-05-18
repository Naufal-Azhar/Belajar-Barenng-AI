'use client';

import { motion } from 'framer-motion';
import type { SummaryPayload } from '@/lib/types';

interface Props {
  summary: SummaryPayload;
  onNewSession: () => void;
  onFinish: () => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function SummaryView({ summary, onNewSession, onFinish }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-section bg-canvas">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-lg"
      >
        <motion.div variants={item} className="mb-10 text-center">
          <h1 className="font-serif text-display-md text-ink">Ringkasan Sesi</h1>
          <p className="mt-2 text-body-md text-muted">
            Berikut rangkuman dari sesi belajarmu
          </p>
        </motion.div>

        <motion.div variants={item} className="card mb-4">
          <h2 className="mb-3 text-caption-upper uppercase tracking-wider text-muted">
            Topik yang Dibahas
          </h2>
          <ul className="space-y-2">
            {summary.topicsCovered.map((topic, idx) => (
              <li key={idx} className="flex items-start gap-2 text-body-sm text-body">
                <span className="mt-0.5 text-primary">•</span>
                {topic}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item} className="card mb-4">
          <h2 className="mb-3 text-caption-upper uppercase tracking-wider text-muted">
            Poin Pemahaman
          </h2>
          <ul className="space-y-2">
            {summary.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-body-sm text-body">
                <span className="mt-0.5 text-success">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item} className="card mb-8">
          <h2 className="mb-3 text-caption-upper uppercase tracking-wider text-muted">
            Rekomendasi Lanjutan
          </h2>
          <ul className="space-y-2">
            {summary.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-body-sm text-body">
                <span className="mt-0.5 text-accent-amber">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item} className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNewSession}
            className="btn-primary flex-1"
          >
            Mulai Sesi Baru
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFinish}
            className="btn-secondary flex-1"
          >
            Selesai
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
