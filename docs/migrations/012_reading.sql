-- =============================================================================
-- Migration: 012_reading
-- Feature: IELTS roadmap — Phase R1 (IELTS Reading Academic)
-- Description:
--   1. ielts_attempts.skill also accepts 'reading'.
--   2. reading_library: Reading tests written on the admin page. `passages`
--      is an array in the app's ReadingPassage shape. Learners see published
--      tests only; admins (app_admins, migration 011) see and change every row.
--   3. reading_generated: passages the AI wrote for one learner. Each user
--      sees and changes only their own rows.
--
-- Needs 011 (app_admins, is_app_admin). Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Allow the reading skill. Drop whichever check mentions the skill column
--    (009 named it ielts_attempts_skill_check; older databases may differ).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ielts_attempts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%skill%'
  LOOP
    EXECUTE format('ALTER TABLE public.ielts_attempts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.ielts_attempts
  ADD CONSTRAINT ielts_attempts_skill_check
  CHECK (skill IN ('listening', 'reading', 'writing', 'speaking'));

COMMENT ON COLUMN public.ielts_attempts.skill IS 'listening, reading, writing or speaking';

-- --- 2. Reading library -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reading_library (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    kind            TEXT         NOT NULL CHECK (kind IN ('full', 'practice')),
    status          TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    description_vi  TEXT         NOT NULL DEFAULT '',
    passages        JSONB        NOT NULL CHECK (jsonb_typeof(passages) = 'array'),
    created_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reading_library_status_time ON public.reading_library (status, updated_at DESC);

-- Same timestamps rule as listening_library (011).
DROP TRIGGER IF EXISTS trg_reading_library_touch ON public.reading_library;
CREATE TRIGGER trg_reading_library_touch
    BEFORE INSERT OR UPDATE ON public.reading_library
    FOR EACH ROW EXECUTE FUNCTION public.listening_library_touch();

ALTER TABLE public.reading_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_library_select" ON public.reading_library;
CREATE POLICY "reading_library_select" ON public.reading_library
    FOR SELECT USING (status = 'published' OR public.is_app_admin());

DROP POLICY IF EXISTS "reading_library_insert_admin" ON public.reading_library;
CREATE POLICY "reading_library_insert_admin" ON public.reading_library
    FOR INSERT WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "reading_library_update_admin" ON public.reading_library;
CREATE POLICY "reading_library_update_admin" ON public.reading_library
    FOR UPDATE USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "reading_library_delete_admin" ON public.reading_library;
CREATE POLICY "reading_library_delete_admin" ON public.reading_library
    FOR DELETE USING (public.is_app_admin());

-- --- 3. Passages the AI wrote for one learner (same shape as listening_sections, 010) ---

CREATE TABLE IF NOT EXISTS public.reading_generated (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    part        SMALLINT     NOT NULL CHECK (part BETWEEN 1 AND 3),
    topic       TEXT,
    difficulty  TEXT         NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    passage     JSONB        NOT NULL CHECK (jsonb_typeof(passage) = 'object'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_generated_user_time ON public.reading_generated (user_id, created_at DESC);

ALTER TABLE public.reading_generated ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_generated_select_own" ON public.reading_generated;
CREATE POLICY "reading_generated_select_own" ON public.reading_generated
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_generated_insert_own" ON public.reading_generated;
CREATE POLICY "reading_generated_insert_own" ON public.reading_generated
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_generated_delete_own" ON public.reading_generated;
CREATE POLICY "reading_generated_delete_own" ON public.reading_generated
    FOR DELETE USING (auth.uid() = user_id);
