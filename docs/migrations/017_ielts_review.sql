-- =============================================================================
-- Migration: 017_ielts_review
-- Feature: IELTS review module (Ôn tập)
-- Description:
--   1. translation_attempts: one row per graded sentence of "Viết từng câu"
--      (Writing by translation). Feeds the learner's level and the review of
--      missed sentences.
--   2. translation_sets: translation sets the AI wrote for one learner from a
--      Writing prompt.
--   3. speaking_answers: the learner's own Speaking answers (ideas, the AI
--      answer, keywords, follow-ups) and their review schedule.
--   4. dictation_exercises: dictation on outside media (YouTube or an audio
--      link). A learner's rows are private; admins publish rows for everyone.
--   5. dictation_progress: where each learner is in each dictation exercise.
--
-- Every table: users see and change only their own rows, except published
-- dictation exercises, which everyone reads. Needs 011 (app_admins,
-- is_app_admin). Safe to re-run. Before it is applied the features still work
-- on the device; nothing is kept on the account.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --- 1. Graded translation sentences ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.translation_attempts (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    set_id       TEXT         NOT NULL CHECK (char_length(set_id) BETWEEN 1 AND 80),
    sentence_id  TEXT         NOT NULL CHECK (char_length(sentence_id) BETWEEN 1 AND 40),
    mode         TEXT         NOT NULL DEFAULT 'translate' CHECK (mode IN ('translate', 'upgrade')),
    target_band  NUMERIC(2,1) NOT NULL CHECK (target_band BETWEEN 4 AND 9),
    prompt_vi    TEXT         NOT NULL,
    answer       TEXT         NOT NULL,
    score        SMALLINT     CHECK (score BETWEEN 0 AND 100),
    band         NUMERIC(2,1) CHECK (band BETWEEN 4 AND 9),
    verdict      TEXT         CHECK (verdict IN ('correct', 'acceptable', 'incorrect')),
    hints_used   SMALLINT     NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 5),
    -- {corrected, errors[], upgrade, explanationVi}
    feedback     JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translation_attempts_user_time ON public.translation_attempts (user_id, created_at DESC);

ALTER TABLE public.translation_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translation_attempts_select_own" ON public.translation_attempts;
CREATE POLICY "translation_attempts_select_own" ON public.translation_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "translation_attempts_insert_own" ON public.translation_attempts;
CREATE POLICY "translation_attempts_insert_own" ON public.translation_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "translation_attempts_delete_own" ON public.translation_attempts;
CREATE POLICY "translation_attempts_delete_own" ON public.translation_attempts
    FOR DELETE USING (auth.uid() = user_id);

-- --- 2. AI-written translation sets -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.translation_sets (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task        TEXT         NOT NULL CHECK (task IN ('task_1', 'task_2')),
    prompt      TEXT         NOT NULL,
    body        JSONB        NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translation_sets_user_time ON public.translation_sets (user_id, created_at DESC);

ALTER TABLE public.translation_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translation_sets_select_own" ON public.translation_sets;
CREATE POLICY "translation_sets_select_own" ON public.translation_sets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "translation_sets_insert_own" ON public.translation_sets;
CREATE POLICY "translation_sets_insert_own" ON public.translation_sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "translation_sets_delete_own" ON public.translation_sets;
CREATE POLICY "translation_sets_delete_own" ON public.translation_sets
    FOR DELETE USING (auth.uid() = user_id);

-- --- 3. The learner's Speaking answers --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.speaking_answers (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Stable key of the question (bank id or a hash of the text), one answer per question.
    question_key  TEXT         NOT NULL CHECK (char_length(question_key) BETWEEN 1 AND 120),
    part          TEXT         NOT NULL CHECK (part IN ('part_1', 'part_2', 'part_3')),
    question      TEXT         NOT NULL,
    -- {frame, ideas[], notes, built{answer, keywords, moves, vocabulary, followUps, ...}, edited, versions[]}
    body          JSONB        NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    stage         SMALLINT     NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 5),
    practice_count INTEGER     NOT NULL DEFAULT 0,
    due_at        TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_speaking_answers_user_due ON public.speaking_answers (user_id, due_at);

ALTER TABLE public.speaking_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speaking_answers_select_own" ON public.speaking_answers;
CREATE POLICY "speaking_answers_select_own" ON public.speaking_answers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "speaking_answers_insert_own" ON public.speaking_answers;
CREATE POLICY "speaking_answers_insert_own" ON public.speaking_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "speaking_answers_update_own" ON public.speaking_answers;
CREATE POLICY "speaking_answers_update_own" ON public.speaking_answers
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "speaking_answers_delete_own" ON public.speaking_answers;
CREATE POLICY "speaking_answers_delete_own" ON public.speaking_answers
    FOR DELETE USING (auth.uid() = user_id);

-- --- 4. Dictation on outside media ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dictation_exercises (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title       TEXT         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    status      TEXT         NOT NULL DEFAULT 'private' CHECK (status IN ('private', 'published')),
    category    TEXT         NOT NULL DEFAULT 'other',
    level       TEXT         NOT NULL DEFAULT 'B1' CHECK (level IN ('A2', 'B1', 'B2', 'C1')),
    -- {source{kind, videoId|url}, sentences[{id, text, start, end}], credit}
    body        JSONB        NOT NULL CHECK (jsonb_typeof(body) = 'object'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dictation_exercises_status ON public.dictation_exercises (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dictation_exercises_owner ON public.dictation_exercises (owner_id, updated_at DESC);

ALTER TABLE public.dictation_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dictation_exercises_select" ON public.dictation_exercises;
CREATE POLICY "dictation_exercises_select" ON public.dictation_exercises
    FOR SELECT USING (status = 'published' OR auth.uid() = owner_id OR public.is_app_admin());

-- Learners add private rows; only admins publish.
DROP POLICY IF EXISTS "dictation_exercises_insert" ON public.dictation_exercises;
CREATE POLICY "dictation_exercises_insert" ON public.dictation_exercises
    FOR INSERT WITH CHECK (auth.uid() = owner_id AND (status = 'private' OR public.is_app_admin()));

DROP POLICY IF EXISTS "dictation_exercises_update" ON public.dictation_exercises;
CREATE POLICY "dictation_exercises_update" ON public.dictation_exercises
    FOR UPDATE USING (auth.uid() = owner_id OR public.is_app_admin())
    WITH CHECK ((auth.uid() = owner_id AND status = 'private') OR public.is_app_admin());

DROP POLICY IF EXISTS "dictation_exercises_delete" ON public.dictation_exercises;
CREATE POLICY "dictation_exercises_delete" ON public.dictation_exercises
    FOR DELETE USING (auth.uid() = owner_id OR public.is_app_admin());

-- --- 5. Progress in each exercise ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dictation_progress (
    user_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exercise_key  TEXT         NOT NULL CHECK (char_length(exercise_key) BETWEEN 1 AND 80),
    -- {best{sentenceId: 0-100}, revealed[], index}
    progress      JSONB        NOT NULL CHECK (jsonb_typeof(progress) = 'object'),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, exercise_key)
);

ALTER TABLE public.dictation_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dictation_progress_select_own" ON public.dictation_progress;
CREATE POLICY "dictation_progress_select_own" ON public.dictation_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dictation_progress_insert_own" ON public.dictation_progress;
CREATE POLICY "dictation_progress_insert_own" ON public.dictation_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dictation_progress_update_own" ON public.dictation_progress;
CREATE POLICY "dictation_progress_update_own" ON public.dictation_progress
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dictation_progress_delete_own" ON public.dictation_progress;
CREATE POLICY "dictation_progress_delete_own" ON public.dictation_progress
    FOR DELETE USING (auth.uid() = user_id);
