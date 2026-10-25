-- =============================================================================
-- Migration: 014_writing
-- Feature: IELTS Writing library and AI prompts
-- Description:
--   1. writing_library: Writing prompts written on the admin page. One row is
--      one prompt (`question` is the app's prompt shape: type, topic, prompt,
--      chart data for Task 1). Learners see published prompts only; admins
--      (app_admins, migration 011) see and change every row.
--   2. writing_generated: prompts the AI wrote for one learner. Each user
--      sees and changes only their own rows.
--
-- Needs 011 (app_admins, is_app_admin, listening_library_touch). Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --- 1. Writing library ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.writing_library (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    kind        TEXT         NOT NULL CHECK (kind IN ('task_1', 'task_2')),
    status      TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    question    JSONB        NOT NULL CHECK (jsonb_typeof(question) = 'object'),
    created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_writing_library_status_time ON public.writing_library (status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_writing_library_touch ON public.writing_library;
CREATE TRIGGER trg_writing_library_touch
    BEFORE INSERT OR UPDATE ON public.writing_library
    FOR EACH ROW EXECUTE FUNCTION public.listening_library_touch();

ALTER TABLE public.writing_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "writing_library_select" ON public.writing_library;
CREATE POLICY "writing_library_select" ON public.writing_library
    FOR SELECT USING (status = 'published' OR public.is_app_admin());

DROP POLICY IF EXISTS "writing_library_insert_admin" ON public.writing_library;
CREATE POLICY "writing_library_insert_admin" ON public.writing_library
    FOR INSERT WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "writing_library_update_admin" ON public.writing_library;
CREATE POLICY "writing_library_update_admin" ON public.writing_library
    FOR UPDATE USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "writing_library_delete_admin" ON public.writing_library;
CREATE POLICY "writing_library_delete_admin" ON public.writing_library
    FOR DELETE USING (public.is_app_admin());

-- --- 2. Prompts the AI wrote for one learner ------------------------------------------

CREATE TABLE IF NOT EXISTS public.writing_generated (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task        TEXT         NOT NULL CHECK (task IN ('task_1', 'task_2')),
    topic       TEXT,
    difficulty  TEXT         NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question    JSONB        NOT NULL CHECK (jsonb_typeof(question) = 'object'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_writing_generated_user_time ON public.writing_generated (user_id, created_at DESC);

ALTER TABLE public.writing_generated ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "writing_generated_select_own" ON public.writing_generated;
CREATE POLICY "writing_generated_select_own" ON public.writing_generated
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "writing_generated_insert_own" ON public.writing_generated;
CREATE POLICY "writing_generated_insert_own" ON public.writing_generated
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "writing_generated_delete_own" ON public.writing_generated;
CREATE POLICY "writing_generated_delete_own" ON public.writing_generated
    FOR DELETE USING (auth.uid() = user_id);
