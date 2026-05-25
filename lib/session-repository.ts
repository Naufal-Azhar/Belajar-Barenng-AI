import { randomUUID } from 'crypto';
import type {
  Session,
  DocumentContext,
  Message,
  LearningMode,
  SummaryPayload,
  OwnerType,
} from './types';
import { getFirestore } from './firestore';
import { FirestoreError, NotFoundError } from './validation';

const MAX_EXTRACTED_TEXT_BYTES = 200 * 1024; // 200 KB

export interface CreateSessionInput {
  ownerType: OwnerType;
  ownerId: string;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  update(sessionId: string, patch: Partial<Session>): Promise<void>;
  setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void>;
  appendMessage(sessionId: string, msg: Omit<Message, 'messageId'>): Promise<Message>;
  listMessages(sessionId: string): Promise<Message[]>;
  saveSummary(sessionId: string, summary: SummaryPayload): Promise<void>;

  // --- Multi-conversation methods ---
  /**
   * List sesi yang dimiliki owner tertentu, exclude yang archived.
   * Sorted by updatedAt desc (terbaru di atas).
   */
  listByOwner(ownerType: OwnerType, ownerId: string): Promise<Session[]>;
  /** Update title sesi + bump updatedAt */
  updateTitle(sessionId: string, title: string): Promise<void>;
  /** Soft delete: set isArchived = true + bump updatedAt */
  archive(sessionId: string): Promise<void>;
  /** Bump updatedAt saja (lighter than full update) — dipanggil saat ada activity baru */
  touch(sessionId: string): Promise<void>;
  /**
   * Migrasi semua sesi ownerType:'device' + ownerId:fromDeviceId
   * menjadi ownerType:'user' + ownerId:toUserId.
   * Idempotent: kalau sudah ownerType:'user' di-skip.
   * Returns jumlah sesi yang berhasil dimigrasi.
   */
  migrateOwner(fromDeviceId: string, toUserId: string): Promise<number>;
}

function truncateText(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  if (encoded.length <= maxBytes) return text;
  const decoder = new TextDecoder();
  return decoder.decode(encoded.slice(0, maxBytes)) + '…[dipotong]';
}

/**
 * Normalisasi sesi yang dibaca dari storage agar field baru
 * (ownerType, ownerId, updatedAt) selalu ada — graceful handling
 * untuk sesi legacy yang dibuat sebelum schema baru.
 *
 * Sesi legacy diberi `ownerType:'device'` + `ownerId:'legacy'` agar
 * tidak muncul di list user manapun (effectively orphan, but readable).
 */
export function normalizeSession(raw: any): Session {
  return {
    ...raw,
    ownerType: raw.ownerType ?? 'device',
    ownerId: raw.ownerId ?? 'legacy',
    updatedAt: raw.updatedAt ?? raw.startedAt ?? new Date().toISOString(),
    isArchived: raw.isArchived ?? false,
  };
}

export class FirestoreSessionRepository implements SessionRepository {
  private get db() {
    return getFirestore();
  }

  async create(input: CreateSessionInput): Promise<Session> {
    try {
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
      return normalizeSession(doc.data());
    } catch (err) {
      throw new FirestoreError(`Failed to get session: ${(err as Error).message}`);
    }
  }

  async update(sessionId: string, patch: Partial<Session>): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        ...patch,
        updatedAt: new Date().toISOString(),
      });
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
        updatedAt: new Date().toISOString(),
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
      const now = new Date().toISOString();
      await this.db.collection('sessions').doc(sessionId).update({
        summary,
        endedAt: now,
        updatedAt: now,
      });
    } catch (err) {
      throw new FirestoreError(`Failed to save summary: ${(err as Error).message}`);
    }
  }

  // --- Multi-conversation methods ---

  async listByOwner(ownerType: OwnerType, ownerId: string): Promise<Session[]> {
    try {
      // Filter isArchived in-memory karena Firestore mengharuskan composite index
      // untuk where(!=) + orderBy pada field berbeda. Volume per owner kecil (<100).
      const snapshot = await this.db
        .collection('sessions')
        .where('ownerType', '==', ownerType)
        .where('ownerId', '==', ownerId)
        .orderBy('updatedAt', 'desc')
        .get();
      return snapshot.docs
        .map((doc) => normalizeSession(doc.data()))
        .filter((s) => !s.isArchived);
    } catch (err) {
      throw new FirestoreError(`Failed to list by owner: ${(err as Error).message}`);
    }
  }

  async updateTitle(sessionId: string, title: string): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        title,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new FirestoreError(`Failed to update title: ${(err as Error).message}`);
    }
  }

  async archive(sessionId: string): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        isArchived: true,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new FirestoreError(`Failed to archive session: ${(err as Error).message}`);
    }
  }

  async touch(sessionId: string): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      throw new FirestoreError(`Failed to touch session: ${(err as Error).message}`);
    }
  }

  async migrateOwner(fromDeviceId: string, toUserId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('sessions')
        .where('ownerType', '==', 'device')
        .where('ownerId', '==', fromDeviceId)
        .get();

      let migrated = 0;
      const batch = this.db.batch();
      const now = new Date().toISOString();

      for (const doc of snapshot.docs) {
        batch.update(doc.ref, {
          ownerType: 'user',
          ownerId: toUserId,
          updatedAt: now,
        });
        migrated++;
      }

      if (migrated > 0) await batch.commit();
      return migrated;
    } catch (err) {
      throw new FirestoreError(`Failed to migrate owner: ${(err as Error).message}`);
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
