'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

type PresenceStatus = 'checking' | 'admitted' | 'full';

/**
 * Heartbeat presence: admit awal saat mount + ping tiap 60 dtk.
 * Jika kapasitas penuh → status 'full'.
 */
export function usePresence(): PresenceStatus {
  const [status, setStatus] = useState<PresenceStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await apiFetch('/api/presence', { method: 'POST' });
        if (!cancelled) setStatus(res.ok ? 'admitted' : 'full');
      } catch {
        if (!cancelled) setStatus('admitted'); // jangan blokir karena error jaringan
      }
    };

    ping();
    const id = setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}
