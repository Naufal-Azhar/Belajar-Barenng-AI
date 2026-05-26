'use client';

import { motion } from 'framer-motion';
import type {
  AnyPayload,
  ExplainerPayload,
  SocraticPayload,
  QuizPayload,
  LatihanPayload,
  LearningMode,
} from '@/lib/types';
import { messageBubble } from '@/lib/animations';

/**
 * CompactPayloadCard — render preview ringkas pesan AI yang payload-nya
 * berasal dari mode lain (≠ activeMode). Tujuannya: pesan history lintas
 * mode tetap kelihatan & bisa di-recall, tapi nggak dominan & nggak
 * interaktif (sesuai pilihan UX: fokus ke pola mode aktif).
 *
 * Mapping kind → meta di KIND_META, di-export untuk test & dokumentasi.
 */

interface PayloadKindMeta {
  icon: string;
  label: string;
  modeName: string;
  /** Mode key yang harus user pindah ke supaya dapat interaksi penuh */
  targetMode: LearningMode;
}

export const KIND_META: Record<AnyPayload['kind'], PayloadKindMeta> = {
  explainer: { icon: '📘', label: 'Penjelas', modeName: 'Penjelas', targetMode: 'explainer' },
  socratic: { icon: '🤔', label: 'Sokratik', modeName: 'Sokratik', targetMode: 'socratic' },
  quiz: { icon: '📝', label: 'Kuis', modeName: 'Kuis', targetMode: 'quiz' },
  latihan: { icon: '🏋️', label: 'Latihan', modeName: 'Latihan', targetMode: 'latihan' },
};

interface Props {
  payload: AnyPayload;
}

function getTitle(payload: AnyPayload): string {
  switch (payload.kind) {
    case 'explainer':
      return payload.title;
    case 'socratic':
    case 'quiz':
    case 'latihan':
      return payload.question;
  }
}

function getMetadata(payload: AnyPayload): string {
  switch (payload.kind) {
    case 'explainer': {
      const p = payload as ExplainerPayload;
      const sectionWord = p.sections.length === 1 ? 'section' : 'sections';
      const termCount = p.keyTerms?.length ?? 0;
      return `${p.sections.length} ${sectionWord} · ${termCount} istilah kunci`;
    }
    case 'socratic': {
      const p = payload as SocraticPayload;
      return `Kedalaman ${p.depth ?? 1} · ${p.hints.length} petunjuk`;
    }
    case 'quiz': {
      const p = payload as QuizPayload;
      const typeLabel = p.type === 'mcq' ? 'Pilihan ganda' : 'Esai';
      const progress =
        typeof p.index === 'number' && typeof p.total === 'number'
          ? ` · ${p.index}/${p.total}`
          : '';
      return `${typeLabel}${progress}`;
    }
    case 'latihan': {
      const p = payload as LatihanPayload;
      const diff = p.difficulty ?? '—';
      const stepWord = p.steps.length === 1 ? 'langkah' : 'langkah';
      return `Tingkat ${diff} · ${p.steps.length} ${stepWord}`;
    }
  }
}

export default function CompactPayloadCard({ payload }: Props) {
  const meta = KIND_META[payload.kind];
  const title = getTitle(payload);
  const metadata = getMetadata(payload);

  return (
    <motion.article
      variants={messageBubble}
      initial="hidden"
      animate="visible"
      role="article"
      aria-label={`Pesan ringkas dari mode ${meta.modeName}: ${title}`}
      className="rounded-md border border-dashed border-hairline bg-canvas/60 px-4 py-3 opacity-90"
    >
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-soft px-2.5 py-0.5 text-caption font-sans font-medium text-muted">
          <span aria-hidden>{meta.icon}</span>
          <span>{meta.label}</span>
        </span>
        <span className="text-caption text-muted-soft hidden sm:inline">
          dari mode lain
        </span>
      </header>

      <p className="text-body-sm text-ink line-clamp-2 mb-1">{title}</p>

      <p className="text-caption text-muted-soft mb-2">{metadata}</p>

      <p className="text-caption text-muted-soft italic">
        Pindah ke mode {meta.modeName} untuk interaksi penuh
      </p>
    </motion.article>
  );
}
