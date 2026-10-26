-- =============================================================================
-- Migration: 015_learning_profile
-- Feature: Hồ sơ học tập (learning profile) for AI personalisation
-- Description:
--   learning_profiles keeps what a learner tells the app about themself (goal,
--   level, job, interests, weak areas, minutes a day, a note for the AI) as one
--   JSON object. It is a table of its own rather than a column on `profiles`,
--   so it stays private even where `profiles` is readable by other users.
--   Each user reads and writes only their own row.
--
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.learning_profiles (
    user_id     UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    data        JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object'),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_profiles_select_own" ON public.learning_profiles;
CREATE POLICY "learning_profiles_select_own" ON public.learning_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_profiles_insert_own" ON public.learning_profiles;
CREATE POLICY "learning_profiles_insert_own" ON public.learning_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_profiles_update_own" ON public.learning_profiles;
CREATE POLICY "learning_profiles_update_own" ON public.learning_profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_profiles_delete_own" ON public.learning_profiles;
CREATE POLICY "learning_profiles_delete_own" ON public.learning_profiles
    FOR DELETE USING (auth.uid() = user_id);
