// Property 20: Quiz state machine transitions match the valid table.
// Validates: Requirements 17.1–17.10
// Tag: Feature: belajar-bareng-ai, Property 20: Quiz state machine transitions valid

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  reduceQuiz,
  TRANSITIONS,
  ALL_QUIZ_STATES,
  type QuizEvent,
  type QuizEventKind,
} from '@/lib/quiz-state-machine';
import { FC_DEFAULTS } from '../helpers/fast-check-config';
import type { QuizState } from '@/lib/types';

const ALL_EVENT_KINDS: QuizEventKind[] = [
  'UPLOAD_STARTED',
  'COMPILE_DONE',
  'CONFIGURE_OPENED',
  'CONFIRM_CONFIG',
  'BATCH_DONE',
  'STOP',
];

const stateArb = fc.constantFrom<QuizState>(...ALL_QUIZ_STATES);

const eventArb = fc.constantFrom<QuizEventKind>(...ALL_EVENT_KINDS).map((kind): QuizEvent => {
  if (kind === 'CONFIRM_CONFIG') {
    return {
      kind,
      config: { type: 'mcq', count: 5, answeredCount: 0 },
    };
  }
  return { kind } as QuizEvent;
});

describe('Property 20: Quiz state machine transitions match valid table', () => {
  it('table-valid (state, event) → returns mapped state', () => {
    fc.assert(
      fc.property(stateArb, eventArb, (state, event) => {
        const expected = TRANSITIONS[state][event.kind];
        const actual = reduceQuiz(state, event);
        if (expected !== undefined) {
          expect(actual).toBe(expected);
        } else {
          // No-op for invalid (state, event) — Req 17.9
          expect(actual).toBe(state);
        }
      }),
      FC_DEFAULTS,
    );
  });

  it('cannot reach `running` from `idle` without passing through every intermediate', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { minLength: 1, maxLength: 3 }), (events) => {
        let state: QuizState = 'idle';
        for (const e of events) state = reduceQuiz(state, e);
        // Maksimum 3 event dari idle hanya bisa mencapai paling jauh `configuring`.
        expect(state).not.toBe('running');
        expect(state).not.toBe('completed');
      }),
      FC_DEFAULTS,
    );
  });

  it('terminal `completed` is absorbing — any event keeps it `completed`', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        expect(reduceQuiz('completed', event)).toBe('completed');
      }),
      FC_DEFAULTS,
    );
  });

  it('STOP from running → completed', () => {
    expect(reduceQuiz('running', { kind: 'STOP' })).toBe('completed');
    expect(reduceQuiz('running', { kind: 'BATCH_DONE' })).toBe('completed');
  });

  it('happy path idle → uploading → compiled → configuring → running → completed', () => {
    let s: QuizState = 'idle';
    s = reduceQuiz(s, { kind: 'UPLOAD_STARTED' });
    expect(s).toBe('uploading');
    s = reduceQuiz(s, { kind: 'COMPILE_DONE' });
    expect(s).toBe('compiled');
    s = reduceQuiz(s, { kind: 'CONFIGURE_OPENED' });
    expect(s).toBe('configuring');
    s = reduceQuiz(s, { kind: 'CONFIRM_CONFIG', config: { type: 'mcq', count: 5, answeredCount: 0 } });
    expect(s).toBe('running');
    s = reduceQuiz(s, { kind: 'BATCH_DONE' });
    expect(s).toBe('completed');
  });
});
