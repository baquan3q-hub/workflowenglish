/**
 * Reads and writes `learning_profiles` (migration 015). Before the migration is
 * applied a learner simply has an empty profile; saving says what is missing.
 */
import { isMissingTable } from './listeningLibraryLogic';
import { EMPTY_PROFILE, profileSummary, sanitizeProfile, type LearningProfile } from './learningProfileLogic';
import { supabase } from './supabaseClient';
import { setLearnerSummary } from './learnerContext';

const TABLE = 'learning_profiles';

/** Kept for this visit so every AI call does not read the table again. */
let cached: { userId: string; profile: LearningProfile } | null = null;

export async function getLearningProfile(userId: string): Promise<LearningProfile> {
  if (!userId) return { ...EMPTY_PROFILE };
  if (cached?.userId === userId) return cached.profile;
  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error) {
    if (!isMissingTable(error.message)) console.warn('[Profile] could not load:', error.message);
    return { ...EMPTY_PROFILE };
  }
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
