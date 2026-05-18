import { randomUUID } from 'crypto';
import type {
  Session,
  DocumentContext,
  Message,
  ProfileType,
  SummaryPayload,
} from './types';
import type { SessionRepository } from './session-repository';

/**
 * In-memory session repository untuk development/preview tanpa Firestore.
 */
export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, Session & { summary?: SummaryPayload }>();
  private messages = new Map<string, Message[]>();

  async create(input: { profileType: ProfileType }): Promise<Session> {
    const sessionId = randomUUID();
    const session: Session = {
      sessionId,
      profileType: input.profileType,
      currentMode: 'explainer',
      startedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async update(sessionId: string, patch: Partial<Session>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    Object.assign(session, patch);
  }

  async setDocumentContext(sessionId: string, ctx: DocumentContext): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.documentContext = ctx;
  }

  async appendMessage(sessionId: string, msg: Omit<Message, 'messageId'>): Promise<Message> {
    const message: Message = { ...msg, messageId: randomUUID() };
    const list = this.messages.get(sessionId) ?? [];
    list.push(message);
    this.messages.set(sessionId, list);
    return message;
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) ?? [];
  }

  async saveSummary(sessionId: string, summary: SummaryPayload): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    (session as any).summary = summary;
    session.endedAt = new Date().toISOString();
  }
}
