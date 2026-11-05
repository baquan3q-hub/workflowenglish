-- =============================================================================
-- Migration: 018_review_xp
-- Feature: IELTS review games (Vườn ôn tập, XP, combo)
-- Description:
--   review_game_profiles: one row per learner with the review-game XP, so it
--   follows the learner to other devices and survives a cleared browser.
--   total_xp, best_combo, XP per day for the last 14 days (days), records per
--   game (best) and the "effects off" choice (quiet).
--
--   Which items already paid XP today stays on the device only.
--
-- Users see and change only their own row. Safe to re-run. Before it is
-- applied XP is kept on the device only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.review_game_profiles (
    user_id     UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp    INTEGER      NOT NULL DEFAULT 0 CHECK (total_xp BETWEEN 0 AND 100000000),
    best_combo  INTEGER      NOT NULL DEFAULT 0 CHECK (best_combo BETWEEN 0 AND 100000),
    -- {"2026-11-05": 40, ...}
    days        JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(days) = 'object' AND pg_column_size(days) < 4096),
    -- {"tfng": 80, "paraphrase-ms": 41000, ...}
    best        JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(best) = 'object' AND pg_column_size(best) < 4096),
    quiet       BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.review_game_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_game_profiles_select_own" ON public.review_game_profiles;
CREATE POLICY "review_game_profiles_select_own" ON public.review_game_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "review_game_profiles_insert_own" ON public.review_game_profiles;
CREATE POLICY "review_game_profiles_insert_own" ON public.review_game_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "review_game_profiles_update_own" ON public.review_game_profiles;
CREATE POLICY "review_game_profiles_update_own" ON public.review_game_profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
