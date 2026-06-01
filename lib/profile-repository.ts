import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getFirestore } from './firestore';

/**
 * Profil pengguna berbasis username (TANPA email). PIN bersifat opsional;
 * kalau diisi disimpan ter-hash (scrypt + salt), tidak pernah plaintext.
 *
 * CATATAN KEAMANAN: ini bukan auth tingkat tinggi. Profil tanpa PIN bisa
 * di-login siapa saja (impersonasi). Cocok untuk demo komunitas, bukan
 * untuk data sensitif. Tidak ada pemulihan PIN.
 */
export interface Profile {
  /** = username ternormalisasi (lowercase) — juga dipakai sebagai ownerId */
  profileId: string;
  username: string;
  /** Nama tampilan dengan casing asli */
  displayName: string;
  pinHash?: string;
  salt?: string;
  createdAt: string;
}

export interface CreateProfileInput {
  username: string;
  displayName?: string;
  pin?: string;
}

export class UsernameTakenError extends Error {
  constructor(message = 'Username sudah dipakai') {
    super(message);
    this.name = 'UsernameTakenError';
  }
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase();
}

export function isValidUsername(u: string): boolean {
  return USERNAME_RE.test(u.trim());
}

function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, 64).toString('hex');
}

export interface ProfileRepository {
  /** Buat profil baru. Throw UsernameTakenError kalau username sudah ada. */
  create(input: CreateProfileInput): Promise<Profile>;
  getByUsername(username: string): Promise<Profile | null>;
  /**
   * Verifikasi PIN. Profil tanpa pinHash → selalu true (PIN-less).
   * Profil ber-PIN → bandingkan secara timing-safe.
   */
  verifyPin(username: string, pin?: string): Promise<boolean>;
}

function buildProfile(input: CreateProfileInput): Profile {
  const username = normalizeUsername(input.username);
  const now = new Date().toISOString();
  const profile: Profile = {
    profileId: username,
    username,
    displayName: (input.displayName ?? input.username).trim() || username,
    createdAt: now,
  };
  if (input.pin && input.pin.length > 0) {
    const salt = randomBytes(16).toString('hex');
    profile.salt = salt;
    profile.pinHash = hashPin(input.pin, salt);
  }
  return profile;
}

function checkPin(profile: Profile, pin?: string): boolean {
  if (!profile.pinHash || !profile.salt) return true; // PIN-less profile
  if (!pin) return false;
  const expected = Buffer.from(profile.pinHash, 'hex');
  const actual = Buffer.from(hashPin(pin, profile.salt), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- Firestore impl ---

export class FirestoreProfileRepository implements ProfileRepository {
  private get col() {
    return getFirestore().collection('profiles');
  }

  async create(input: CreateProfileInput): Promise<Profile> {
    const profile = buildProfile(input);
    const ref = this.col.doc(profile.profileId);
    const existing = await ref.get();
    if (existing.exists) throw new UsernameTakenError();
    await ref.set(profile);
    return profile;
  }

  async getByUsername(username: string): Promise<Profile | null> {
    const doc = await this.col.doc(normalizeUsername(username)).get();
    return doc.exists ? (doc.data() as Profile) : null;
  }

  async verifyPin(username: string, pin?: string): Promise<boolean> {
    const profile = await this.getByUsername(username);
    if (!profile) return false;
    return checkPin(profile, pin);
  }
}

// --- In-memory impl (dev/test) ---

const STORE_PATH = join(process.cwd(), '.dev-profiles.json');

export class InMemoryProfileRepository implements ProfileRepository {
  private store: Record<string, Profile>;
  private persistOnDisk: boolean;

  constructor(opts: { persistOnDisk?: boolean } = {}) {
    this.persistOnDisk = opts.persistOnDisk ?? true;
    this.store = this.persistOnDisk ? this.load() : {};
  }

  private load(): Record<string, Profile> {
    try {
      if (existsSync(STORE_PATH)) return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    } catch {}
    return {};
  }

  private persist() {
    if (!this.persistOnDisk) return;
    try {
      writeFileSync(STORE_PATH, JSON.stringify(this.store), 'utf-8');
    } catch {}
  }

  async create(input: CreateProfileInput): Promise<Profile> {
    const profile = buildProfile(input);
    if (this.store[profile.profileId]) throw new UsernameTakenError();
    this.store[profile.profileId] = profile;
    this.persist();
    return profile;
  }

  async getByUsername(username: string): Promise<Profile | null> {
    return this.store[normalizeUsername(username)] ?? null;
  }

  async verifyPin(username: string, pin?: string): Promise<boolean> {
    const profile = await this.getByUsername(username);
    if (!profile) return false;
    return checkPin(profile, pin);
  }
}

// --- Singleton (survive HMR via globalThis) ---

const globalKey = '__belajar_profile_repo__';

export function getProfileRepository(): ProfileRepository {
  if (!(globalThis as any)[globalKey]) {
    (globalThis as any)[globalKey] =
      process.env.USE_MEMORY_STORE === 'true'
        ? new InMemoryProfileRepository()
        : new FirestoreProfileRepository();
  }
  return (globalThis as any)[globalKey];
}

export function setProfileRepository(repo: ProfileRepository) {
  (globalThis as any)[globalKey] = repo;
}
