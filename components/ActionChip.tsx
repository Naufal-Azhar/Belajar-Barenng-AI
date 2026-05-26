'use client';

import { motion } from 'framer-motion';
import type { UserMessageIntent } from '@/lib/types';
import { messageBubble } from '@/lib/animations';

/**
 * ActionChip — render pesan user yang ke-trigger dari klik tombol UI
 * (auto-generated dari handler kayak onAskDeeper, onSocraticConfused, dst.)
 * sebagai chip kompak yang visual-nya beda dari bubble user manual.
 *
 * Ditampilkan di sisi kanan (justify-end) sama kayak bubble user, tapi
 * lebih kecil + opacity rendah biar nggak dominan di chat history. Tidak
 * interaktif (display only).
 *
 * Mapping intent → icon di INTENT_META, di-export agar bisa dipakai di test
 * & dokumentasi.
 */

interface ActionChipMeta {
  icon: string;
  defaultLabel: string;
}

export const INTENT_META: Record<Exclude<UserMessageIntent, 'manual'>, ActionChipMeta> = {
  'ask-term': { icon: '📖', defaultLabel: 'Tanya istilah' },
  'ask-deeper': { icon: '💡', defaultLabel: 'Lebih dalam' },
  'confused': { icon: '🤔', defaultLabel: 'Saya bingung' },
  'ask-similar': { icon: '🔁', defaultLabel: 'Soal serupa' },
  'ask-harder': { icon: '📈', defaultLabel: 'Soal lebih sulit' },
  'ask-easier': { icon: '📉', defaultLabel: 'Soal lebih mudah' },
  'ask-new': { icon: '✨', defaultLabel: 'Soal baru' },
  'quiz-skip': { icon: '⏭️', defaultLabel: 'Skip soal' },
  'quiz-start': { icon: '🚀', defaultLabel: 'Mulai kuis' },
  'quiz-next': { icon: '➡️', defaultLabel: 'Soal berikutnya' },
  'document-uploaded': { icon: '📎', defaultLabel: 'Upload dokumen' },
  'cross-mode-bridge': { icon: '🔗', defaultLabel: 'Lanjut dari review' },
};

interface Props {
  intent: UserMessageIntent;
  /** Label spesifik (mis. "Lebih dalam: Inti"). Override defaultLabel kalau ada. */
  actionLabel?: string;
  /** Konten asli pesan template — fallback terakhir kalau actionLabel & defaultLabel keduanya tidak ada. */
  content?: string;
}

const MAX_FALLBACK_LEN = 40;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export default function ActionChip({ intent, actionLabel, content }: Props) {
  // Intent === 'manual' seharusnya nggak sampai ke ActionChip (di-handle MessageRenderer),
  // tapi defensive: kalau dipanggil langsung, fallback ke bubble-style content sederhana.
  if (intent === 'manual') {
    return null;
  }

  const meta = INTENT_META[intent];
  const label = actionLabel?.trim()
    ? actionLabel
    : meta?.defaultLabel ?? (content ? truncate(content, MAX_FALLBACK_LEN) : 'Aksi');
  const icon = meta?.icon ?? '•';

  return (
    <motion.div
      variants={messageBubble}
      initial="hidden"
      animate="visible"
      className="flex justify-end"
    >
      <span
        role="status"
        aria-label={`Aksi tombol: ${label}`}
        className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-soft px-3 py-1.5 text-caption font-sans text-muted opacity-80 max-w-[85%]"
      >
        <span aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
    </motion.div>
  );
}
