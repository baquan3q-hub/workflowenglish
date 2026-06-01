/**
 * Recommendation Service — Gemini-powered word suggestions with localStorage cache.
 *
 * Surfaces personalised vocabulary recommendations on the Dashboard. The
 * heavy lifting is done by Gemini; this module wraps that call with a
 * 24-hour localStorage cache (keyed per user) and provides the helpers
 * that compose the prompt (top studied topics, mastered word list).
 *
 * See `.kiro/specs/personalized-learning/requirements.md` Requirement 5
 * and `design.md` "Phase 3: AI-Enhanced Components" for context.
 */

import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { supabase } from './supabaseClient';
import { MasteryLevel, type WordRecommendation } from '../types';

// --- Constants -------------------------------------------------------------

/** Cache TTL: 24 hours, per requirement 5.4. */
export const RECOMMENDATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** localStorage key prefix; full key is `${PREFIX}${userId}`. */
const CACHE_KEY_PREFIX = 'vocabmaster_recommendations_';

/** Number of recommendations the model is asked to produce. */
const RECOMMENDATION_COUNT = 10;

/**
 * Cap the number of mastered words sent to the model. Sending the full
 * list would balloon the prompt unnecessarily; the most-recent words are
 * the ones the user is least likely to want re-suggested.
 */
const MAX_MASTERED_WORDS_IN_PROMPT = 50;

/** Number of distinct topics returned by `getTopStudiedTopics`. */
const TOP_TOPIC_COUNT = 3;

// --- Gemini setup ----------------------------------------------------------

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';

const recommendationSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      meaningVietnamese: { type: Type.STRING },
      cefrLevel: { type: Type.STRING },
      topic: { type: Type.STRING },
      relevanceReason: { type: Type.STRING },
    },
    required: [
      'word',
      'meaningVietnamese',
      'cefrLevel',
      'topic',
      'relevanceReason',
    ],
  },
};

// --- Cache (localStorage) --------------------------------------------------

interface CachedPayload {
  timestamp: number; // ms since epoch when cached
  recommendations: WordRecommendation[];
}

function cacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    // localStorage can throw in private mode or sandboxed contexts.
    return null;
  }
}

/**
 * Return cached recommendations for `userId` if they exist and are fresh
 * (within {@link RECOMMENDATION_CACHE_TTL_MS}). Returns `null` on miss,
 * expiry, or any parsing/storage error.
 */
export function getCachedRecommendations(
  userId: string,
): WordRecommendation[] | null {
  const storage = safeLocalStorage();
  if (!storage) return null;

  const raw = storage.getItem(cacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedPayload;
    if (
      !parsed ||
      typeof parsed.timestamp !== 'number' ||
      !Array.isArray(parsed.recommendations)
    ) {
      return null;
    }

    const age = Date.now() - parsed.timestamp;
    if (age < 0 || age > RECOMMENDATION_CACHE_TTL_MS) {
      // Clean up stale entry opportunistically.
      storage.removeItem(cacheKey(userId));
      return null;
    }

    return parsed.recommendations;
  } catch {
    return null;
  }
}

/**
 * Persist `recs` for `userId` along with the current timestamp. Silently
 * no-ops when localStorage is unavailable (e.g. SSR, private browsing).
 */
export function cacheRecommendations(
  userId: string,
  recs: WordRecommendation[],
): void {
  const storage = safeLocalStorage();
  if (!storage) return;

  const payload: CachedPayload = {
    timestamp: Date.now(),
    recommendations: recs,
  };

  try {
    storage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    // Quota exceeded or serialization error — fall through silently.
  }
}

/**
 * Remove any cached recommendations for `userId`. Used by the
 * "Làm mới gợi ý" button on the Dashboard.
 */
export function clearRecommendationCache(userId: string): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(cacheKey(userId));
  } catch {
    // Ignore.
  }
}

// --- Supabase queries ------------------------------------------------------

/**
 * Return the user's top {@link TOP_TOPIC_COUNT} most-studied topics from
 * `learning_history`, ordered by frequency (most frequent first). Topics
 * are returned in their original casing as recorded in lessons.
 *
 * Empty / whitespace-only topics are ignored.
 */
export async function getTopStudiedTopics(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('learning_history')
    .select('topic')
    .eq('user_id', userId);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const topic = (row as { topic: string | null }).topic;
    if (!topic) continue;
    const trimmed = topic.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TOPIC_COUNT)
    .map(([topic]) => topic);
}

/**
 * Return the list of words the user has fully mastered
 * (mastery_level === MASTERED). Used to tell Gemini what NOT to suggest.
 */
export async function getMasteredWordsList(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('word_mastery')
    .select('word, last_reviewed_at')
    .eq('user_id', userId)
    .eq('mastery_level', MasteryLevel.MASTERED)
    .order('last_reviewed_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => (row as { word: string }).word)
    .filter((w): w is string => typeof w === 'string' && w.length > 0);
}

// --- Gemini call -----------------------------------------------------------

function buildPrompt(
  topTopics: string[],
  currentLevel: string,
  masteredWords: string[],
): string {
  const topicsText = topTopics.length > 0 ? topTopics.join(', ') : 'general';
  const wordsText = masteredWords.length > 0 ? masteredWords.join(', ') : 'none';

  return `Suggest ${RECOMMENDATION_COUNT} English vocabulary words for a Vietnamese learner at ${currentLevel} level, related to topics: ${topicsText}. Exclude these already-known words: ${wordsText}. Return JSON array with: word, meaningVietnamese, cefrLevel, topic, relevanceReason (in Vietnamese).`;
}

async function callGemini(prompt: string): Promise<string> {
  const config = {
    responseMimeType: 'application/json',
    responseSchema: recommendationSchema,
    thinkingConfig: { thinkingBudget: 0 },
  };

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config,
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from primary model');
    return text;
  } catch (primaryError) {
    // Fall back to the stable model if the preview model is unavailable.
    console.warn(
      `Recommendation primary model "${PRIMARY_MODEL}" failed, falling back to "${FALLBACK_MODEL}":`,
      primaryError,
    );
    const response = await ai.models.generateContent({
      model: FALLBACK_MODEL,
      contents: prompt,
      config,
    });
    const text = response.text;
    if (!text) throw new Error('Empty response from fallback model');
    return text;
  }
}

/**
 * Generate fresh recommendations via Gemini. Does NOT touch the cache —
 * callers are responsible for combining this with
 * `getCachedRecommendations` / `cacheRecommendations` as appropriate.
 *
 * @param topTopics      up to 3 topics the user has been studying
 * @param currentLevel   CEFR level (e.g. "B1")
 * @param masteredWords  words to exclude; capped at 50 most recent
 */
export async function generateRecommendations(
  topTopics: string[],
  currentLevel: string,
  masteredWords: string[],
): Promise<WordRecommendation[]> {
  const limitedMastered = masteredWords.slice(0, MAX_MASTERED_WORDS_IN_PROMPT);
  const prompt = buildPrompt(topTopics, currentLevel, limitedMastered);

  const text = await callGemini(prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse recommendation JSON: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Recommendation response was not a JSON array');
  }

  const recommendations: WordRecommendation[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (
      typeof r.word === 'string' &&
      typeof r.meaningVietnamese === 'string' &&
      typeof r.cefrLevel === 'string' &&
      typeof r.topic === 'string' &&
      typeof r.relevanceReason === 'string'
    ) {
      recommendations.push({
        word: r.word,
        meaningVietnamese: r.meaningVietnamese,
        cefrLevel: r.cefrLevel,
        topic: r.topic,
        relevanceReason: r.relevanceReason,
      });
    }
  }

  return recommendations;
}
