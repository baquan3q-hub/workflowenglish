/**
 * Where Reading review keeps its schedule: on this device. Misses are read
 * again from the learner's saved Reading attempts (ielts_attempts), so a new
 * device rebuilds the deck from them.
 */
import { getIeltsAttempts } from './ieltsAttemptService';
import { dueCards, emptyDeck, sanitizeDeck, type AttemptLike, type ReviewDeck } from './readingReviewLogic';

export interface ReadingReviewApi {
  loadDeck(userId: string): ReviewDeck;
  saveDeck(userId: string, deck: ReviewDeck): void;
  loadAttempts(userId: string): Promise<AttemptLike[]>;
}

const DECK_KEY = 'ielts-reading-review:v1:';

export const readingReviewApi: ReadingReviewApi = {
  loadDeck(userId) {
    try {
      return sanitizeDeck(JSON.parse(localStorage.getItem(DECK_KEY + userId) ?? 'null'));
    } catch {
      return emptyDeck();
    }
  },
  saveDeck(userId, deck) {
    try {
      localStorage.setItem(DECK_KEY + userId, JSON.stringify(deck));
    } catch {
      // Storage full or blocked: keep it for this visit.
    }
  },
  loadAttempts: (userId) => (userId ? getIeltsAttempts(userId, 'reading', 30) : Promise.resolve([])),
};

/** Missed questions due today, for the badge on the Reading hub. */
export const readingReviewDue = (userId: string, now = new Date()) => dueCards(readingReviewApi.loadDeck(userId), now).length;
