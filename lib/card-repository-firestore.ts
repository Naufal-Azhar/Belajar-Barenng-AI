import type { FlashCard } from './types';
import type { CardRepository } from './card-repository';
import { getFirestore } from './firestore';

export class FirestoreCardRepository implements CardRepository {
  private get db() {
    return getFirestore();
  }

  private col(deviceId: string) {
    return this.db.collection('devices').doc(deviceId).collection('cards');
  }

  async createCard(card: FlashCard): Promise<FlashCard> {
    await this.col(card.deviceId).doc(card.cardId).set(card);
    return card;
  }

  async getCard(deviceId: string, cardId: string): Promise<FlashCard | null> {
    const doc = await this.col(deviceId).doc(cardId).get();
    return doc.exists ? (doc.data() as FlashCard) : null;
  }

  async listDueCards(deviceId: string, now: Date): Promise<FlashCard[]> {
    const snap = await this.col(deviceId)
      .where('due', '<=', now.toISOString())
      .orderBy('due', 'asc')
      .get();
    return snap.docs.map((d) => d.data() as FlashCard);
  }

  async listAllCards(deviceId: string): Promise<FlashCard[]> {
    const snap = await this.col(deviceId).orderBy('createdAt', 'asc').get();
    return snap.docs.map((d) => d.data() as FlashCard);
  }

  async updateCard(deviceId: string, cardId: string, patch: Partial<FlashCard>): Promise<void> {
    await this.col(deviceId).doc(cardId).update(patch);
  }

  async findByConceptPrefix(deviceId: string, concept: string): Promise<FlashCard | null> {
    const snap = await this.col(deviceId)
      .where('concept', '==', concept.toLowerCase())
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as FlashCard);
  }
}
