-- =============================================================================
-- Migration: 001_personalized_learning
-- Feature: Personalized Learning (Phase 1 — Core SRS Foundation)
-- Spec: .kiro/specs/personalized-learning
-- Description: Adds tables `word_mastery` and `user_goals` to support
--              per-word mastery tracking (SRS / SM-2 algorithm) and user
--              learning goals + streaks. Includes indexes and Row Level
--              Security (RLS) policies so users can only access their own
--              data.
-- =============================================================================

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table: word_mastery
-- One row per (user, word). Tracks SM-2 SRS state and quiz outcomes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.word_mastery (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    word                TEXT         NOT NULL,
    -- 0=New, 1=Learning, 2=Reviewing, 3=Mastered, 4=Lapsed
    mastery_level       INTEGER      NOT NULL DEFAULT 0,
    easiness_factor     REAL         NOT NULL DEFAULT 2.5,
    interval_days       REAL         NOT NULL DEFAULT 0,
    repetition_count    INTEGER      NOT NULL DEFAULT 0,
    next_review_date    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_reviewed_at    TIMESTAMPTZ,
    correct_count       INTEGER      NOT NULL DEFAULT 0,
    incorrect_count     INTEGER      NOT NULL DEFAULT 0,
    -- Array of { question, userAnswer, correctAnswer, timestamp }
    incorrect_contexts  JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT word_mastery_user_word_unique UNIQUE (user_id, word)
);

-- Indexes to support common queries
CREATE INDEX IF NOT EXISTS idx_word_mastery_user_review
    ON public.word_mastery (user_id, next_review_date);

CREATE INDEX IF NOT EXISTS idx_word_mastery_user_level
    ON public.word_mastery (user_id, mastery_level);

-- -----------------------------------------------------------------------------
-- Table: user_goals
-- One row per user. Tracks daily goal, streaks, and preferred CEFR level.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_goals (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID         NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    daily_word_goal          INTEGER      NOT NULL DEFAULT 10,
    current_streak           INTEGER      NOT NULL DEFAULT 0,
    longest_streak           INTEGER      NOT NULL DEFAULT 0,
    last_active_date         DATE,
    words_reviewed_today     INTEGER      NOT NULL DEFAULT 0,
    last_review_reset_date   DATE,
    preferred_level          TEXT         NOT NULL DEFAULT 'B1',
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- updated_at trigger function (shared)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_word_mastery_set_updated_at ON public.word_mastery;
CREATE TRIGGER trg_word_mastery_set_updated_at
    BEFORE UPDATE ON public.word_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_goals_set_updated_at ON public.user_goals;
CREATE TRIGGER trg_user_goals_set_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Users may only read/write rows that belong to them (auth.uid() = user_id).
-- -----------------------------------------------------------------------------
ALTER TABLE public.word_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals   ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own word mastery"   ON public.word_mastery;
DROP POLICY IF EXISTS "Users can insert own word mastery" ON public.word_mastery;
DROP POLICY IF EXISTS "Users can update own word mastery" ON public.word_mastery;
DROP POLICY IF EXISTS "Users can delete own word mastery" ON public.word_mastery;

CREATE POLICY "Users can view own word mastery"
    ON public.word_mastery
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word mastery"
    ON public.word_mastery
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word mastery"
    ON public.word_mastery
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own word mastery"
    ON public.word_mastery
    FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own goals"   ON public.user_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.user_goals;

CREATE POLICY "Users can view own goals"
    ON public.user_goals
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
    ON public.user_goals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
    ON public.user_goals
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
    ON public.user_goals
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- End of migration 001_personalized_learning
-- =============================================================================
