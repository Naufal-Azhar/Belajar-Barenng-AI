import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  Session,
  DocumentContext,
  Message,
  ProfileType,
  SummaryPayload,
} from './types';
import type { SessionRepository } from './session-repository';

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
 */
export class InMemorySessionRepository implements SessionRepository {
  private store: StoreData;

  constructor() {
    this.store = loadStore();
  }

  private persist() {
    saveStore(this.store);
  }

  async create(input: { profileType: ProfileType }): Promise<Session> {
    const sessionId = randomUUID();
    const session: Session = {
      sessionId,
      profileType: input.profileType,
      currentMode: 'explainer',
      startedAt: new Date().toISOString(),
    };
    this.store.sessions[sessionId] = session;
    this.store.messages[sessionId] = [];
    this.persist();
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    return this.store.sessions[sessionId] ?? null;
  }

  async update(sessionId: string, patch: Partial<Session>): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    Object.assign(session, patch);
    this.persist();
  }

  async setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void> {
    const session = this.store.sessions[sessionId];
    if (!session) return;
    session.documentContext = ctx;
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
    (session as any).summary = summary;
    session.endedAt = new Date().toISOString();
    this.persist();
  }
}
