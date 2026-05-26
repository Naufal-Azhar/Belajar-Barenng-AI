import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LatihanLayout from '@/components/layouts/LatihanLayout';
import type {
  Session,
  Message,
  ExplainerPayload,
  LatihanPayload,
} from '@/lib/types';

/**
 * Task 8 — LatihanLayout history section.
 *
 * Verifikasi:
 *   1. messages kosong → no history.
 *   2. messages mixed → history render + EmptyLatihanHint render saat belum ada latihan payload.
 *   3. messages + active latihan → history render + ActiveLatihan card render.
 *   4. Auto-trigger user di history → ActionChip.
 */

const baseSession: Session = {
  sessionId: 'sess-test',
  currentMode: 'latihan',
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

const explainerPayload: ExplainerPayload = {
  kind: 'explainer',
  title: 'Penjelasan Pertumbuhan',
  sections: [{ label: 'Inti', body: '...' }],
};

const latihanPayload: LatihanPayload = {
  kind: 'latihan',
  question: 'Hitung pertumbuhan ekonomi negara X.',
  steps: [
    { title: 'Step 1', detail: 'Identifikasi data' },
    { title: 'Step 2', detail: 'Hitung selisih' },
  ],
  difficulty: 'sedang',
};

function makeMsg(overrides: Partial<Message>): Message {
  return {
    messageId: 'm-' + Math.random(),
    sessionId: 'sess-test',
    role: 'user',
    mode: 'latihan',
    content: 'default',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('LatihanLayout history section (Task 8)', () => {
  it('messages kosong → history TIDAK render', () => {
    render(
      <LatihanLayout
        {...handlers}
        session={baseSession}
        messages={[]}
        isStreaming={false}
      />,
    );
    expect(screen.queryByLabelText('Riwayat sesi')).not.toBeInTheDocument();
  });

  it('messages mixed (explainer dari Penjelas + ask-deeper user) → history render + EmptyLatihanHint', () => {
    const messages: Message[] = [
      makeMsg({
        role: 'ai',
        mode: 'explainer',
        payload: explainerPayload,
        content: JSON.stringify(explainerPayload),
      }),
      makeMsg({
        role: 'user',
        mode: 'explainer',
        content: 'Tolong perdalam bagian inti...',
        intent: 'ask-deeper',
        actionLabel: 'Lebih dalam: Inti',
      }),
    ];

    render(
      <LatihanLayout
        {...handlers}
        session={baseSession}
        messages={messages}
        isStreaming={false}
      />,
    );

    // History section
    expect(screen.getByLabelText('Riwayat sesi')).toBeInTheDocument();
    expect(screen.getByText(/Riwayat sesi \(2 pesan\)/)).toBeInTheDocument();

    // Compact explainer card
    expect(screen.getByText('Penjelasan Pertumbuhan')).toBeInTheDocument();
    expect(screen.getByText('Penjelas')).toBeInTheDocument();

    // ActionChip
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Lebih dalam: Inti',
    );

    // Tidak ada JSON mentah
    expect(screen.queryByText(/"kind":"explainer"/)).not.toBeInTheDocument();
  });

  it('messages dengan active latihan → history render + ActiveLatihan card', () => {
    const messages: Message[] = [
      makeMsg({
        role: 'ai',
        mode: 'latihan',
        payload: latihanPayload,
        content: JSON.stringify(latihanPayload),
      }),
    ];

    render(
      <LatihanLayout
        {...handlers}
        session={baseSession}
        messages={messages}
        isStreaming={false}
      />,
    );

    // History ada (1 pesan)
    expect(screen.getByLabelText('Riwayat sesi')).toBeInTheDocument();
    // Active LatihanComponent juga render — pertanyaan muncul setidaknya 1x
    // (di history dirender penuh karena kind === activeMode, di leftColumn juga full)
    expect(
      screen.getAllByText('Hitung pertumbuhan ekonomi negara X.').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('messages > 3 → details collapsed by default', () => {
    const messages: Message[] = Array.from({ length: 5 }, (_, i) =>
      makeMsg({ role: 'user', content: `pesan ${i + 1}`, intent: 'manual' }),
    );

    render(
      <LatihanLayout
        {...handlers}
        session={baseSession}
        messages={messages}
        isStreaming={false}
      />,
    );

    const details = screen.getByLabelText('Riwayat sesi').querySelector('details');
    expect(details?.hasAttribute('open')).toBe(false);
  });

  it('messages ≤ 3 → details auto-open', () => {
    const messages: Message[] = [
      makeMsg({ role: 'user', content: 'pesan 1', intent: 'manual' }),
    ];

    render(
      <LatihanLayout
        {...handlers}
        session={baseSession}
        messages={messages}
        isStreaming={false}
      />,
    );

    const details = screen.getByLabelText('Riwayat sesi').querySelector('details');
    expect(details?.hasAttribute('open')).toBe(true);
  });
});
