/**
 * Per-user UI preferences, kept in localStorage (same per-user keying as
 * draftService). These are conveniences, not data: a missing, corrupt or
 * blocked store simply yields the defaults, and every stored value is
 * validated on read so an old or hand-edited entry can't break a screen.
 */

export const REVIEW_SESSION_SIZES = [10, 20, 30, 50] as const;
export type ReviewSessionSize = (typeof REVIEW_SESSION_SIZES)[number];

export const REVIEW_MODES = ['auto', 'flip', 'typing', 'handwriting'] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

export interface UserPreferences {
  /** Cards per review session. */
  reviewSessionSize: ReviewSessionSize;
  /** How review cards are answered; `auto` picks per word. */
  reviewMode: ReviewMode;
  /** Lesson flashcards: type the word before the card can be flipped. */
  requireTypingBeforeFlip: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = Object.freeze({
  reviewSessionSize: 20,
  reviewMode: 'auto',
  requireTypingBeforeFlip: false,
});

const KEY_PREFIX = 'vocabmaster-prefs:';
const prefsKey = (userId: string) => `${KEY_PREFIX}${userId}`;

/** Keep only known keys with valid values; everything else falls back to the default. */
export function sanitizePreferences(raw: unknown): UserPreferences {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const size = src.reviewSessionSize;
  const mode = src.reviewMode;
  return {
    reviewSessionSize: (REVIEW_SESSION_SIZES as readonly unknown[]).includes(size)
      ? (size as ReviewSessionSize)
      : DEFAULT_PREFERENCES.reviewSessionSize,
    reviewMode: (REVIEW_MODES as readonly unknown[]).includes(mode)
      ? (mode as ReviewMode)
      : DEFAULT_PREFERENCES.reviewMode,
    requireTypingBeforeFlip:
      typeof src.requireTypingBeforeFlip === 'boolean'
        ? src.requireTypingBeforeFlip
        : DEFAULT_PREFERENCES.requireTypingBeforeFlip,
  };
}

export function getPreferences(userId: string): UserPreferences {
  if (!userId) return { ...DEFAULT_PREFERENCES };
  try {
    const stored = localStorage.getItem(prefsKey(userId));
    return sanitizePreferences(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Merge `patch` into the stored preferences and return the result. The
 * returned value is valid even if saving failed (e.g. storage blocked).
 */
export function setPreferences(userId: string, patch: Partial<UserPreferences>): UserPreferences {
  const next = sanitizePreferences({ ...getPreferences(userId), ...patch });
  if (!userId) return next;
  try {
    localStorage.setItem(prefsKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep the in-memory value only.
  }
  return next;
}
