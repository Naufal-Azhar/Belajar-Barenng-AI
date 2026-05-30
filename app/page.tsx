'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import OnboardingScreen from '@/components/OnboardingScreen';
import Dashboard from '@/components/Dashboard';
import { useSessions } from '@/hooks/useSessions';
import { getDeviceId } from '@/lib/device-id';

interface MemoryStats {
  totalCards: number;
  dueToday: number;
  mastered: number;
  streak: number;
}

export default function HomePage() {
  const router = useRouter();
  const { sessions, isLoading, error, createSession, refresh } = useSessions();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    // Fetch memory stats (FSRS reviews due)
    const deviceId = getDeviceId();
    if (deviceId) {
      fetch(`/api/cards/stats?deviceId=${deviceId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.totalCards > 0) setStats(data);
        })
        .catch(() => {});
    }
  }, []);

  // First-time user (no sessions yet) → onboarding flow
  const isFirstTime = !isLoading && sessions.length === 0;

  const handleStart = async () => {
    const created = await createSession();
    router.push(`/chat?sessionId=${created.sessionId}`);
  };

  // Memory stats banner — pakai di dashboard sebagai topSlot
  const memoryBanner = stats && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-hairline rounded-xl p-4 shadow-subtle"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">🧠 Memori Kamu</h3>
        {stats.streak > 0 && (
          <span className="text-xs bg-accent-amber/20 text-ink px-2 py-0.5 rounded-full">
            🔥 {stats.streak} hari
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-lg font-bold text-ink">{stats.totalCards}</p>
          <p className="text-xs text-muted">Kartu</p>
        </div>
        <div>
          <p className="text-lg font-bold text-primary">{stats.dueToday}</p>
          <p className="text-xs text-muted">Due</p>
        </div>
        <div>
          <p className="text-lg font-bold text-accent-leaf">{stats.mastered}</p>
          <p className="text-xs text-muted">Mastered</p>
        </div>
      </div>
      {stats.dueToday > 0 && (
        <button
          onClick={() => router.push('/review')}
          className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Review Sekarang ({stats.dueToday} kartu)
        </button>
      )}
    </motion.div>
  );

  // First-time → langsung onboarding (no dashboard)
  if (isFirstTime) {
    return <OnboardingScreen onStart={handleStart} />;
  }

  // Trigger onboarding-as-modal lewat state — show overlay onboarding screen
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onStart={async () => {
          await handleStart();
          setShowOnboarding(false);
        }}
      />
    );
  }

  // Regular dashboard for returning users
  return (
    <Dashboard
      sessions={sessions}
      isLoading={isLoading}
      error={error}
      onRetry={refresh}
      onNewSession={() => setShowOnboarding(true)}
      topSlot={memoryBanner}
    />
  );
}
