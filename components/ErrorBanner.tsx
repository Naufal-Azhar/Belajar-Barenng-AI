'use client';

import { motion } from 'framer-motion';

interface Props {
  message: string;
  onRetry: () => void;
}

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-4 mt-2 flex items-center justify-between rounded-md border border-error/20 bg-error/5 px-4 py-3"
    >
      <span className="text-body-sm text-error">{message}</span>
      <button
        onClick={onRetry}
        className="rounded-md bg-error/10 px-3 py-1 text-caption font-medium text-error hover:bg-error/20 transition-colors"
      >
        Coba Lagi
      </button>
    </motion.div>
  );
}
