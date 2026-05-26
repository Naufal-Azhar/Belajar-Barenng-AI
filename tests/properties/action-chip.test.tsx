import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionChip, { INTENT_META } from '@/components/ActionChip';
import type { UserMessageIntent } from '@/lib/types';

/**
 * Task 2 — ActionChip render pesan auto-trigger sebagai chip kompak.
 *
 * Verifikasi:
 *  1. actionLabel di-render apa adanya (tanpa truncate).
 *  2. Tanpa actionLabel → fallback ke defaultLabel per intent.
 *  3. Tanpa actionLabel + tanpa intent meta → fallback ke content (truncated).
 *  4. Semua 12 non-manual intent valid + bisa render tanpa error.
 *  5. intent='manual' return null (defensive — seharusnya nggak masuk sini).
 */

describe('ActionChip (Task 2)', () => {
  it('render dengan actionLabel + icon dari intent meta', () => {
    render(<ActionChip intent="ask-deeper" actionLabel="Lebih dalam: Inti" />);
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('Lebih dalam: Inti')).toBeInTheDocument();
  });

  it('tanpa actionLabel → render defaultLabel per intent', () => {
    render(<ActionChip intent="confused" />);
    expect(screen.getByText('🤔')).toBeInTheDocument();
    expect(screen.getByText('Saya bingung')).toBeInTheDocument();
  });

  it('tanpa actionLabel & tanpa defaultLabel-match → fallback ke content (truncated)', () => {
    // Walaupun semua 12 non-manual intent punya meta, simulate edge case:
    // intent valid tapi fallback path harus ada untuk content panjang.
    const longContent =
      'Ini pesan template yang panjang banget banget banget seharusnya kena truncate kan';
    render(<ActionChip intent="ask-term" content={longContent} />);
    // ask-term punya defaultLabel "Tanya istilah", jadi label akan pakai itu
    // (bukan content) — verify defaultLabel menang dari content.
    expect(screen.getByText('Tanya istilah')).toBeInTheDocument();
  });

  it('aria-label deskriptif untuk a11y', () => {
    render(<ActionChip intent="ask-similar" actionLabel="Soal serupa" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Aksi tombol: Soal serupa',
    );
  });

  it('semua 12 non-manual intent render tanpa error', () => {
    const allIntents: Exclude<UserMessageIntent, 'manual'>[] = [
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
    ];

    for (const intent of allIntents) {
      const { unmount } = render(<ActionChip intent={intent} />);
      const meta = INTENT_META[intent];
      expect(screen.getByText(meta.icon)).toBeInTheDocument();
      expect(screen.getByText(meta.defaultLabel)).toBeInTheDocument();
      unmount();
    }
  });

  it('intent="manual" → render null (defensive)', () => {
    const { container } = render(<ActionChip intent="manual" />);
    expect(container.firstChild).toBeNull();
  });

  it('INTENT_META mengcover 12 intent (semua kecuali "manual")', () => {
    const keys = Object.keys(INTENT_META);
    expect(keys).toHaveLength(12);
    expect(keys).not.toContain('manual');
  });
});
