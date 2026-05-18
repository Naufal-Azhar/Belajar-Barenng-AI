// Property 17: Layout_Router routes valid modes correctly + falls back for invalid.
// Validates: Requirements 15.1, 15.2, 15.3, 15.5
// Tag: Feature: belajar-bareng-ai, Property 17: LayoutRouter routes valid modes + falls back

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';

// Mock all 4 layouts as simple stubs that expose their identity via data-testid.
vi.mock('@/components/layouts/PenjelasLayout', () => ({
  default: () => <div data-testid="layout-explainer" />,
}));
vi.mock('@/components/layouts/SokratikLayout', () => ({
  default: () => <div data-testid="layout-socratic" />,
}));
vi.mock('@/components/layouts/KuisLayout', () => ({
  default: () => <div data-testid="layout-quiz" />,
}));
vi.mock('@/components/layouts/LatihanLayout', () => ({
  default: () => <div data-testid="layout-latihan" />,
}));

import LayoutRouter from '@/components/layouts/LayoutRouter';
import type { Session } from '@/lib/types';

const fakeSession: Session = {
  sessionId: 'test-session',
  profileType: 'mahasiswa',
  currentMode: 'explainer',
  startedAt: new Date().toISOString(),
};

const noop = () => {};

const baseProps = {
  session: fakeSession,
  messages: [],
  isStreaming: false,
  onSend: noop,
  onQuizAnswer: noop,
  onLatihanAttempt: noop,
  onAskTerm: noop,
  onAskDeeper: noop,
  onSocraticThought: noop,
  onSocraticConfused: noop,
  onAskSimilar: noop,
  onAskHarder: noop,
  onQuizSkip: noop,
  onQuizStop: noop,
  onLatihanEasier: noop,
  onLatihanHarder: noop,
  onLatihanNew: noop,
};

const VALID_MODES = ['explainer', 'socratic', 'quiz', 'latihan'] as const;
const VALID_TO_TESTID: Record<string, string> = {
  explainer: 'layout-explainer',
  socratic: 'layout-socratic',
  quiz: 'layout-quiz',
  latihan: 'layout-latihan',
};

describe('Property 17: LayoutRouter routing correctness + fallback', () => {
  it('valid mode → mounts exactly that layout', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_MODES), (mode) => {
        const { container, queryByTestId } = render(
          <LayoutRouter currentMode={mode} {...baseProps} />,
        );
        const expectedTestId = VALID_TO_TESTID[mode];
        expect(queryByTestId(expectedTestId)).not.toBeNull();
        // None of the other 3 layouts should be present
        const others = Object.values(VALID_TO_TESTID).filter((tid) => tid !== expectedTestId);
        for (const tid of others) {
          expect(container.querySelector(`[data-testid="${tid}"]`)).toBeNull();
        }
        cleanup();
      }),
      { numRuns: 20 },
    );
  });

  it('invalid mode → falls back to explainer (Penjelas)', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => !VALID_MODES.includes(s as typeof VALID_MODES[number])),
        (badMode) => {
          const { queryByTestId } = render(
            <LayoutRouter currentMode={badMode} {...baseProps} />,
          );
          expect(queryByTestId('layout-explainer')).not.toBeNull();
          cleanup();
        },
      ),
      { numRuns: 30 },
    );
  });
});
