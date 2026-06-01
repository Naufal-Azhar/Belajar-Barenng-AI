'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { popContainer, popIn } from '@/lib/animations';
import { PixelBadge } from './Pixel';

interface DashboardProps {
  sessions: Session[];
  isLoading?: boolean;
  error?: string | null;
  onNewSession: () => void;
  onRetry?: () => void;
  /** Optional: extra content above the grid (mis. memory stats banner) */
  topSlot?: React.ReactNode;
}

const modeLabel: Record<Session['currentMode'], string> = {
  explainer: 'Penjelas',
  socratic: 'Sokratik',
  quiz: 'Kuis',
  latihan: 'Latihan',
};

const modeEmoji: Record<Session['currentMode'], string> = {
  explainer: '📖',
  socratic: '🤔',
  quiz: '🎯',
  latihan: '✏️',
};

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHr < 24) return `${diffHr}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Dashboard({ sessions, isLoading = false, error, onNewSession, onRetry, topSlot }: DashboardProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-canvas px-4 py-8 sm:py-12 overflow-hidden">
      <div className="absolute -right-20 -top-20 z-0 h-80 w-80 rounded-full bg-accent-teal/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3">
            <PixelBadge>Ruang Belajar</PixelBadge>
          </div>
          <h1 className="font-serif font-bold text-display-md text-ink mb-2">BelajarBareng AI</h1>
          <p className="text-body-md text-muted">Pilih sesi belajar yang ada atau mulai topik baru.</p>
        </motion.div>

        {topSlot && <div className="mb-6">{topSlot}</div>}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/5 px-4 py-3"
          >
            <span className="text-body-sm text-error">Gagal memuat sesi: {error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-pill bg-error/10 px-3 py-1 text-caption font-semibold text-error hover:bg-error/20 transition-colors"
              >
                Coba Lagi
              </button>
            )}
          </motion.div>
        )}

        {/* New Session CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={onNewSession}
          aria-label="Mulai sesi belajar baru"
          className="mb-6 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline px-4 py-5 text-body-md font-sans font-bold text-ink hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Mulai Sesi Baru
        </motion.button>

        {/* Sessions grid */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center py-12"
          >
            <video
              src="/cat-movement.webm"
              autoPlay loop muted playsInline aria-hidden="true"
              className="pixelated mx-auto mb-4 h-28 w-28 object-contain motion-reduce:hidden"
            />
            <p className="text-body-md font-semibold text-ink">Belum ada sesi belajar</p>
            <p className="text-body-sm text-muted-soft mt-1">Klik tombol di atas untuk mulai topik baru.</p>
          </motion.div>
        ) : (
          <motion.div
            variants={popContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sessions.map((session) => (
              <motion.button
                key={session.sessionId}
                variants={popIn}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/chat?sessionId=${session.sessionId}`)}
                className="group text-left bg-surface-card hover:bg-surface-card border border-hairline hover:border-primary/40 rounded-2xl p-4 shadow-soft hover:shadow-pop transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-body-md font-bold text-ink line-clamp-2 flex-1">
                    {session.title || 'Sesi tanpa judul'}
                  </h3>
                  {session.endedAt && (
                    <span className="text-success flex-shrink-0" aria-label="Sesi selesai">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge gap-1 text-caption">
                    <span aria-hidden>{modeEmoji[session.currentMode]}</span>
                    {modeLabel[session.currentMode]}
                  </span>
                  <span className="text-caption text-muted-soft">{formatRelative(session.updatedAt)}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 bg-surface-card/50 border border-hairline rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}
