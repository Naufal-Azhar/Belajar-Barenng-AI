import type { FlashCard } from './types';
import type { CardRepository } from './card-repository';

export class InMemoryCardRepository implements CardRepository {
  private cards: Map<string, FlashCard> = new Map();

  private key(deviceId: string, cardId: string) {
    return `${deviceId}:${cardId}`;
  }

  async createCard(card: FlashCard): Promise<FlashCard> {
    this.cards.set(this.key(card.deviceId, card.cardId), card);
    return card;
  }

  async getCard(deviceId: string, cardId: string): Promise<FlashCard | null> {
    return this.cards.get(this.key(deviceId, cardId)) ?? null;
  }

  async listDueCards(deviceId: string, now: Date): Promise<FlashCard[]> {
    return Array.from(this.cards.values())
      .filter((c) => c.deviceId === deviceId && new Date(c.due) <= now)
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }

  async listAllCards(deviceId: string): Promise<FlashCard[]> {
    return Array.from(this.cards.values()).filter((c) => c.deviceId === deviceId);
  }

  async updateCard(deviceId: string, cardId: string, patch: Partial<FlashCard>): Promise<void> {
    const existing = this.cards.get(this.key(deviceId, cardId));
    if (existing) {
      this.cards.set(this.key(deviceId, cardId), { ...existing, ...patch });
    }
  }

  async findByConceptPrefix(deviceId: string, concept: string): Promise<FlashCard | null> {
    const lower = concept.toLowerCase();
    const all = Array.from(this.cards.values());
    for (const card of all) {
      if (card.deviceId === deviceId && card.concept.toLowerCase() === lower) return card;
    }
    return null;
  }
}
