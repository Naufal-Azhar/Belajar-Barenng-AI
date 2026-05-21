import type { FlashCard } from './types';

export interface CardRepository {
  createCard(card: FlashCard): Promise<FlashCard>;
  getCard(deviceId: string, cardId: string): Promise<FlashCard | null>;
  listDueCards(deviceId: string, now: Date): Promise<FlashCard[]>;
  listAllCards(deviceId: string): Promise<FlashCard[]>;
  updateCard(deviceId: string, cardId: string, patch: Partial<FlashCard>): Promise<void>;
  findByConceptPrefix(deviceId: string, concept: string): Promise<FlashCard | null>;
}

let _repo: CardRepository | null = null;

export function getCardRepository(): CardRepository {
  if (!_repo) {
    if (process.env.USE_MEMORY_STORE === 'true') {
      const { InMemoryCardRepository } = require('./card-repository-memory');
      _repo = new InMemoryCardRepository();
    } else {
      const { FirestoreCardRepository } = require('./card-repository-firestore');
      _repo = new FirestoreCardRepository();
    }
  }
  return _repo!;
}

export function setCardRepository(repo: CardRepository) {
  _repo = repo;
}
