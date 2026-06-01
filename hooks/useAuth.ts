'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-fetch';

export interface AuthProfile {
  username: string;
  displayName: string;
  hasPin?: boolean;
}

export interface RecentAccount {
  username: string;
  displayName: string;
}

const RECENT_KEY = 'belajar.recentAccounts';
const MAX_RECENT = 5;

// --- Pure helpers (testable tanpa React) ---

export function addRecentAccount(list: RecentAccount[], acc: RecentAccount): RecentAccount[] {
  const filtered = list.filter((a) => a.username !== acc.username);
  return [{ username: acc.username, displayName: acc.displayName }, ...filtered].slice(0, MAX_RECENT);
}

export function loadRecentAccounts(): RecentAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentAccount[]) : [];
  } catch {
    return [];
  }
}

export function useAuth() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<RecentAccount[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRecent(loadRecentAccounts());
    refresh();
  }, [refresh]);

  const remember = useCallback((p: AuthProfile) => {
    const next = addRecentAccount(loadRecentAccounts(), { username: p.username, displayName: p.displayName });
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    setRecent(next);
  }, []);

  const submit = useCallback(
    async (path: '/api/auth/login' | '/api/auth/register', body: Record<string, unknown>) => {
      const res = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      setProfile(data.profile);
      remember(data.profile);
      // Klaim sesi tamu (device) ke profil — idempotent. Lalu reload supaya
      // sidebar & state owner tersinkron dengan cookie baru.
      try {
        await apiFetch('/api/auth/claim', { method: 'POST' });
      } catch {}
      if (typeof window !== 'undefined') window.location.reload();
      return data.profile as AuthProfile;
    },
    [remember],
  );

  const login = useCallback(
    (username: string, pin?: string) => submit('/api/auth/login', { username, pin }),
    [submit],
  );

  const register = useCallback(
    (username: string, pin?: string, displayName?: string) =>
      submit('/api/auth/register', { username, pin, displayName }),
    [submit],
  );

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setProfile(null);
  }, []);

  return { profile, loading, recent, isAuthed: !!profile, login, register, logout, refresh };
}
