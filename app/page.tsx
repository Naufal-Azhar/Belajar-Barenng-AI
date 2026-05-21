'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import OnboardingScreen from '@/components/OnboardingScreen';
import { getDeviceId } from '@/lib/device-id';
import type { ProfileType } from '@/lib/types';

interface MemoryStats {
  totalCards: number;
  dueToday: number;
  mastered: number;
  streak: number;
}

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem('belajar.sessionId');
    if (sessionId) {
      router.push('/chat');
      return;
    }
    setChecking(false);

    // Fetch memory stats
    const deviceId = getDeviceId();
    if (deviceId) {
      fetch(`/api/cards/stats?deviceId=${deviceId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.totalCards > 0) setStats(data);
        })
        .catch(() => {});
    }
  }, [router]);

  const handleStart = async (profileType: ProfileType) => {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileType }),
    });

    if (!res.ok) throw new Error('Failed to create session');

    const data = await res.json();
    localStorage.setItem('belajar.sessionId', data.sessionId);
    router.push('/chat');
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-body-sm text-muted-soft animate-pulse">Memuat...</div>
      </div>
    );
  }

  return (
    <>
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
        >
          <div className="bg-surface border border-hairline rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">🧠 Memori Kamu</h3>
              {stats.streak > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
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
                <p className="text-lg font-bold text-green-600">{stats.mastered}</p>
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
          </div>
        </motion.div>
      )}
      <OnboardingScreen onStart={handleStart} />
    </>
  );
}
