'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import OnboardingScreen from '@/components/OnboardingScreen';
import type { ProfileType } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem('belajar.sessionId');
    if (sessionId) {
      router.push('/chat');
    } else {
      setChecking(false);
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

  return <OnboardingScreen onStart={handleStart} />;
}
