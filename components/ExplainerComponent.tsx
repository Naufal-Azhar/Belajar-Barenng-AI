'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ExplainerPayload, ExplainerSectionLabel } from '@/lib/types';

interface Props {
  payload: ExplainerPayload;
  onAskTerm?: (term: string) => void;
  onAskDeeper?: (sectionLabel: ExplainerSectionLabel) => void;
}

const SECTION_ICON: Record<ExplainerSectionLabel, string> = {
  Inti: '🎯',
  Analogi: '🌱',
  Contoh: '✨',
  'TL;DR': '📌',
};

export default function ExplainerComponent({ payload, onAskTerm, onAskDeeper }: Props) {
  // Section pertama auto-open, sisanya collapsed by default
  const [open, setOpen] = useState<boolean[]>(
    payload.sections.map((_, i) => i === 0)
  );

  const toggle = (idx: number) => {
    setOpen((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card my-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-soft px-3 py-1 text-caption font-sans font-medium text-ink">
          <span>💡</span>
          <span>Penjelas</span>
        </span>
      </div>

      <h3 className="mb-4 font-serif text-display-sm text-ink leading-snug">
        {payload.title}
      </h3>

      <div className="space-y-2">
        {payload.sections.map((section, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-md border border-hairline bg-canvas"
          >
            <button
              onClick={() => toggle(idx)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-soft"
            >
              <span className="flex items-center gap-2 text-title-sm font-sans text-ink">
                <span aria-hidden>{SECTION_ICON[section.label]}</span>
                <span>{section.label}</span>
              </span>
              <motion.span
                animate={{ rotate: open[idx] ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted-soft"
                aria-hidden
              >
                ▾
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open[idx] && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="border-t border-hairline-soft"
                >
                  <div
                    className="prose prose-sm max-w-none px-4 py-3 text-body
                               prose-p:my-1.5 prose-headings:font-serif prose-headings:text-ink
                               prose-strong:text-ink prose-a:text-primary"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.body}
                    </ReactMarkdown>
                  </div>

                  {onAskDeeper && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => onAskDeeper(section.label)}
                        className="text-caption font-sans font-medium text-primary hover:underline"
                      >
                        Lebih dalam tentang {section.label.toLowerCase()} →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {payload.keyTerms && payload.keyTerms.length > 0 && (
        <div className="mt-4 border-t border-hairline-soft pt-3">
          <p className="mb-2 text-caption font-sans font-medium text-muted">
            Istilah kunci
          </p>
          <div className="flex flex-wrap gap-1.5">
            {payload.keyTerms.map((term, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAskTerm?.(term)}
                className="rounded-pill border border-hairline bg-surface-soft px-3 py-1 text-caption font-sans font-medium text-ink hover:border-primary hover:text-primary transition-colors"
              >
                {term}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
