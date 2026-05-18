'use client';

import { useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, Message, LearningMode } from '@/lib/types';

type SessionStatus = 'no-session' | 'hydrating' | 'ready' | 'error';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  messages: Message[];
  error: string | null;
}

type SessionAction =
  | { type: 'SET_HYDRATING' }
  | { type: 'SET_READY'; session: Session; messages: Message[] }
  | { type: 'SET_NO_SESSION' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'APPEND_USER_MESSAGE'; message: Message }
  | { type: 'APPEND_AI_TOKEN'; token: string }
  | { type: 'APPEND_AI_PAYLOAD'; message: Message }
  | { type: 'FINALIZE_AI_MESSAGE'; messageId: string }
  | { type: 'SET_MODE'; mode: LearningMode }
  | { type: 'CLEAR_ERROR' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_HYDRATING':
      return { ...state, status: 'hydrating' };
    case 'SET_READY':
      return { status: 'ready', session: action.session, messages: action.messages, error: null };
    case 'SET_NO_SESSION':
      return { status: 'no-session', session: null, messages: [], error: null };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'APPEND_USER_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'APPEND_AI_TOKEN': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'ai' && !last.messageId) {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.token };
      } else {
        msgs.push({
          messageId: '',
          sessionId: state.session?.sessionId || '',
          role: 'ai',
          mode: state.session?.currentMode || 'explainer',
          content: action.token,
          createdAt: new Date().toISOString(),
        });
      }
      return { ...state, messages: msgs };
    }
    case 'APPEND_AI_PAYLOAD':
      return { ...state, messages: [...state.messages, action.message] };
    case 'FINALIZE_AI_MESSAGE': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, messageId: action.messageId };
      }
      return { ...state, messages: msgs };
    }
    case 'SET_MODE':
      return {
        ...state,
        session: state.session ? { ...state.session, currentMode: action.mode } : null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null, status: 'ready' };
    default:
      return state;
  }
}

const STORAGE_KEY = 'belajar.sessionId';

export function useSession() {
  const router = useRouter();
  const [state, dispatch] = useReducer(sessionReducer, {
    status: 'no-session',
    session: null,
    messages: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      dispatch({ type: 'SET_NO_SESSION' });
      return;
    }

    dispatch({ type: 'SET_HYDRATING' });

    fetch(`/api/session?id=${sessionId}`)
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          // Session tidak ditemukan — hapus dari localStorage dan reset
          localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: 'SET_NO_SESSION' });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          dispatch({ type: 'SET_READY', session: data.session, messages: data.messages });
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Jika error jaringan, hapus session lama agar tidak loop
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: 'SET_NO_SESSION' });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSession = useCallback(
    async (profileType: 'mahasiswa' | 'sma') => {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileType }),
      });

      if (!res.ok) {
        throw new Error('Gagal membuat sesi');
      }

      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, data.sessionId);
      dispatch({
        type: 'SET_READY',
        session: {
          sessionId: data.sessionId,
          profileType,
          currentMode: data.currentMode,
          startedAt: new Date().toISOString(),
        },
        messages: [],
      });
      return data.sessionId;
    },
    []
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'SET_NO_SESSION' });
  }, []);

  return {
    ...state,
    dispatch,
    createSession,
    clearSession,
  };
}
