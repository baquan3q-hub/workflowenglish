-- =============================================================================
-- Migration: 009_ielts_listening
-- Feature: IELTS plan, phases I1–I3 (Listening, skill-specific attempt data)
-- Description:
--   1. ielts_attempts.skill also accepts 'listening'.
--   2. ielts_attempts.details (jsonb): per-question listening answers, speaking
--      fluency metrics, paragraph feedback. Optional; old rows keep NULL.
--   3. Storage bucket ielts-audio: public read, written only by the ai-proxy
--      Edge Function with the service role (no insert policy for users).
--
-- Safe to re-run. Before it is applied, Writing and Speaking keep working;
-- Listening attempts are just not saved.
-- =============================================================================

-- 1. Allow the listening skill. The inline CHECK from 003 has a generated
--    name, so drop whichever check constraint mentions the skill column.
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
  CHECK (skill IN ('listening', 'writing', 'speaking'));

COMMENT ON COLUMN public.ielts_attempts.skill IS 'listening, writing or speaking';

-- 2. Skill-specific extras.
ALTER TABLE public.ielts_attempts
  ADD COLUMN IF NOT EXISTS details jsonb;

COMMENT ON COLUMN public.ielts_attempts.details IS
  'Skill-specific data: listening answers per question, speaking fluency metrics, writing paragraph feedback';

-- 3. Shared, content-addressed audio for Listening (listening/<sha256>.wav).
--    Public buckets are readable by URL without a select policy; only the
--    service role (which bypasses RLS) can write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ielts-audio', 'ielts-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;
