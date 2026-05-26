import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SokratikLayout from '@/components/layouts/SokratikLayout';
import type { Session, Message } from '@/lib/types';

/**
 * Task 3 — SokratikLayout sekarang harus render ActionChip untuk pesan user
 * auto-trigger (intent !== 'manual') dan tetap render MessageBubble untuk
 * pesan user manual (atau legacy tanpa intent).
 *
 * Catatan: ini smoke test untuk wiring SokratikLayout. Verifikasi bahwa
 * 13 callsite kirim metadata yang benar dilakukan via type system + manual
 * smoke test (Task 9).
 */

const baseSession: Session = {
  sessionId: 'sess-test',
  currentMode: 'socratic',
  startedAt: new Date().toISOString(),
  ownerType: 'device',
  ownerId: 'dev-1',
  updatedAt: new Date().toISOString(),
};

const noop = vi.fn();

const handlers = {
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

function makeMsg(overrides: Partial<Message>): Message {
  return {
    messageId: 'm-' + Math.random(),
    sessionId: 'sess-test',
    role: 'user',
    mode: 'socratic',
    content: 'default content',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('SokratikLayout wiring (Task 3)', () => {
  it('pesan user dengan intent="confused" → render ActionChip dengan label dari INTENT_META', () => {
    const messages: Message[] = [
      makeMsg({
        role: 'user',
        intent: 'confused',
        actionLabel: 'Saya bingung',
        content: 'Saya bingung, bisa pancing dengan pertanyaan yang lebih dasar?',
      }),
    ];

    render(
      <SokratikLayout {...handlers} session={baseSession} messages={messages} isStreaming={false} />,
    );

    // ActionChip tampil dengan icon 🤔 + label "Saya bingung"
    expect(screen.getByText('🤔')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Saya bingung',
    );

    // Konten template panjang tidak boleh muncul sebagai bubble user
    expect(
      screen.queryByText(/bisa pancing dengan pertanyaan/i),
    ).not.toBeInTheDocument();
  });

  it('pesan user dengan intent="ask-deeper" + actionLabel custom → render label custom', () => {
    const messages: Message[] = [
      makeMsg({
        role: 'user',
        intent: 'ask-deeper',
        actionLabel: 'Lebih dalam: Inti',
        content: 'Tolong perdalam bagian inti dari penjelasan barusan.',
      }),
    ];

    render(
      <SokratikLayout {...handlers} session={baseSession} messages={messages} isStreaming={false} />,
    );

    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('Lebih dalam: Inti')).toBeInTheDocument();
  });

  it('pesan user manual (intent="manual") → tetap render MessageBubble standar, BUKAN chip', () => {
    const messages: Message[] = [
      makeMsg({
        role: 'user',
        intent: 'manual',
        content: 'jelaskan ekonomi makro',
      }),
    ];

    render(
      <SokratikLayout {...handlers} session={baseSession} messages={messages} isStreaming={false} />,
    );

    expect(screen.getByText('jelaskan ekonomi makro')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('pesan user legacy (intent undefined) → tetap render MessageBubble (regression)', () => {
    const messages: Message[] = [
      makeMsg({ role: 'user', content: 'pesan lama tanpa intent' }),
    ];

    render(
      <SokratikLayout {...handlers} session={baseSession} messages={messages} isStreaming={false} />,
    );

    expect(screen.getByText('pesan lama tanpa intent')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
