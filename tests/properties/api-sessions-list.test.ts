import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySessionRepository } from '@/lib/session-repository-memory';
import { setSessionRepository } from '@/lib/session-repository';

// Mock 'next/server' — di lingkungan jsdom, kita pakai Web standar Request/Response.
// NextRequest hanya wrapper, dan handler kita pakai .headers.get yang Request native juga punya.
vi.mock('next/server', () => ({
  NextRequest: class extends Request {},
}));

import { GET, POST } from '@/app/api/sessions/route';

describe('GET /api/sessions', () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    repo = new InMemorySessionRepository({ persistOnDisk: false });
    setSessionRepository(repo);
  });

  function makeRequest(headers: Record<string, string> = {}): Request {
    return new Request('http://localhost/api/sessions', { headers });
  }

  it('returns 400 kalau tidak ada X-Device-Id header', async () => {
    const res = await GET(makeRequest() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/X-Device-Id/i);
  });

  it('returns array kosong untuk device tanpa sesi', async () => {
    const res = await GET(makeRequest({ 'x-device-id': 'fresh-device' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([]);
  });

  it('returns hanya sesi milik device tertentu (isolation)', async () => {
    await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-A' });
    await repo.create({ profileType: 'sma', ownerType: 'device', ownerId: 'device-A' });
    await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-B' });

    const resA = await GET(makeRequest({ 'x-device-id': 'device-A' }) as any);
    const bodyA = await resA.json();
    expect(bodyA.sessions).toHaveLength(2);
    expect(bodyA.sessions.every((s: any) => s.ownerId === 'device-A')).toBe(true);

    const resB = await GET(makeRequest({ 'x-device-id': 'device-B' }) as any);
    const bodyB = await resB.json();
    expect(bodyB.sessions).toHaveLength(1);
  });

  it('exclude sesi yang sudah di-archive', async () => {
    const s1 = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
    await repo.create({ profileType: 'sma', ownerType: 'device', ownerId: 'A' });
    await repo.archive(s1.sessionId);

    const res = await GET(makeRequest({ 'x-device-id': 'A' }) as any);
    const body = await res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].sessionId).not.toBe(s1.sessionId);
  });

  it('strips compiledMarkdown dari documentContext (light response)', async () => {
    const s = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
    await repo.setDocumentContext(s.sessionId, {
      fileName: 'test.pdf',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
      compiledMarkdown: 'A'.repeat(10000),
      uploadedAt: new Date().toISOString(),
    });

    const res = await GET(makeRequest({ 'x-device-id': 'A' }) as any);
    const body = await res.json();
    expect(body.sessions[0].documentContext.compiledMarkdown).toBe('');
    expect(body.sessions[0].documentContext.fileName).toBe('test.pdf');
  });
});


describe('POST /api/sessions', () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    repo = new InMemorySessionRepository({ persistOnDisk: false });
    setSessionRepository(repo);
  });

  function makePostRequest(body: any, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 kalau X-Device-Id tidak ada', async () => {
    const res = await POST(makePostRequest({ profileType: 'mahasiswa' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 kalau profileType invalid', async () => {
    const res = await POST(
      makePostRequest({ profileType: 'invalid' }, { 'x-device-id': 'A' }) as any
    );
    expect(res.status).toBe(400);
  });

  it('create session dengan ownerType=device + ownerId=deviceId', async () => {
    const res = await POST(
      makePostRequest({ profileType: 'mahasiswa' }, { 'x-device-id': 'my-device' }) as any
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
    expect(body.ownerType).toBe('device');
    expect(body.ownerId).toBe('my-device');

    // Verifikasi via repo: session memang tersimpan dengan owner yang benar
    const stored = await repo.get(body.sessionId);
    expect(stored?.ownerType).toBe('device');
    expect(stored?.ownerId).toBe('my-device');
  });

  it('session yang baru dibuat muncul di GET berikutnya', async () => {
    const createRes = await POST(
      makePostRequest({ profileType: 'sma' }, { 'x-device-id': 'A' }) as any
    );
    const created = await createRes.json();

    const listRes = await GET(
      new Request('http://localhost/api/sessions', { headers: { 'x-device-id': 'A' } }) as any
    );
    const list = await listRes.json();
    expect(list.sessions).toHaveLength(1);
    expect(list.sessions[0].sessionId).toBe(created.sessionId);
  });
});
