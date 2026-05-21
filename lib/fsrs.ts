import { fsrs, createEmptyCard, Rating, State, type Card, type RecordLogItem } from 'ts-fsrs';
import type { FlashCard, ReviewRating, CardState } from './types';

const f = fsrs();

const RATING_MAP: Record<ReviewRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_NUM: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const NUM_TO_STATE: Record<number, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

export function gradeToRating(grade: number): ReviewRating {
  if (grade <= 1) return 'again';
  if (grade === 2) return 'hard';
  if (grade === 3) return 'good';
  return 'easy';
}

export function createNewCardParams(): Pick<FlashCard, 'state' | 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'reps' | 'lapses'> {
  const card = createEmptyCard();
  return {
    state: 'new',
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
  };
}

export function scheduleCard(
  flashCard: FlashCard,
  rating: ReviewRating,
  now: Date = new Date(),
): Pick<FlashCard, 'state' | 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'reps' | 'lapses'> {
  const card: Card = {
    due: new Date(flashCard.due),
    stability: flashCard.stability,
    difficulty: flashCard.difficulty,
    elapsed_days: flashCard.elapsedDays,
    scheduled_days: flashCard.scheduledDays,
    reps: flashCard.reps,
    lapses: flashCard.lapses,
    state: STATE_TO_NUM[flashCard.state],
    last_review: flashCard.lastReview ? new Date(flashCard.lastReview) : undefined,
  };

  const scheduling = f.repeat(card, now);
  const result = scheduling[RATING_MAP[rating] as unknown as keyof typeof scheduling] as RecordLogItem;
  const updated = result.card;

  return {
    state: NUM_TO_STATE[updated.state] || 'new',
    due: updated.due.toISOString(),
    stability: updated.stability,
    difficulty: updated.difficulty,
    elapsedDays: updated.elapsed_days,
    scheduledDays: updated.scheduled_days,
    reps: updated.reps,
    lapses: updated.lapses,
  };
}
