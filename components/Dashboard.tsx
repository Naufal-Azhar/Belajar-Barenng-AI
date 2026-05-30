'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/types';
import { PixelBadge, PixelFrame, PixelDivider } from './Pixel';

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
    <div className="relative min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="pixel-grid absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="grid grid-cols-2 grid-rows-2 gap-0.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 bg-primary" />
              <span className="h-2.5 w-2.5 bg-accent-amber" />
              <span className="h-2.5 w-2.5 bg-accent-leaf" />
              <span className="h-2.5 w-2.5 bg-primary" />
            </span>
            <PixelBadge>Ruang Belajar</PixelBadge>
          </div>
          <h1 className="font-serif text-display-md text-ink mb-2">BelajarBareng AI</h1>
          <p className="text-body-md text-muted">Pilih sesi belajar yang ada atau mulai topik baru.</p>
        </motion.div>

        {topSlot && <div className="mb-6">{topSlot}</div>}

        {/* Error banner — tampil di atas grid kalau fetch gagal */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between gap-3 rounded-md border border-error/20 bg-error/5 px-4 py-3"
          >
            <span className="text-body-sm text-error">Gagal memuat sesi: {error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-md bg-error/10 px-3 py-1 text-caption font-medium text-error hover:bg-error/20 transition-colors"
              >
                Coba Lagi
              </button>
            )}
          </motion.div>
        )}

        {/* New Session CTA — pixel-framed */}
        <PixelFrame className="mb-6">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onNewSession}
            aria-label="Mulai sesi belajar baru"
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-hairline px-4 py-5 text-body-md font-sans font-medium text-ink hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Mulai Sesi Baru
          </motion.button>
        </PixelFrame>

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
            <span className="mx-auto mb-4 grid w-fit grid-cols-3 grid-rows-3 gap-0.5 opacity-70" aria-hidden="true">
              {['bg-primary', 'bg-accent-amber', 'bg-primary', 'bg-accent-amber', 'bg-accent-leaf', 'bg-accent-amber', 'bg-primary', 'bg-accent-amber', 'bg-primary'].map((c, i) => (
                <span key={i} className={`h-2.5 w-2.5 ${c}`} />
              ))}
            </span>
            <p className="text-body-md text-muted">Belum ada sesi belajar</p>
            <p className="text-body-sm text-muted-soft mt-1">Klik tombol di atas untuk mulai topik baru.</p>
            <PixelDivider className="mx-auto mt-5 max-w-[140px] text-hairline" />
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, idx) => (
              <motion.button
                key={session.sessionId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                whileHover={{ y: -2 }}
                onClick={() => router.push(`/chat?sessionId=${session.sessionId}`)}
                className="group relative text-left bg-surface/50 hover:bg-surface border border-hairline hover:border-primary/40 rounded-lg p-4 transition-all"
              >
                <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-1.5 w-1.5 bg-accent-amber opacity-0 group-hover:opacity-100 transition-opacity" />
                <span aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 h-1.5 w-1.5 bg-accent-amber opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-body-md font-medium text-ink line-clamp-2 flex-1">
                    {session.title || 'Sesi tanpa judul'}
                  </h3>
                  {session.endedAt && (
                    <span className="text-success flex-shrink-0" aria-label="Sesi selesai">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-caption">
                  <span className="font-pixel text-[10px] uppercase tracking-wider text-ink">{modeLabel[session.currentMode]}</span>
                  <span className="text-muted-soft">·</span>
                  <span className="text-muted-soft">{formatRelative(session.updatedAt)}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 bg-surface/30 border border-hairline rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
