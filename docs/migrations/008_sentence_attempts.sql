-- =============================================================================
-- Migration: 008_sentence_attempts
-- Feature: Upgrade plan v3 — Phase 5 (Luyện câu)
-- Plan: docs/upgrade-plan-v3.md (section 4.4)
-- Description:
--   One row per graded sentence. Feeds "Luyện lại câu sai" on the dashboard
--   (latest attempt per sentence still "incorrect") and the accuracy eval.
--   reference_answers is kept so a wrong sentence can be practised again
--   outside its lesson.
--
-- Safe to re-run. Before it is applied, practice still works; attempts are
-- just not saved and the dashboard shows no wrong sentences.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.sentence_attempts (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_record_id   UUID         REFERENCES public.learning_history(id) ON DELETE SET NULL,
    target_words       TEXT[]       NOT NULL,
    reference_answers  TEXT[],
    prompt_vi          TEXT         NOT NULL,
    user_answer        TEXT         NOT NULL,
    verdict            TEXT         CHECK (verdict IN ('correct', 'acceptable', 'incorrect')),
    score              SMALLINT     CHECK (score BETWEEN 0 AND 100),
    corrected          TEXT,
    -- [{original, corrected, category, explanationVi}]
    errors             JSONB,
    -- 'local' (matched a reference) or 'ai'
    graded_by          TEXT,
    latency_ms         INTEGER,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentence_attempts_user_time ON public.sentence_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentence_attempts_lesson ON public.sentence_attempts (lesson_record_id);

ALTER TABLE public.sentence_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sentence_attempts_select_own" ON public.sentence_attempts;
CREATE POLICY "sentence_attempts_select_own" ON public.sentence_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sentence_attempts_insert_own" ON public.sentence_attempts;
CREATE POLICY "sentence_attempts_insert_own" ON public.sentence_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sentence_attempts_delete_own" ON public.sentence_attempts;
CREATE POLICY "sentence_attempts_delete_own" ON public.sentence_attempts
    FOR DELETE USING (auth.uid() = user_id);
