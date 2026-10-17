-- =============================================================================
-- Migration: 005_review_logs
-- Feature: Upgrade plan v3 — Phase 0 (foundation)
-- Plan: docs/upgrade-plan-v3.md (section 1)
-- Description:
--   1. `review_logs`: append-only log of every rating / answer event, so
--      analytics can count activity per day, compute retention and show a
--      word's review timeline (word_mastery only keeps the latest review).
--   2. `word_mastery.personal_note` and `word_mastery.is_suspended` for the
--      flashcard notes and SRS word library features (phases 1–2).
--
-- Safe to re-run. The app keeps working before this migration is applied:
-- writing to review_logs is best-effort and is skipped if the table is missing.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table: review_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_logs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    word_mastery_id  UUID         REFERENCES public.word_mastery(id) ON DELETE CASCADE,
    word             TEXT         NOT NULL,
    source           TEXT         NOT NULL CHECK (source IN (
                         'lesson_flashcard', 'review', 'quiz', 'fill_blank',
                         'spelling', 'handwriting', 'sentence', 'manual')),
    -- 0 Again, 1 Hard, 2 Good, 3 Easy. NULL for manual status changes.
    rating           SMALLINT     CHECK (rating BETWEEN 0 AND 3),
    level_before     SMALLINT,
    level_after      SMALLINT,
    interval_before  REAL,
    interval_after   REAL,
    -- Time from showing the card to answering (thinking time), if measured.
    duration_ms      INTEGER      CHECK (duration_ms IS NULL OR duration_ms >= 0),
    reviewed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed
    ON public.review_logs (user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_logs_word_reviewed
    ON public.review_logs (word_mastery_id, reviewed_at DESC);

-- -----------------------------------------------------------------------------
-- Row Level Security: users read and append their own logs. No UPDATE policy
-- (the log is append-only); DELETE is allowed so a user can clear their data.
-- -----------------------------------------------------------------------------
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own review logs"   ON public.review_logs;
DROP POLICY IF EXISTS "Users can insert own review logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can delete own review logs" ON public.review_logs;

CREATE POLICY "Users can view own review logs"
    ON public.review_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review logs"
    ON public.review_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own review logs"
    ON public.review_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- word_mastery: personal notes and suspension
-- -----------------------------------------------------------------------------
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS personal_note TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================================================
-- End of migration 005_review_logs
-- =============================================================================
