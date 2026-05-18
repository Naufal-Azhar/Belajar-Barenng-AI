// Quiz Wizard pure state machine (Req 17)
// Lihat design.md → "Per-Mode Layout Specifications → KuisLayout"
// Tidak menyentuh I/O — hanya tabel transisi.

import type { QuizState, QuizConfig } from './types';

export type QuizEventKind =
  | 'UPLOAD_STARTED'
  | 'COMPILE_DONE'
  | 'CONFIGURE_OPENED'
  | 'CONFIRM_CONFIG'
  | 'BATCH_DONE'
  | 'STOP';

export type QuizEvent =
  | { kind: 'UPLOAD_STARTED' }
  | { kind: 'COMPILE_DONE' }
  | { kind: 'CONFIGURE_OPENED' }
  | { kind: 'CONFIRM_CONFIG'; config: QuizConfig }
  | { kind: 'BATCH_DONE' }
  | { kind: 'STOP' };

/**
 * Tabel transisi tertutup. Kombinasi (state, event.kind) yang tidak ada
 * di tabel ini = no-op (Req 17.9).
 */
export const TRANSITIONS: Record<
  QuizState,
  Partial<Record<QuizEventKind, QuizState>>
> = {
  idle: { UPLOAD_STARTED: 'uploading' },
  uploading: { COMPILE_DONE: 'compiled' },
  compiled: { CONFIGURE_OPENED: 'configuring' },
  configuring: { CONFIRM_CONFIG: 'running' },
  running: { BATCH_DONE: 'completed', STOP: 'completed' },
  completed: {},
};

/**
 * Pure reducer. Kombinasi (state, event) yang tidak ada di TRANSITIONS
 * mengembalikan state apa adanya (no-op). Property 20 memvalidasi ini.
 */
export function reduceQuiz(state: QuizState, event: QuizEvent): QuizState {
  const next = TRANSITIONS[state][event.kind];
  return next ?? state;
}

/** Daftar semua valid QuizState untuk iterator/tipe-guard di test. */
export const ALL_QUIZ_STATES: QuizState[] = [
  'idle',
  'uploading',
  'compiled',
  'configuring',
  'running',
  'completed',
];
