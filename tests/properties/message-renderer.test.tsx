import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageRenderer from '@/components/MessageRenderer';
import type { Message, ExplainerPayload, SocraticPayload } from '@/lib/types';

/**
 * Task 5 — MessageRenderer factory dengan 6 skenario decision tree.
 *
 * Skenario:
 *   1. user manual (no intent)               → MessageBubble
 *   2. user auto-trigger (intent='ask-deeper') → ActionChip
 *   3. ai text-only (no payload)             → MessageBubble
 *   4. ai active-mode payload                → komponen full interaktif (Socratic)
 *   5. ai cross-mode payload                 → CompactPayloadCard
 *   6. ai broken payload (no kind)           → fallback MessageBubble
 *
 * E2E manual scenario (replikasi screenshot bug user):
 *   - activeMode='socratic'
 *   - messages = [explainer payload AI, ask-deeper user message]
 *   - Expect: ada CompactPayloadCard + ActionChip, NO raw JSON visible.
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
  title: 'Yuk Belajar Ekonomi',
  sections: [
    { label: 'Inti', body: 'inti body' },
    { label: 'Analogi', body: 'analogi body' },
  ],
  keyTerms: ['Sumber Daya'],
};

const socraticPayload: SocraticPayload = {
  kind: 'socratic',
  question: 'Apa itu sumber daya?',
  hints: ['hint a', 'hint b', 'hint c'],
  depth: 1,
};

describe('MessageRenderer (Task 5)', () => {
  it('skenario 1: user manual → MessageBubble dengan content asli', () => {
    const msg = baseMsg({
      role: 'user',
      content: 'jelaskan ekonomi',
      intent: 'manual',
    });
    render(<MessageRenderer message={msg} activeMode="explainer" />);
    expect(screen.getByText('jelaskan ekonomi')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('skenario 1b: user legacy tanpa intent → MessageBubble', () => {
    const msg = baseMsg({ role: 'user', content: 'pesan lama' });
    render(<MessageRenderer message={msg} activeMode="explainer" />);
    expect(screen.getByText('pesan lama')).toBeInTheDocument();
  });

  it('skenario 2: user auto-trigger (ask-deeper) → ActionChip', () => {
    const msg = baseMsg({
      role: 'user',
      content: 'Tolong perdalam bagian inti...',
      intent: 'ask-deeper',
      actionLabel: 'Lebih dalam: Inti',
    });
    render(<MessageRenderer message={msg} activeMode="explainer" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Lebih dalam: Inti',
    );
    expect(screen.getByText('💡')).toBeInTheDocument();
  });

  it('skenario 3: ai text-only (no payload) → MessageBubble', () => {
    const msg = baseMsg({ role: 'ai', content: 'Halo, saya BelajarBareng AI' });
    render(<MessageRenderer message={msg} activeMode="explainer" />);
    expect(screen.getByText('Halo, saya BelajarBareng AI')).toBeInTheDocument();
  });

  it('skenario 4: ai active-mode payload (socratic + activeMode=socratic) → komponen full', () => {
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(socraticPayload),
      payload: socraticPayload,
    });
    render(<MessageRenderer message={msg} activeMode="socratic" />);
    // Question dirender penuh
    expect(screen.getByText('Apa itu sumber daya?')).toBeInTheDocument();
    // Quick replies SocraticComponent muncul
    expect(screen.getByText('Aku rasa...')).toBeInTheDocument();
  });

  it('skenario 5: ai cross-mode payload (explainer + activeMode=socratic) → CompactPayloadCard', () => {
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(explainerPayload),
      payload: explainerPayload,
    });
    render(<MessageRenderer message={msg} activeMode="socratic" />);

    // Compact card render: badge + title + hint
    expect(screen.getByText('📘')).toBeInTheDocument();
    expect(screen.getByText('Penjelas')).toBeInTheDocument();
    expect(screen.getByText('Yuk Belajar Ekonomi')).toBeInTheDocument();
    expect(screen.getByText(/Pindah ke mode Penjelas/)).toBeInTheDocument();

    // PENTING: JSON mentah TIDAK boleh muncul (regresi bug user)
    expect(
      screen.queryByText(/"kind":"explainer"/),
    ).not.toBeInTheDocument();
  });

  it('skenario 6: ai broken payload (kind invalid) → graceful fallback MessageBubble', () => {
    const msg = baseMsg({
      role: 'ai',
      content: 'fallback content',
      // @ts-expect-error simulate corrupt data
      payload: { kind: 'unknown-kind', whatever: true },
    });
    render(<MessageRenderer message={msg} activeMode="explainer" />);
    expect(screen.getByText('fallback content')).toBeInTheDocument();
    // Tidak boleh ada compact card
    expect(screen.queryByText('Penjelas')).not.toBeInTheDocument();
  });

  it('E2E replikasi bug screenshot user: explainer payload + ask-deeper di mode Sokratik', () => {
    const explainerMsg = baseMsg({
      role: 'ai',
      content: JSON.stringify(explainerPayload),
      payload: explainerPayload,
    });
    const askDeeperMsg = baseMsg({
      role: 'user',
      content: 'Tolong perdalam bagian inti dari penjelasan barusan.',
      intent: 'ask-deeper',
      actionLabel: 'Lebih dalam: Inti',
    });

    render(
      <>
        <MessageRenderer message={explainerMsg} activeMode="socratic" />
        <MessageRenderer message={askDeeperMsg} activeMode="socratic" />
      </>,
    );

    // Compact explainer card
    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Pesan ringkas dari mode Penjelas: Yuk Belajar Ekonomi',
    );
    // Action chip
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Lebih dalam: Inti',
    );
    // BUG ASLI HILANG: tidak ada JSON mentah
    expect(screen.queryByText(/"kind":"explainer"/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/sections.*body/),
    ).not.toBeInTheDocument();
  });

  it('skenario 4b: handlers undefined → tetap render tanpa crash', () => {
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(socraticPayload),
      payload: socraticPayload,
    });
    // Render tanpa handlers prop
    render(<MessageRenderer message={msg} activeMode="socratic" />);
    expect(screen.getByText('Apa itu sumber daya?')).toBeInTheDocument();
  });

  it('skenario 4c: handlers di-passing dengan benar (onSubmitThought)', () => {
    const onSubmitThought = vi.fn();
    const msg = baseMsg({
      role: 'ai',
      content: JSON.stringify(socraticPayload),
      payload: socraticPayload,
    });
    render(
      <MessageRenderer
        message={msg}
        activeMode="socratic"
        handlers={{ onSubmitThought }}
      />,
    );
    // Verifikasi component diterima (smoke test) — interaksi user tested di SocraticComponent test sendiri.
    expect(screen.getByText('Apa itu sumber daya?')).toBeInTheDocument();
  });
});
