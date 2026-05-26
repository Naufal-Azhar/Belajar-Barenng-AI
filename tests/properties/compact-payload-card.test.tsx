import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompactPayloadCard, { KIND_META } from '@/components/CompactPayloadCard';
import type {
  ExplainerPayload,
  SocraticPayload,
  QuizPayload,
  LatihanPayload,
} from '@/lib/types';

/**
 * Task 4 — CompactPayloadCard render preview ringkas dari payload AI.
 *
 * Verifikasi:
 *  1. Tiap kind (explainer/socratic/quiz/latihan) render badge + title + metadata.
 *  2. Hint footer "Pindah ke mode X untuk interaksi penuh" muncul.
 *  3. Edge case: quiz tanpa index/total → metadata tetap valid.
 *  4. KIND_META cover 4 kind dengan label + targetMode yang konsisten.
 */

describe('CompactPayloadCard (Task 4)', () => {
  it('explainer payload → badge 📘 Penjelas + title + metadata sections + key terms', () => {
    const payload: ExplainerPayload = {
      kind: 'explainer',
      title: 'Yuk, Ngobrolin Ekonomi!',
      sections: [
        { label: 'Inti', body: '...' },
        { label: 'Analogi', body: '...' },
        { label: 'Contoh', body: '...' },
        { label: 'TL;DR', body: '...' },
      ],
      keyTerms: ['Sumber Daya', 'Produksi', 'Distribusi', 'Konsumsi'],
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText('📘')).toBeInTheDocument();
    expect(screen.getByText('Penjelas')).toBeInTheDocument();
    expect(screen.getByText('Yuk, Ngobrolin Ekonomi!')).toBeInTheDocument();
    expect(screen.getByText(/4 sections · 4 istilah kunci/)).toBeInTheDocument();
    expect(screen.getByText(/Pindah ke mode Penjelas/)).toBeInTheDocument();
  });

  it('socratic payload → badge 🤔 Sokratik + question + depth + hints count', () => {
    const payload: SocraticPayload = {
      kind: 'socratic',
      question: 'Menurutmu apa yang membuat sumber daya jadi terbatas?',
      hints: ['hint 1', 'hint 2', 'hint 3'],
      depth: 2,
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText('🤔')).toBeInTheDocument();
    expect(screen.getByText('Sokratik')).toBeInTheDocument();
    expect(
      screen.getByText('Menurutmu apa yang membuat sumber daya jadi terbatas?'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Kedalaman 2 · 3 petunjuk/)).toBeInTheDocument();
  });

  it('quiz payload (mcq) dengan index/total → badge 📝 Kuis + tipe + progress', () => {
    const payload: QuizPayload = {
      kind: 'quiz',
      type: 'mcq',
      question: 'Apa itu inflasi?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'B',
      index: 2,
      total: 5,
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Kuis')).toBeInTheDocument();
    expect(screen.getByText('Apa itu inflasi?')).toBeInTheDocument();
    expect(screen.getByText(/Pilihan ganda · 2\/5/)).toBeInTheDocument();
  });

  it('quiz payload tanpa index/total → metadata tetap valid (cuma type)', () => {
    const payload: QuizPayload = {
      kind: 'quiz',
      type: 'essay',
      question: 'Jelaskan perbedaan inflasi dan deflasi.',
      correctAnswer: '...',
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText('Esai')).toBeInTheDocument();
    // Tidak boleh ada string progress kayak "0/0"
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });

  it('latihan payload → badge 🏋️ Latihan + question + difficulty + steps', () => {
    const payload: LatihanPayload = {
      kind: 'latihan',
      question: 'Hitung pertumbuhan ekonomi negara X.',
      steps: [
        { title: 'Step 1', detail: 'Identifikasi data' },
        { title: 'Step 2', detail: 'Hitung selisih' },
      ],
      difficulty: 'sedang',
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText('🏋️')).toBeInTheDocument();
    expect(screen.getByText('Latihan')).toBeInTheDocument();
    expect(screen.getByText('Hitung pertumbuhan ekonomi negara X.')).toBeInTheDocument();
    expect(screen.getByText(/Tingkat sedang · 2 langkah/)).toBeInTheDocument();
  });

  it('latihan payload tanpa difficulty → fallback "—"', () => {
    const payload: LatihanPayload = {
      kind: 'latihan',
      question: 'Soal tanpa difficulty.',
      steps: [{ title: 'Step', detail: '...' }],
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByText(/Tingkat — · 1 langkah/)).toBeInTheDocument();
  });

  it('aria-label deskriptif untuk a11y', () => {
    const payload: ExplainerPayload = {
      kind: 'explainer',
      title: 'Tes A11y',
      sections: [{ label: 'Inti', body: '.' }],
    };

    render(<CompactPayloadCard payload={payload} />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Pesan ringkas dari mode Penjelas: Tes A11y',
    );
  });

  it('KIND_META cover 4 payload kind', () => {
    const keys = Object.keys(KIND_META);
    expect(keys).toEqual(
      expect.arrayContaining(['explainer', 'socratic', 'quiz', 'latihan']),
    );
    expect(keys).toHaveLength(4);
  });
});
