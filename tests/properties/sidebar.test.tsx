import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';
import type { Session } from '@/lib/types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: 'sess-1',
    profileType: 'mahasiswa',
    currentMode: 'explainer',
    startedAt: new Date().toISOString(),
    ownerType: 'device',
    ownerId: 'dev',
    updatedAt: new Date().toISOString(),
    title: 'Belajar Biologi',
    ...overrides,
  };
}

describe('Sidebar', () => {
  const noop = () => {};

  it('render daftar sesi dengan title', () => {
    const sessions = [makeSession({ sessionId: 's1', title: 'Topik A' }), makeSession({ sessionId: 's2', title: 'Topik B' })];
    render(
      <Sidebar
        sessions={sessions}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText('Topik A')).toBeInTheDocument();
    expect(screen.getByText('Topik B')).toBeInTheDocument();
  });

  it('tampilkan empty state kalau tidak ada sesi', () => {
    render(
      <Sidebar
        sessions={[]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByText(/Belum ada sesi/i)).toBeInTheDocument();
  });

  it('klik item memanggil onSelect dengan sessionId', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        sessions={[makeSession({ sessionId: 'click-me', title: 'Klik Saya' })]}
        activeSessionId={null}
        onSelect={onSelect}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByText('Klik Saya'));
    expect(onSelect).toHaveBeenCalledWith('click-me');
  });

  it('klik tombol "Sesi Baru" memanggil onNew', () => {
    const onNew = vi.fn();
    render(
      <Sidebar
        sessions={[]}
        activeSessionId={null}
        onSelect={noop}
        onNew={onNew}
        onRename={noop}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByLabelText('Sesi baru'));
    expect(onNew).toHaveBeenCalled();
  });

  it('double-click title memunculkan input rename', () => {
    render(
      <Sidebar
        sessions={[makeSession({ sessionId: 's1', title: 'Old Name' })]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
      />,
    );
    const item = screen.getByText('Old Name').closest('[role="button"]')!;
    fireEvent.doubleClick(item);
    const input = screen.getByDisplayValue('Old Name') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('Enter di input rename memanggil onRename dengan value baru', () => {
    const onRename = vi.fn();
    render(
      <Sidebar
        sessions={[makeSession({ sessionId: 's1', title: 'Old' })]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={onRename}
        onDelete={noop}
      />,
    );
    fireEvent.doubleClick(screen.getByText('Old').closest('[role="button"]')!);
    const input = screen.getByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('s1', 'New Title');
  });

  it('Escape di input rename batal tanpa memanggil onRename', () => {
    const onRename = vi.fn();
    render(
      <Sidebar
        sessions={[makeSession({ sessionId: 's1', title: 'Old' })]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={onRename}
        onDelete={noop}
      />,
    );
    fireEvent.doubleClick(screen.getByText('Old').closest('[role="button"]')!);
    const input = screen.getByDisplayValue('Old');
    fireEvent.change(input, { target: { value: 'Should Not Save' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
  });

  it('badge ✓ muncul untuk sesi yang sudah berakhir', () => {
    const ended = makeSession({ sessionId: 's-ended', title: 'Sudah Selesai', endedAt: new Date().toISOString() });
    render(
      <Sidebar
        sessions={[ended]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
      />,
    );
    expect(screen.getByLabelText('Sesi selesai')).toBeInTheDocument();
  });

  it('render loginSlot di footer', () => {
    render(
      <Sidebar
        sessions={[]}
        activeSessionId={null}
        onSelect={noop}
        onNew={noop}
        onRename={noop}
        onDelete={noop}
        loginSlot={<button>Login Now</button>}
      />,
    );
    expect(screen.getByText('Login Now')).toBeInTheDocument();
  });
});
