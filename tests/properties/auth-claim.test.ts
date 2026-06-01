import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionRepository } from '@/lib/session-repository-memory';
import { setSessionRepository } from '@/lib/session-repository';
import { signToken, AUTH_COOKIE } from '@/lib/auth-token';

vi.mock('next/server', () => ({ NextRequest: class extends Request {} }));

import { POST as claim } from '@/app/api/auth/claim/route';

function claimReq(opts: { cookie?: string; deviceId?: string }): Request {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.deviceId) headers['x-device-id'] = opts.deviceId;
  return new Request('http://localhost/api/auth/claim', { method: 'POST', headers });
}

describe('POST /api/auth/claim (Task 11)', () => {
  let repo: InMemorySessionRepository;
  beforeEach(() => {
    repo = new InMemorySessionRepository({ persistOnDisk: false });
    setSessionRepository(repo);
  });

  it('memindahkan sesi device ke user, lalu idempotent', async () => {
    await repo.create({ ownerType: 'device', ownerId: 'dev-x' });
    await repo.create({ ownerType: 'device', ownerId: 'dev-x' });

    const cookie = `${AUTH_COOKIE}=${signToken('budi')}`;
    const res = await claim(claimReq({ cookie, deviceId: 'dev-x' }) as any);
    expect(res.status).toBe(200);
    expect((await res.json()).migrated).toBe(2);

    // Sesi sekarang milik user 'budi'
    expect(await repo.listByOwner('user', 'budi')).toHaveLength(2);
    expect(await repo.listByOwner('device', 'dev-x')).toHaveLength(0);

    // Idempotent
    const res2 = await claim(claimReq({ cookie, deviceId: 'dev-x' }) as any);
    expect((await res2.json()).migrated).toBe(0);
  });

  it('tanpa cookie user (tamu) → 401', async () => {
    const res = await claim(claimReq({ deviceId: 'dev-x' }) as any);
    expect(res.status).toBe(401);
  });
});
