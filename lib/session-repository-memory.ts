import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  Session,
  DocumentContext,
  Message,
  SummaryPayload,
  OwnerType,
} from './types';
import type { SessionRepository, CreateSessionInput } from './session-repository';
import { normalizeSession } from './session-repository';

const STORE_PATH = join(process.cwd(), '.dev-sessions.json');

interface StoreData {
  sessions: Record<string, Session & { summary?: SummaryPayload }>;
  messages: Record<string, Message[]>;
}

function loadStore(): StoreData {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {}
  return { sessions: {}, messages: {} };
}

function saveStore(data: StoreData): void {
  try {
    writeFileSync(STORE_PATH, JSON.stringify(data), 'utf-8');
  } catch {}
}

/**
 * In-memory session repository yang persist ke file agar survive HMR restart.
 * Mendukung mode test: kalau persistOnDisk=false, tidak baca/tulis file.
 */
export class InMemorySessionRepository implements SessionRepository {
  private store: StoreData;
  private persistOnDisk: boolean;

  constructor(opts: { persistOnDisk?: boolean } = {}) {
    this.persistOnDisk = opts.persistOnDisk ?? true;
    this.store = this.persistOnDisk ? loadStore() : { sessions: {}, messages: {} };
  }

  private persist() {
    if (this.persistOnDisk) saveStore(this.store);
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const session: Session = {
      sessionId,
      currentMode: 'explainer',
      startedAt: now,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      updatedAt: now,
      isArchived: false,
    };
    this.store.sessions[sessionId] = session;
    this.store.messages[sessionId] = [];
    this.persist();
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const raw = this.store.sessions[sessionId];
    return raw ? normalizeSession(raw) : null;
  }

  async update(sessionId: string, patch: Partial<Session>): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    Object.assign(session, patch, { updatedAt: new Date().toISOString() });
    this.persist();
  }

  async setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    session.documentContext = ctx;
    session.updatedAt = new Date().toISOString();
    this.persist();
  }

  async appendMessage(sessionId: string, msg: Omit<Message, 'messageId'>): Promise<Message> {
    const message: Message = { ...msg, messageId: randomUUID() };
    if (!this.store.messages[sessionId]) this.store.messages[sessionId] = [];
    this.store.messages[sessionId].push(message);
    this.persist();
    return message;
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    return this.store.messages[sessionId] ?? [];
  }

  async saveSummary(sessionId: string, summary: SummaryPayload): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    const now = new Date().toISOString();
    (session as any).summary = summary;
    session.endedAt = now;
    session.updatedAt = now;
    this.persist();
  }

  // --- Multi-conversation methods ---

  async listByOwner(ownerType: OwnerType, ownerId: string): Promise<Session[]> {
    const all = Object.values(this.store.sessions).map((raw) => normalizeSession(raw));
    return all
      .filter((s) => s.ownerType === ownerType && s.ownerId === ownerId && !s.isArchived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async updateTitle(sessionId: string, title: string): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    session.title = title;
    session.updatedAt = new Date().toISOString();
    this.persist();
  }

  async archive(sessionId: string): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    session.isArchived = true;
    session.updatedAt = new Date().toISOString();
    this.persist();
  }

  async touch(sessionId: string): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    session.updatedAt = new Date().toISOString();
    this.persist();
  }

  async migrateOwner(fromDeviceId: string, toUserId: string): Promise<number> {
    let migrated = 0;
    const now = new Date().toISOString();
    for (const session of Object.values(this.store.sessions)) {
      const normalized = normalizeSession(session);
      if (normalized.ownerType === 'device' && normalized.ownerId === fromDeviceId) {
        session.ownerType = 'user';
        session.ownerId = toUserId;
        session.updatedAt = now;
        migrated++;
      }
    }
    if (migrated > 0) this.persist();
    return migrated;
  }
}
