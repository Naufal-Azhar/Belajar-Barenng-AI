'use client';

import { useState, useCallback, useRef } from 'react';
import { parseSseEvents } from '@/lib/sse';
import { apiFetch } from '@/lib/api-fetch';
import type {
  LearningMode,
  Message,
  QuizPayload,
  LatihanPayload,
  ExplainerPayload,
  SocraticPayload,
  UserMessageIntent,
} from '@/lib/types';

type Dispatch = (action: any) => void;

export interface SendMessageArgs {
  message: string;
  mode?: LearningMode;
  /**
   * Penanda asal pesan: 'manual' (default) buat ketikan user, atau salah satu
   * intent auto-trigger (ask-deeper, confused, dst.) buat pesan dari klik
   * tombol UI. Cuma metadata client-side, nggak dikirim ke /api/chat.
   */
  intent?: UserMessageIntent;
  /**
   * Label pendek buat ditampilkan di ActionChip (mis. "Lebih dalam: Inti").
   * Cuma relevan kalau `intent` bukan 'manual'.
   */
  actionLabel?: string;
}

export function useChatStream(sessionId: string | undefined, dispatch: Dispatch) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastMessageRef = useRef<SendMessageArgs | null>(null);

  const sendMessage = useCallback(
    async (args: SendMessageArgs) => {
      if (!sessionId) return;

      lastMessageRef.current = args;
      setIsStreaming(true);
      setLastError(null);

      const intent: UserMessageIntent = args.intent ?? 'manual';

      // Optimistic: add user message
      dispatch({
        type: 'APPEND_USER_MESSAGE',
        message: {
          messageId: `temp-${Date.now()}`,
          sessionId,
          role: 'user',
          mode: args.mode || 'explainer',
          content: args.message,
          createdAt: new Date().toISOString(),
          intent,
          ...(args.actionLabel ? { actionLabel: args.actionLabel } : {}),
        } as Message,
      });

      if (args.mode) {
        dispatch({ type: 'SET_MODE', mode: args.mode });
      }

      try {
        const res = await apiFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: args.message,
            mode: args.mode,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setLastError(data.error || 'Terjadi kesalahan');
          setIsStreaming(false);
          return;
        }

        if (!res.body) {
          setLastError('Tidak ada respons dari server');
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSseEvents(buffer);
          buffer = remainder;

          for (const evt of events) {
            switch (evt.type) {
              case 'token':
                dispatch({ type: 'APPEND_AI_TOKEN', token: evt.data as string });
                break;
              case 'text-chunk':
                dispatch({ type: 'APPEND_AI_TOKEN', token: (evt.data as { text: string }).text });
                break;
              case 'payload':
                dispatch({
                  type: 'APPEND_AI_PAYLOAD',
                  message: {
                    messageId: '',
                    sessionId,
                    role: 'ai',
                    mode: args.mode || 'explainer',
                    content: JSON.stringify(evt.data),
                    payload: evt.data as
                      | ExplainerPayload
                      | SocraticPayload
                      | QuizPayload
                      | LatihanPayload,
                    createdAt: new Date().toISOString(),
                  } as Message,
                });
                break;
              case 'done':
                dispatch({
                  type: 'FINALIZE_AI_MESSAGE',
                  messageId: (evt.data as { messageId: string }).messageId,
                });
                break;
              case 'error':
                setLastError((evt.data as { message: string }).message);
                break;
            }
          }
        }
      } catch {
        setLastError('Koneksi terputus, coba lagi');
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, dispatch]
  );

  const retry = useCallback(() => {
    if (lastMessageRef.current) {
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  return { sendMessage, isStreaming, lastError, retry, setLastError };
}
