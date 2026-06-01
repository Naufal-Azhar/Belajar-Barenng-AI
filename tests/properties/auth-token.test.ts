import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signToken, verifyToken, AUTH_COOKIE } from '@/lib/auth-token';
import { resolveOwner } from '@/lib/auth-server';
import {
  InMemoryProfileRepository,
  setProfileRepository,
} from '@/lib/profile-repository';

vi.mock('next/server', () => ({ NextRequest: class extends Request {} }));

import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';

function req(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', { headers });
}
function postJson(url: string, body: any): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('auth-token (Task 8)', () => {
  it('signToken → verifyToken roundtrip', () => {
    const t = signToken('budi');
    expect(verifyToken(t)).toEqual({ ownerId: 'budi' });
  });
  it('token dipalsukan → null', () => {
    const t = signToken('budi');
    expect(verifyToken(t.slice(0, -2) + 'xx')).toBeNull();
    expect(verifyToken('garbage')).toBeNull();
    expect(verifyToken(null)).toBeNull();
  });
});

describe('resolveOwner (Task 8)', () => {
  it('cookie session valid → user', async () => {
    const token = signToken('andi');
    const owner = await resolveOwner(req({ cookie: `${AUTH_COOKIE}=${token}` }));
    expect(owner).toEqual({ ownerType: 'user', ownerId: 'andi' });
  });
  it('tanpa cookie tapi ada X-Device-Id → device', async () => {
    const owner = await resolveOwner(req({ 'x-device-id': 'dev-1' }));
    expect(owner).toEqual({ ownerType: 'device', ownerId: 'dev-1' });
  });
  it('cookie invalid + ada device → fallback device', async () => {
    const owner = await resolveOwner(
      req({ cookie: `${AUTH_COOKIE}=busuk.token`, 'x-device-id': 'dev-2' }),
    );
    expect(owner).toEqual({ ownerType: 'device', ownerId: 'dev-2' });
  });
  it('tanpa keduanya → throw', async () => {
    await expect(resolveOwner(req())).rejects.toThrow();
  });
});

describe('auth routes (Task 8)', () => {
  beforeEach(() => {
    setProfileRepository(new InMemoryProfileRepository({ persistOnDisk: false }));
  });

  it('register membuat profil + set cookie', async () => {
    const res = await register(
      postJson('http://localhost/api/auth/register', { username: 'rina', pin: '1234' }) as any,
    );
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toContain(AUTH_COOKIE);
    const body = await res.json();
    expect(body.profile.username).toBe('rina');
  });

  it('register username duplikat → 409', async () => {
    await register(postJson('http://localhost/api/auth/register', { username: 'dobel' }) as any);
    const res = await register(
      postJson('http://localhost/api/auth/register', { username: 'dobel' }) as any,
    );
    expect(res.status).toBe(409);
  });

  it('login PIN benar → 200 + cookie; salah → 401', async () => {
    await register(postJson('http://localhost/api/auth/register', { username: 'joko', pin: '9999' }) as any);

    const ok = await login(postJson('http://localhost/api/auth/login', { username: 'joko', pin: '9999' }) as any);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('set-cookie')).toContain(AUTH_COOKIE);

    const bad = await login(postJson('http://localhost/api/auth/login', { username: 'joko', pin: '0000' }) as any);
    expect(bad.status).toBe(401);

    const missing = await login(postJson('http://localhost/api/auth/login', { username: 'hantu' }) as any);
    expect(missing.status).toBe(401);
  });
});
