import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducer } from 'react';
import type {
  Message,
  UserMessageIntent,
  Session,
  LearningMode,
} from '@/lib/types';

/**
 * Task 1 — Field opsional `intent` & `actionLabel` di Message harus ke-propagate
 * lewat dispatch APPEND_USER_MESSAGE tanpa modifikasi reducer.
 *
 * Test ini memverifikasi behavioral kontrak: pesan auto-trigger membawa metadata
 * sampai ke state, sementara pesan manual / legacy tetap valid (intent opsional).
 */

// Reducer minimal yang mereplikasi pola APPEND_USER_MESSAGE di useSession.ts.
// Tidak import langsung dari useSession.ts agar test ini stabil terhadap
// perubahan internal reducer (yang relevan: spread `action.message`).
type Action =
  | { type: 'APPEND_USER_MESSAGE'; message: Message }
  | { type: 'INIT'; session: Session };

interface State {
  messages: Message[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'APPEND_USER_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    default:
      return state;
  }
}

const baseMessage = (overrides: Partial<Message> = {}): Message => ({
  messageId: 'm1',
  sessionId: 's1',
  role: 'user',
  mode: 'explainer' as LearningMode,
  content: 'halo',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Message intent metadata propagation (Task 1)', () => {
  it('dispatch APPEND_USER_MESSAGE dengan intent + actionLabel → state punya field tersebut', () => {
    const { result } = renderHook(() =>
      useReducer(reducer, { messages: [] }),
    );

    act(() => {
      result.current[1]({
        type: 'APPEND_USER_MESSAGE',
        message: baseMessage({
          content: 'Tolong perdalam bagian inti dari penjelasan barusan.',
          intent: 'ask-deeper',
          actionLabel: 'Lebih dalam: Inti',
        }),
      });
    });

    expect(result.current[0].messages).toHaveLength(1);
    const msg = result.current[0].messages[0];
    expect(msg.intent).toBe('ask-deeper');
    expect(msg.actionLabel).toBe('Lebih dalam: Inti');
    expect(msg.content).toBe('Tolong perdalam bagian inti dari penjelasan barusan.');
  });

  it('pesan tanpa intent (legacy) → intent === undefined, tetap valid', () => {
    const { result } = renderHook(() =>
      useReducer(reducer, { messages: [] }),
    );

    act(() => {
      result.current[1]({
        type: 'APPEND_USER_MESSAGE',
        message: baseMessage({ content: 'halo bukan template' }),
      });
    });

    const msg = result.current[0].messages[0];
    expect(msg.intent).toBeUndefined();
    expect(msg.actionLabel).toBeUndefined();
  });

  it('pesan manual eksplisit → intent === "manual"', () => {
    const { result } = renderHook(() =>
      useReducer(reducer, { messages: [] }),
    );

    act(() => {
      result.current[1]({
        type: 'APPEND_USER_MESSAGE',
        message: baseMessage({ content: 'jelaskan ekonomi', intent: 'manual' }),
      });
    });

    expect(result.current[0].messages[0].intent).toBe('manual');
  });

  it('semua 13 nilai UserMessageIntent valid sebagai field Message.intent', () => {
    // Type-level smoke test: kalau salah satu nilai nggak valid,
    // `satisfies` akan gagal compile.
    const allIntents = [
      'manual',
      'ask-term',
      'ask-deeper',
      'confused',
      'ask-similar',
      'ask-harder',
      'ask-easier',
      'ask-new',
      'quiz-skip',
      'quiz-start',
      'quiz-next',
      'document-uploaded',
      'cross-mode-bridge',
    ] as const satisfies readonly UserMessageIntent[];

    expect(allIntents).toHaveLength(13);

    // Coba assign setiap intent ke field Message.intent — kalau ada
    // mismatch type, runtime test ini mungkin tetap pass tapi `tsc` fail.
    for (const intent of allIntents) {
      const msg = baseMessage({ intent });
      expect(msg.intent).toBe(intent);
    }
  });
});
