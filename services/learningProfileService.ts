/**
 * Reads and writes `learning_profiles` (migration 015). Before the migration is
 * applied a learner simply has an empty profile; saving says what is missing.
 */
import { isMissingTable } from './listeningLibraryLogic';
import { EMPTY_PROFILE, profileSummary, sanitizeProfile, type LearningProfile } from './learningProfileLogic';
import { supabase } from './supabaseClient';
import { setLearnerSummary } from './learnerContext';
import { clearRecommendationCache } from './recommendationService';

const TABLE = 'learning_profiles';

/** Kept for this visit so every AI call does not read the table again. */
let cached: { userId: string; profile: LearningProfile } | null = null;

/** False once a read found the table missing (migration 015 not run): saving cannot work yet. */
let available = true;
export const learningProfileAvailable = () => available;

export async function getLearningProfile(userId: string): Promise<LearningProfile> {
  if (!userId) return { ...EMPTY_PROFILE };
  if (cached?.userId === userId) return cached.profile;
  // Another account (or none) until this read succeeds: its summary must not reach the AI.
  cached = null;
  setLearnerSummary('');
  let result;
  try {
    result = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  } catch (err) {
    console.warn('[Profile] could not load:', err);
    return { ...EMPTY_PROFILE };
  }
  const { data, error } = result;
  if (error) {
    if (isMissingTable(error.message)) available = false;
    else console.warn('[Profile] could not load:', error.message);
    return { ...EMPTY_PROFILE };
  }
  available = true;
  const profile = sanitizeProfile((data as { data?: unknown } | null)?.data);
  cached = { userId, profile };
  setLearnerSummary(profileSummary(profile));
  return profile;
}

/** Stores the profile; throws with a message for the learner. */
export async function saveLearningProfile(userId: string, profile: LearningProfile): Promise<LearningProfile> {
  const clean = sanitizeProfile(profile);
  const { error } = await supabase.from(TABLE).upsert({ user_id: userId, data: clean, updated_at: new Date().toISOString() });
  if (error) {
    throw new Error(
      isMissingTable(error.message) ? 'Chưa chạy migration 015 (docs/migrations/015_learning_profile.sql) trong Supabase SQL Editor.' : `Chưa lưu được hồ sơ: ${error.message}`,
    );
  }
  cached = { userId, profile: clean };
  setLearnerSummary(profileSummary(clean));
  // Suggestions were made for the old profile.
  clearRecommendationCache(userId);
  return clean;
}

/** The learner summary for AI payloads; '' when there is none or it cannot be read. */
export async function learnerSummary(userId: string): Promise<string> {
  try {
    return profileSummary(await getLearningProfile(userId));
  } catch {
    return '';
  }
}

/** Forget the cached profile (sign-out, tests). */
export function clearLearningProfileCache() {
  cached = null;
  setLearnerSummary('');
}
