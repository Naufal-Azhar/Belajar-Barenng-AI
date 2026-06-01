import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryProfileRepository,
  UsernameTakenError,
  normalizeUsername,
  isValidUsername,
} from '@/lib/profile-repository';

/**
 * Task 7 — fondasi profil (username + PIN opsional, tanpa email).
 */
describe('ProfileRepository (Task 7)', () => {
  let repo: InMemoryProfileRepository;
  beforeEach(() => {
    repo = new InMemoryProfileRepository({ persistOnDisk: false });
  });

  it('create + getByUsername (case-insensitive)', async () => {
    await repo.create({ username: 'Budi', displayName: 'Budi', pin: '1234' });
    const p = await repo.getByUsername('budi');
    expect(p?.username).toBe('budi');
    expect(p?.displayName).toBe('Budi');
    // PIN tidak pernah disimpan plaintext
    expect((p as any)?.pin).toBeUndefined();
    expect(p?.pinHash).toBeTruthy();
  });

  it('tolak username duplikat (UsernameTakenError)', async () => {
    await repo.create({ username: 'sama' });
    await expect(repo.create({ username: 'SAMA' })).rejects.toBeInstanceOf(UsernameTakenError);
  });

  it('verifyPin: benar → true, salah → false', async () => {
    await repo.create({ username: 'andi', pin: '4321' });
    expect(await repo.verifyPin('andi', '4321')).toBe(true);
    expect(await repo.verifyPin('andi', '0000')).toBe(false);
  });

  it('profil tanpa PIN → verifyPin selalu true', async () => {
    await repo.create({ username: 'tamu' });
    expect(await repo.verifyPin('tamu')).toBe(true);
    expect(await repo.verifyPin('tamu', 'apa-saja')).toBe(true);
  });

  it('verifyPin username tidak ada → false', async () => {
    expect(await repo.verifyPin('hantu', '1234')).toBe(false);
  });

  it('helper username valid/normalisasi', () => {
    expect(normalizeUsername('  AbC ')).toBe('abc');
    expect(isValidUsername('ab')).toBe(false); // < 3
    expect(isValidUsername('valid_99')).toBe(true);
    expect(isValidUsername('with space')).toBe(false);
  });
});
