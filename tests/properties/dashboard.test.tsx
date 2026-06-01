import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '@/components/Dashboard';
import type { Session } from '@/lib/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function makeSession(over: Partial<Session> = {}): Session {
  return {
    sessionId: 's1',
    currentMode: 'socratic',
    startedAt: '2026-05-30T09:00:00.000Z',
    updatedAt: '2026-05-30T09:00:00.000Z',
    ownerType: 'device',
    ownerId: 'dev',
    title: 'Belajar ekonomi',
    ...over,
  };
}

/**
 * Task 4 — Dashboard redesign (Warm Focus + aksen pixel).
 * Verifikasi fungsi tetap utuh: kartu sesi + label mode render, klik navigasi,
 * tombol Mulai Sesi Baru memicu callback, dan empty-state muncul tanpa sesi.
 */
describe('Dashboard (Task 4)', () => {
  it('render kartu sesi + label mode, klik memicu navigasi', () => {
    render(<Dashboard sessions={[makeSession()]} onNewSession={vi.fn()} />);
    expect(screen.getByText('Belajar ekonomi')).toBeInTheDocument();
    expect(screen.getByText('Sokratik')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Belajar ekonomi'));
    expect(push).toHaveBeenCalledWith('/chat?sessionId=s1');
  });

  it('tombol Mulai Sesi Baru memicu onNewSession', () => {
    const onNewSession = vi.fn();
    render(<Dashboard sessions={[makeSession()]} onNewSession={onNewSession} />);
    fireEvent.click(screen.getByRole('button', { name: /Mulai sesi belajar baru/i }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it('tanpa sesi → tampilkan empty state', () => {
    render(<Dashboard sessions={[]} onNewSession={vi.fn()} />);
    expect(screen.getByText('Belum ada sesi belajar')).toBeInTheDocument();
  });

  it('tidak menampilkan tombol login (Masuk / Daftar)', () => {
    render(<Dashboard sessions={[makeSession()]} onNewSession={vi.fn()} />);
    expect(screen.queryByText(/Masuk \/ Daftar/i)).toBeNull();
  });
});
