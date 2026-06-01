'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
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

const ACTIVE_SESSION_KEY = 'belajar.activeSessionId';

// Ephemeral: sessionStorage agar sesi aktif tidak ter-resume setelah tab ditutup.
function readActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACTIVE_SESSION_KEY);
}

export function useSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(sessionReducer, {
    status: 'no-session',
    session: null,
    messages: [],
    error: null,
  });

  // Resolve effective sessionId: query param > sessionStorage active > null
  const queryParamSessionId = searchParams?.get('sessionId') ?? null;
  const effectiveSessionId = useMemo(() => {
    if (queryParamSessionId) return queryParamSessionId;
    return typeof window !== 'undefined' ? readActiveSessionId() : null;
  }, [queryParamSessionId]);

  useEffect(() => {
    let cancelled = false;

    if (!effectiveSessionId) {
      dispatch({ type: 'SET_NO_SESSION' });
      return;
    }

    dispatch({ type: 'SET_HYDRATING' });

    apiFetch(`/api/sessions/${effectiveSessionId}`)
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          // Session not found / forbidden — clear only if pakai localStorage source
          if (!queryParamSessionId) {
            sessionStorage.removeItem(ACTIVE_SESSION_KEY);
          }
          dispatch({ type: 'SET_NO_SESSION' });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          // Update localStorage active untuk auto-resume
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(ACTIVE_SESSION_KEY, data.session.sessionId);
          }
          dispatch({ type: 'SET_READY', session: data.session, messages: data.messages });
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (!queryParamSessionId) {
          sessionStorage.removeItem(ACTIVE_SESSION_KEY);
        }
        dispatch({ type: 'SET_NO_SESSION' });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSessionId]);

  const createSession = useCallback(
    async () => {
      const res = await apiFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error('Gagal membuat sesi');
      }

      const data = await res.json();
      sessionStorage.setItem(ACTIVE_SESSION_KEY, data.sessionId);
      dispatch({
        type: 'SET_READY',
        session: {
          sessionId: data.sessionId,
          currentMode: data.currentMode,
          startedAt: data.startedAt,
          ownerType: data.ownerType,
          ownerId: data.ownerId,
          updatedAt: data.updatedAt,
        },
        messages: [],
      });
      return data.sessionId as string;
    },
    [],
  );

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    dispatch({ type: 'SET_NO_SESSION' });
  }, []);

  return {
    ...state,
    dispatch,
    createSession,
    clearSession,
  };
}
