import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api-fetch';
import { addRecentAccount } from '@/hooks/useAuth';

describe('apiFetch (Task 9)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('menyertakan credentials include + header X-Device-Id', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await apiFetch('/api/sessions');
    const [, init] = spy.mock.calls[0];
    expect(init?.credentials).toBe('include');
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Device-Id')).toBeTruthy();
    spy.mockRestore();
  });

  it('tidak menimpa X-Device-Id yang sudah diset', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await apiFetch('/x', { headers: { 'X-Device-Id': 'custom' } });
    const [, init] = spy.mock.calls[0];
    expect(new Headers(init?.headers).get('X-Device-Id')).toBe('custom');
    spy.mockRestore();
  });
});

describe('addRecentAccount (Task 9)', () => {
  it('prepend + dedup by username', () => {
    let list = addRecentAccount([], { username: 'a', displayName: 'A' });
    list = addRecentAccount(list, { username: 'b', displayName: 'B' });
    list = addRecentAccount(list, { username: 'a', displayName: 'A2' });
    expect(list.map((x) => x.username)).toEqual(['a', 'b']);
    expect(list[0].displayName).toBe('A2');
  });

  it('cap di 5 akun', () => {
    let list: { username: string; displayName: string }[] = [];
    for (let i = 0; i < 8; i++) list = addRecentAccount(list, { username: `u${i}`, displayName: `U${i}` });
    expect(list).toHaveLength(5);
    expect(list[0].username).toBe('u7');
  });
});
