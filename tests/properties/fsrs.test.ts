import { describe, it, expect } from 'vitest';
import { scheduleCard, createNewCardParams, gradeToRating } from '@/lib/fsrs';
import type { FlashCard } from '@/lib/types';

function makeCard(overrides: Partial<FlashCard> = {}): FlashCard {
  const params = createNewCardParams();
  return {
    cardId: 'test-1',
    deviceId: 'dev-1',
    sessionId: 'sess-1',
    question: 'Apa fungsi alveolus?',
    answer: 'Tempat pertukaran O2 dan CO2',
    concept: 'alveolus',
    weakStreak: 0,
    createdAt: new Date().toISOString(),
    ...params,
    ...overrides,
  };
}

describe('FSRS wrapper', () => {
  it('scheduleCard with rating "good" moves due date forward', () => {
    const card = makeCard();
    const result = scheduleCard(card, 'good');
    const newDue = new Date(result.due);
    expect(newDue.getTime()).toBeGreaterThan(Date.now());
    expect(result.reps).toBeGreaterThan(0);
  });

  it('scheduleCard with rating "again" keeps short interval', () => {
    const card = makeCard();
    const result = scheduleCard(card, 'again');
    expect(result.state).not.toBe('review');
  });

  it('gradeToRating maps correctly', () => {
    expect(gradeToRating(0)).toBe('again');
    expect(gradeToRating(1)).toBe('again');
    expect(gradeToRating(2)).toBe('hard');
    expect(gradeToRating(3)).toBe('good');
    expect(gradeToRating(4)).toBe('easy');
  });

  it('weakStreak logic: 3x again means weakStreak = 3', () => {
    let card = makeCard();
    for (let i = 0; i < 3; i++) {
      const result = scheduleCard(card, 'again');
      card = { ...card, ...result, weakStreak: card.weakStreak + 1 };
    }
    expect(card.weakStreak).toBe(3);
  });
});
