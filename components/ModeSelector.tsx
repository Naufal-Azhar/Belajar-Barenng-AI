'use client';

import { motion } from 'framer-motion';
import type { LearningMode } from '@/lib/types';

interface Props {
  currentMode: LearningMode;
  onChange: (mode: LearningMode) => void;
}

const modes: { id: LearningMode; label: string; icon: string }[] = [
  { id: 'explainer', label: 'Penjelas', icon: '💡' },
  { id: 'socratic', label: 'Sokratik', icon: '🤔' },
  { id: 'quiz', label: 'Kuis', icon: '📝' },
  { id: 'latihan', label: 'Latihan', icon: '🏋️' },
];

export default function ModeSelector({ currentMode, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-soft p-1">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className="relative flex-1 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 text-nav-link font-sans transition-colors"
        >
          {currentMode === mode.id && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-md bg-canvas border border-hairline shadow-subtle"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span className={`relative z-10 flex items-center justify-center gap-1 ${
            currentMode === mode.id ? 'text-ink' : 'text-muted'
          }`}>
            <span>{mode.icon}</span>
            <span className="hidden sm:inline">{mode.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
