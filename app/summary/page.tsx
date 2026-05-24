'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SummaryView from '@/components/SummaryView';
import type { SummaryPayload } from '@/lib/types';

export default function SummaryPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('belajar.summary');
    if (stored) {
      setSummary(JSON.parse(stored));
    } else {
      router.push('/chat');
    }
  }, [router]);

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="animate-pulse text-muted-soft">Memuat ringkasan...</div>
      </div>
    );
  }

  const handleNewSession = () => {
    localStorage.removeItem('belajar.activeSessionId');
    sessionStorage.removeItem('belajar.summary');
    router.push('/');
  };

  const handleFinish = () => {
    sessionStorage.removeItem('belajar.summary');
    router.push('/');
  };

  return (
    <SummaryView
      summary={summary}
      onNewSession={handleNewSession}
      onFinish={handleFinish}
    />
  );
}
