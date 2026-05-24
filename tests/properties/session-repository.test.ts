import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySessionRepository } from '@/lib/session-repository-memory';
import { normalizeSession } from '@/lib/session-repository';

describe('SessionRepository — multi-conversation methods', () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    // persistOnDisk:false agar test tidak menyentuh .dev-sessions.json
    repo = new InMemorySessionRepository({ persistOnDisk: false });
  });

  describe('create + listByOwner', () => {
    it('create session menyimpan ownerType + ownerId', async () => {
      const session = await repo.create({
        profileType: 'mahasiswa',
        ownerType: 'device',
        ownerId: 'device-A',
      });
      expect(session.ownerType).toBe('device');
      expect(session.ownerId).toBe('device-A');
      expect(session.isArchived).toBe(false);
      expect(session.updatedAt).toBeDefined();
    });

    it('listByOwner mengembalikan sesi milik owner saja', async () => {
      const a1 = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-A' });
      const a2 = await repo.create({ profileType: 'sma', ownerType: 'device', ownerId: 'device-A' });
      await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-B' });

      const list = await repo.listByOwner('device', 'device-A');
      const ids = list.map((s) => s.sessionId);
      expect(ids).toContain(a1.sessionId);
      expect(ids).toContain(a2.sessionId);
      expect(ids).toHaveLength(2);
    });

    it('listByOwner memisahkan sesi device vs user', async () => {
      await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'shared-id' });
      await repo.create({ profileType: 'mahasiswa', ownerType: 'user', ownerId: 'shared-id' });

      const deviceList = await repo.listByOwner('device', 'shared-id');
      const userList = await repo.listByOwner('user', 'shared-id');

      expect(deviceList).toHaveLength(1);
      expect(userList).toHaveLength(1);
      expect(deviceList[0].ownerType).toBe('device');
      expect(userList[0].ownerType).toBe('user');
    });

    it('listByOwner sort by updatedAt descending', async () => {
      const s1 = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
      // jeda kecil supaya updatedAt berbeda
      await new Promise((r) => setTimeout(r, 5));
      const s2 = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
      await new Promise((r) => setTimeout(r, 5));
      await repo.touch(s1.sessionId);

      const list = await repo.listByOwner('device', 'A');
      expect(list[0].sessionId).toBe(s1.sessionId);
      expect(list[1].sessionId).toBe(s2.sessionId);
    });
  });

  describe('updateTitle', () => {
    it('mengubah title dan bump updatedAt', async () => {
      const s = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
      const initialUpdatedAt = s.updatedAt;
      await new Promise((r) => setTimeout(r, 10));

      await repo.updateTitle(s.sessionId, 'Belajar Biologi');

      const updated = await repo.get(s.sessionId);
      expect(updated?.title).toBe('Belajar Biologi');
      expect(updated!.updatedAt > initialUpdatedAt).toBe(true);
    });
  });

  describe('archive', () => {
    it('archive set isArchived=true dan exclude dari listByOwner', async () => {
      const s = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });

      let list = await repo.listByOwner('device', 'A');
      expect(list).toHaveLength(1);

      await repo.archive(s.sessionId);

      list = await repo.listByOwner('device', 'A');
      expect(list).toHaveLength(0);

      // Tetap bisa di-get langsung (read-only access)
      const archived = await repo.get(s.sessionId);
      expect(archived?.isArchived).toBe(true);
    });
  });

  describe('touch', () => {
    it('hanya update updatedAt tanpa mengubah field lain', async () => {
      const s = await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'A' });
      await repo.updateTitle(s.sessionId, 'My Title');
      const before = await repo.get(s.sessionId);
      await new Promise((r) => setTimeout(r, 10));

      await repo.touch(s.sessionId);

      const after = await repo.get(s.sessionId);
      expect(after?.title).toBe('My Title'); // unchanged
      expect(after!.updatedAt > before!.updatedAt).toBe(true);
    });
  });

  describe('migrateOwner', () => {
    it('memindah semua sesi device-A ke user-X', async () => {
      await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-A' });
      await repo.create({ profileType: 'sma', ownerType: 'device', ownerId: 'device-A' });
      await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-B' });

      const migrated = await repo.migrateOwner('device-A', 'user-X');
      expect(migrated).toBe(2);

      const userList = await repo.listByOwner('user', 'user-X');
      expect(userList).toHaveLength(2);
      // device-B tidak ikut termigrate
      const deviceB = await repo.listByOwner('device', 'device-B');
      expect(deviceB).toHaveLength(1);
    });

    it('idempotent: panggil dua kali tidak duplikat', async () => {
      await repo.create({ profileType: 'mahasiswa', ownerType: 'device', ownerId: 'device-A' });

      await repo.migrateOwner('device-A', 'user-X');
      const second = await repo.migrateOwner('device-A', 'user-X');

      expect(second).toBe(0);
      const userList = await repo.listByOwner('user', 'user-X');
      expect(userList).toHaveLength(1);
    });

    it('tidak menyentuh sesi user yang sudah ada', async () => {
      await repo.create({ profileType: 'mahasiswa', ownerType: 'user', ownerId: 'user-X' });
      await repo.create({ profileType: 'sma', ownerType: 'device', ownerId: 'device-A' });

      const migrated = await repo.migrateOwner('device-A', 'user-X');
      expect(migrated).toBe(1);

      const userList = await repo.listByOwner('user', 'user-X');
      expect(userList).toHaveLength(2);
    });
  });

  describe('normalizeSession (graceful migration untuk session legacy)', () => {
    it('session tanpa ownerType/ownerId dapat default device/legacy', () => {
      const raw = {
        sessionId: 'old-session',
        profileType: 'mahasiswa',
        currentMode: 'explainer',
        startedAt: '2026-01-01T00:00:00Z',
      };
      const normalized = normalizeSession(raw);
      expect(normalized.ownerType).toBe('device');
      expect(normalized.ownerId).toBe('legacy');
      expect(normalized.updatedAt).toBe('2026-01-01T00:00:00Z');
      expect(normalized.isArchived).toBe(false);
    });

    it('session lama tidak muncul di list user manapun (orphan-safe)', async () => {
      // Simulasi session legacy: inject langsung tanpa lewat create()
      const internalStore = (repo as any).store;
      internalStore.sessions['legacy-1'] = {
        sessionId: 'legacy-1',
        profileType: 'mahasiswa',
        currentMode: 'explainer',
        startedAt: '2026-01-01T00:00:00Z',
        // ownerType, ownerId, updatedAt tidak ada — simulasi data lama
      };

      // Tidak muncul di list owner aktif
      const list = await repo.listByOwner('device', 'real-device-id');
      expect(list.find((s) => s.sessionId === 'legacy-1')).toBeUndefined();

      // Hanya muncul di list 'legacy' (orphan placeholder)
      const orphans = await repo.listByOwner('device', 'legacy');
      expect(orphans.find((s) => s.sessionId === 'legacy-1')).toBeDefined();
    });
  });
});
