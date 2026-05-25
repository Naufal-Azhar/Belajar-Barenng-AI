import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionRepository } from '@/lib/session-repository-memory';
import { setSessionRepository } from '@/lib/session-repository';

vi.mock('next/server', () => ({
  NextRequest: class extends Request {},
}));

import { GET, PATCH, DELETE } from '@/app/api/sessions/[sessionId]/route';

describe('/api/sessions/[sessionId]', () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    repo = new InMemorySessionRepository({ persistOnDisk: false });
    setSessionRepository(repo);
  });

  function makeReq(opts: { method?: string; body?: any; headers?: Record<string, string> } = {}): Request {
    return new Request('http://localhost/api/sessions/x', {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  }

  describe('GET', () => {
    it('returns 400 tanpa X-Device-Id', async () => {
      const res = await GET(makeReq() as any, { params: { sessionId: 'any' } });
      expect(res.status).toBe(400);
    });

    it('returns 404 untuk sessionId yang tidak ada', async () => {
      const res = await GET(
        makeReq({ headers: { 'x-device-id': 'A' } }) as any,
        { params: { sessionId: 'nonexistent' } }
      );
      expect(res.status).toBe(404);
    });

    it('returns 403 kalau owner berbeda', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'owner-A' });
      const res = await GET(
        makeReq({ headers: { 'x-device-id': 'attacker-B' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(403);
    });

    it('returns session + messages untuk owner yang benar', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });
      await repo.appendMessage(s.sessionId, {
        sessionId: s.sessionId,
        role: 'user',
        mode: 'explainer',
        content: 'halo',
        createdAt: new Date().toISOString(),
      });

      const res = await GET(
        makeReq({ headers: { 'x-device-id': 'A' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.sessionId).toBe(s.sessionId);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe('halo');
    });

    it('returns 404 untuk sesi yang sudah di-archive', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });
      await repo.archive(s.sessionId);

      const res = await GET(
        makeReq({ headers: { 'x-device-id': 'A' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('rename title sesi yang dimiliki', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await PATCH(
        makeReq({ method: 'PATCH', headers: { 'x-device-id': 'A' }, body: { title: 'Belajar Biologi' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(200);

      const updated = await repo.get(s.sessionId);
      expect(updated?.title).toBe('Belajar Biologi');
    });

    it('returns 403 kalau owner berbeda', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await PATCH(
        makeReq({ method: 'PATCH', headers: { 'x-device-id': 'B' }, body: { title: 'Hack' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(403);
      const stored = await repo.get(s.sessionId);
      expect(stored?.title).toBeUndefined();
    });

    it('returns 400 untuk title kosong', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await PATCH(
        makeReq({ method: 'PATCH', headers: { 'x-device-id': 'A' }, body: { title: '' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 untuk title > 100 char', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await PATCH(
        makeReq({ method: 'PATCH', headers: { 'x-device-id': 'A' }, body: { title: 'x'.repeat(101) } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('soft-archive sesi yang dimiliki', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await DELETE(
        makeReq({ method: 'DELETE', headers: { 'x-device-id': 'A' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(200);

      // listByOwner tidak menampilkan archived
      const list = await repo.listByOwner('device', 'A');
      expect(list).toHaveLength(0);

      // tapi data masih ada di store (soft delete)
      const archived = await repo.get(s.sessionId);
      expect(archived?.isArchived).toBe(true);
    });

    it('returns 403 kalau owner berbeda', async () => {
      const s = await repo.create({ ownerType: 'device', ownerId: 'A' });

      const res = await DELETE(
        makeReq({ method: 'DELETE', headers: { 'x-device-id': 'B' } }) as any,
        { params: { sessionId: s.sessionId } }
      );
      expect(res.status).toBe(403);
      const stored = await repo.get(s.sessionId);
      expect(stored?.isArchived).toBe(false);
    });
  });
});
