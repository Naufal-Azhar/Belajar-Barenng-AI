'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDeviceId } from '@/lib/device-id';
import type { Session, ProfileType } from '@/lib/types';

interface UseSessionsState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
}

interface UseSessionsResult extends UseSessionsState {
  refresh: () => Promise<void>;
  createSession: (profileType: ProfileType) => Promise<Session>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
}

/**
 * Hook untuk fetch + manage list sesi user.
 *
 * Behaviour:
 * - Initial fetch saat mount via getDeviceId() header
 * - Optimistic updates untuk create/delete/rename (UI berubah dulu, revert jika error)
 * - refresh() untuk manual re-fetch (mis. saat login state berubah di Phase 5)
 *
 * Tidak ada listener real-time — pakai one-shot fetch untuk hemat Firestore quota.
 */
export function useSessions(): UseSessionsResult {
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    isLoading: true,
    error: null,
  });
  const cancelledRef = useRef(false);

  const fetchList = useCallback(async (): Promise<void> => {
    cancelledRef.current = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'X-Device-Id': getDeviceId() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (cancelledRef.current) return;
      setState({
        sessions: data.sessions ?? [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (cancelledRef.current) return;
      setState({
        sessions: [],
        isLoading: false,
        error: (err as Error).message || 'Gagal memuat sesi',
      });
    }
  }, []);

  useEffect(() => {
    fetchList();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchList]);

  const createSession = useCallback(async (profileType: ProfileType): Promise<Session> => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify({ profileType }),
    });
    if (!res.ok) throw new Error('Gagal membuat sesi');
    const data = await res.json();
    const newSession: Session = {
      sessionId: data.sessionId,
      profileType,
      currentMode: data.currentMode,
      startedAt: data.startedAt,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      updatedAt: data.updatedAt,
    };
    // Optimistic: prepend ke list (sort by updatedAt desc)
    setState((s) => ({ ...s, sessions: [newSession, ...s.sessions] }));
    return newSession;
  }, []);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    // Optimistic: remove from list
    let removed: Session | undefined;
    setState((s) => {
      removed = s.sessions.find((x) => x.sessionId === sessionId);
      return { ...s, sessions: s.sessions.filter((x) => x.sessionId !== sessionId) };
    });

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'X-Device-Id': getDeviceId() },
      });
      if (!res.ok) throw new Error('Gagal menghapus');
    } catch (err) {
      // Revert optimistic update
      if (removed) {
        setState((s) => ({ ...s, sessions: [removed!, ...s.sessions] }));
      }
      throw err;
    }
  }, []);

  const renameSession = useCallback(async (sessionId: string, title: string): Promise<void> => {
    // Optimistic: update title locally
    let oldTitle: string | undefined;
    setState((s) => {
      const updated = s.sessions.map((x) => {
        if (x.sessionId === sessionId) {
          oldTitle = x.title;
          return { ...x, title };
        }
        return x;
      });
      return { ...s, sessions: updated };
    });

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getDeviceId(),
        },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Gagal rename');
    } catch (err) {
      // Revert
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((x) =>
          x.sessionId === sessionId ? { ...x, title: oldTitle } : x,
        ),
      }));
      throw err;
    }
  }, []);

  return {
    ...state,
    refresh: fetchList,
    createSession,
    deleteSession,
    renameSession,
  };
}
