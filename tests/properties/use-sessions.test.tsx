import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessions } from '@/hooks/useSessions';

describe('useSessions hook', () => {
  beforeEach(() => {
    // mock localStorage untuk getDeviceId
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });
    // mock crypto.randomUUID untuk getDeviceId
    if (!globalThis.crypto) {
      vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-123' });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initial fetch returns sessions list', async () => {
    const fakeSessions = [
      { sessionId: 's1', title: 'A', updatedAt: '2026-01-01' },
      { sessionId: 's2', title: 'B', updatedAt: '2026-01-02' },
    ];
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ sessions: fakeSessions }),
    })));

    const { result } = renderHook(() => useSessions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch failure with error state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    })));

    const { result } = renderHook(() => useSessions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.sessions).toEqual([]);
  });

  it('createSession optimistically prepends new session', async () => {
    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, opts?: RequestInit) => {
      fetchCount++;
      // Initial GET
      if (!opts || opts.method === undefined || opts.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sessions: [] }),
        };
      }
      // POST create
      if (opts.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            sessionId: 'new-session-id',
            currentMode: 'explainer',
            ownerType: 'device',
            ownerId: 'test-uuid-123',
            startedAt: '2026-05-23T10:00:00Z',
            updatedAt: '2026-05-23T10:00:00Z',
          }),
        };
      }
      throw new Error('unexpected fetch');
    }));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(0);

    let created;
    await act(async () => {
      created = await result.current.createSession();
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].sessionId).toBe('new-session-id');
    expect(created).toMatchObject({ sessionId: 'new-session-id' });
  });

  it('deleteSession optimistically removes + reverts on error', async () => {
    const initialSessions = [
      { sessionId: 's1', title: 'Mau dihapus' },
      { sessionId: 's2', title: 'Aman' },
    ];

    vi.stubGlobal('fetch', vi.fn(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'DELETE') {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ sessions: initialSessions }),
      };
    }));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.sessions).toHaveLength(2));

    await expect(
      act(async () => {
        await result.current.deleteSession('s1');
      }),
    ).rejects.toThrow();

    // Reverted: s1 kembali muncul
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.sessions.find((s) => s.sessionId === 's1')).toBeDefined();
  });

  it('renameSession optimistically updates title', async () => {
    const initialSessions = [{ sessionId: 's1', title: 'Old' }];

    vi.stubGlobal('fetch', vi.fn(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ sessions: initialSessions }),
      };
    }));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    await act(async () => {
      await result.current.renameSession('s1', 'New Title');
    });

    expect(result.current.sessions[0].title).toBe('New Title');
  });
});
