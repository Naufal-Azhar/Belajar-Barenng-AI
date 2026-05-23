import { randomUUID } from 'crypto';
import type {
  Session,
  DocumentContext,
  Message,
  LearningMode,
  ProfileType,
  SummaryPayload,
} from './types';
import { getFirestore } from './firestore';
import { FirestoreError, NotFoundError } from './validation';

const MAX_EXTRACTED_TEXT_BYTES = 200 * 1024; // 200 KB

export interface SessionRepository {
  create(input: { profileType: ProfileType }): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  update(sessionId: string, patch: Partial<Session>): Promise<void>;
  setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void>;
  appendMessage(sessionId: string, msg: Omit<Message, 'messageId'>): Promise<Message>;
  listMessages(sessionId: string): Promise<Message[]>;
  saveSummary(sessionId: string, summary: SummaryPayload): Promise<void>;
}

function truncateText(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  if (encoded.length <= maxBytes) return text;
  const decoder = new TextDecoder();
  return decoder.decode(encoded.slice(0, maxBytes)) + '…[dipotong]';
}

export class FirestoreSessionRepository implements SessionRepository {
  private get db() {
    return getFirestore();
  }

  async create(input: { profileType: ProfileType }): Promise<Session> {
    try {
      const sessionId = randomUUID();
      const session: Session = {
        sessionId,
        profileType: input.profileType,
        currentMode: 'explainer',
        startedAt: new Date().toISOString(),
      };
      await this.db.collection('sessions').doc(sessionId).set(session);
      return session;
    } catch (err) {
      throw new FirestoreError(`Failed to create session: ${(err as Error).message}`);
    }
  }

  async get(sessionId: string): Promise<Session | null> {
    try {
      const doc = await this.db.collection('sessions').doc(sessionId).get();
      if (!doc.exists) return null;
      return doc.data() as Session;
    } catch (err) {
      throw new FirestoreError(`Failed to get session: ${(err as Error).message}`);
    }
  }

  async update(sessionId: string, patch: Partial<Session>): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update(patch);
    } catch (err) {
      throw new FirestoreError(`Failed to update session: ${(err as Error).message}`);
    }
  }

  async setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void> {
    const truncated: DocumentContext = {
      ...ctx,
      compiledMarkdown: truncateText(ctx.compiledMarkdown, MAX_EXTRACTED_TEXT_BYTES),
    };
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        documentContext: truncated,
      });
    } catch (err) {
      throw new FirestoreError(`Failed to set document context: ${(err as Error).message}`);
    }
  }

  async appendMessage(sessionId: string, msg: Omit<Message, 'messageId'>): Promise<Message> {
    try {
      const ref = this.db
        .collection('sessions')
        .doc(sessionId)
        .collection('messages')
        .doc();
      const message: Message = { ...msg, messageId: ref.id };
      await ref.set(message);
      return message;
    } catch (err) {
      throw new FirestoreError(`Failed to append message: ${(err as Error).message}`);
    }
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    try {
      const snapshot = await this.db
        .collection('sessions')
        .doc(sessionId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .get();
      return snapshot.docs.map((doc) => doc.data() as Message);
    } catch (err) {
      throw new FirestoreError(`Failed to list messages: ${(err as Error).message}`);
    }
  }

  async saveSummary(sessionId: string, summary: SummaryPayload): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        summary,
        endedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new FirestoreError(`Failed to save summary: ${(err as Error).message}`);
    }
  }
}

// Singleton — use globalThis to survive HMR
const globalKey = '__belajar_session_repo__';

export function getSessionRepository(): SessionRepository {
  if (!(globalThis as any)[globalKey]) {
    if (process.env.USE_MEMORY_STORE === 'true') {
      const { InMemorySessionRepository } = require('./session-repository-memory');
      (globalThis as any)[globalKey] = new InMemorySessionRepository();
    } else {
      (globalThis as any)[globalKey] = new FirestoreSessionRepository();
    }
  }
  return (globalThis as any)[globalKey];
}

// For testing: allow injection
export function setSessionRepository(repo: SessionRepository) {
  (globalThis as any)[globalKey] = repo;
}
