import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatStream from '@/components/ChatStream';
import type { Message, ExplainerPayload, SocraticPayload } from '@/lib/types';

/**
 * Task 6 — Regression test: ChatStream setelah refactor ke MessageRenderer.
 *
 * Verifikasi:
 *   1. Empty state (Mau belajar apa?) tetap render saat messages kosong.
 *   2. Single-mode Penjelas: explainer payload → ExplainerComponent full.
 *   3. Cross-mode di Penjelas: socratic payload → CompactPayloadCard.
 *   4. Auto-trigger user → ActionChip.
 *   5. Streaming indicator (LoadingCat) muncul saat isStreaming=true.
 */

const baseMsg = (overrides: Partial<Message>): Message => ({
  messageId: 'm-' + Math.random(),
  sessionId: 'sess',
  role: 'user',
  mode: 'explainer',
  content: 'default',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const explainerPayload: ExplainerPayload = {
  kind: 'explainer',
  title: 'Penjelasan Ekonomi',
  sections: [{ label: 'Inti', body: 'inti detail' }],
  keyTerms: ['Sumber Daya'],
};

const socraticPayload: SocraticPayload = {
  kind: 'socratic',
  question: 'Kenapa sumber daya terbatas?',
  hints: ['h1', 'h2'],
  depth: 1,
};

const noop = vi.fn();

describe('ChatStream regression (Task 6)', () => {
  it('empty messages → empty state "Mau belajar apa?"', () => {
    render(
      <ChatStream
        messages={[]}
        isStreaming={false}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByText('Mau belajar apa?')).toBeInTheDocument();
  });

  it('explainer payload (single-mode Penjelas) → full ExplainerComponent dengan title', () => {
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(explainerPayload),
      payload: explainerPayload,
    });
    render(
      <ChatStream
        messages={[msg]}
        isStreaming={false}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByText('Penjelasan Ekonomi')).toBeInTheDocument();
    // Section "Inti" muncul (full komponen render)
    expect(screen.getByText('Inti')).toBeInTheDocument();
  });

  it('cross-mode payload (socratic dari mode lain di Penjelas) → CompactPayloadCard', () => {
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(socraticPayload),
      payload: socraticPayload,
    });
    render(
      <ChatStream
        messages={[msg]}
        isStreaming={false}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByText('Sokratik')).toBeInTheDocument();
    expect(screen.getByText(/Pindah ke mode Sokratik/)).toBeInTheDocument();
    // BUKAN socratic full card (textarea quick replies tidak boleh ada)
    expect(screen.queryByText('Aku rasa...')).not.toBeInTheDocument();
  });

  it('auto-trigger user → ActionChip', () => {
    const msg = baseMsg({
      role: 'user',
      content: 'Tolong perdalam bagian inti...',
      intent: 'ask-deeper',
      actionLabel: 'Lebih dalam: Inti',
    });
    render(
      <ChatStream
        messages={[msg]}
        isStreaming={false}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Lebih dalam: Inti',
    );
  });

  it('user manual ketikan → MessageBubble (regression)', () => {
    const msg = baseMsg({ role: 'user', content: 'jelaskan ekonomi' });
    render(
      <ChatStream
        messages={[msg]}
        isStreaming={false}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByText('jelaskan ekonomi')).toBeInTheDocument();
  });

  it('isStreaming=true → loading indicator muncul', () => {
    render(
      <ChatStream
        messages={[]}
        isStreaming={true}
        onQuizAnswer={noop}
        onLatihanAttempt={noop}
      />,
    );
    expect(screen.getByText(/Lagi mikir/i)).toBeInTheDocument();
  });
});
