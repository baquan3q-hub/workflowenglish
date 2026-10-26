-- =============================================================================
-- Migration: 016_daily_goals
-- Feature: "Mục tiêu hôm nay" on the Learn page hero
-- Description:
--   daily_goals keeps the goals a learner writes for one day ("Đọc bài EdTech",
--   "Tập thể dục"), with a pastel tone and a done flag. `day` is the learner's
--   own calendar day (YYYY-MM-DD in their local time). The app's automatic goals
--   (review, IELTS) are computed from existing data and are not stored here.
--   Each user reads and writes only their own rows.
--
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_goals (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day         DATE         NOT NULL,
    title       TEXT         NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
    tone        TEXT         NOT NULL DEFAULT 'lavender'
                             CHECK (tone IN ('sky', 'mint', 'lavender', 'peach', 'butter', 'blush')),
    done        BOOLEAN      NOT NULL DEFAULT FALSE,
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_goals_user_day_idx ON public.daily_goals (user_id, day);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_goals_select_own" ON public.daily_goals;
CREATE POLICY "daily_goals_select_own" ON public.daily_goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_goals_insert_own" ON public.daily_goals;
CREATE POLICY "daily_goals_insert_own" ON public.daily_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_goals_update_own" ON public.daily_goals;
CREATE POLICY "daily_goals_update_own" ON public.daily_goals
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_goals_delete_own" ON public.daily_goals;
CREATE POLICY "daily_goals_delete_own" ON public.daily_goals
    FOR DELETE USING (auth.uid() = user_id);
