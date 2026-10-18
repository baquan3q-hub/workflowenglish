-- =============================================================================
-- Migration: 011_listening_library
-- Feature: IELTS roadmap — Phase I13 (trang quản trị đề Listening)
-- Description:
--   app_admins lists who may open the admin page. Nobody can add themself
--   from the app: rows are added here, in the SQL Editor.
--
--   listening_library holds Listening tests written on the admin page (own
--   YouTube recordings or AI voices). `sections` is an array of parts in the
--   app's ListeningSection shape. Learners see published tests only; admins
--   see and change every row.
--
-- Safe to re-run. After running it, make yourself an admin (replace the email):
--
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = '<email của bạn>'
--   on conflict do nothing;
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --- Admins ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_admins (
    user_id     UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Each user can see whether they are an admin; no insert/update/delete policy,
-- so the app can never change this table.
DROP POLICY IF EXISTS "app_admins_select_own" ON public.app_admins;
CREATE POLICY "app_admins_select_own" ON public.app_admins
    FOR SELECT USING (auth.uid() = user_id);

-- SECURITY DEFINER so policies on other tables can ask without seeing app_admins rows.
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- --- Listening library -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.listening_library (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    kind            TEXT         NOT NULL CHECK (kind IN ('full', 'practice')),
    status          TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    description_vi  TEXT         NOT NULL DEFAULT '',
    sections        JSONB        NOT NULL CHECK (jsonb_typeof(sections) = 'array'),
    created_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listening_library_status_time ON public.listening_library (status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.listening_library_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
        NEW.published_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listening_library_touch ON public.listening_library;
CREATE TRIGGER trg_listening_library_touch
    BEFORE INSERT OR UPDATE ON public.listening_library
    FOR EACH ROW EXECUTE FUNCTION public.listening_library_touch();

ALTER TABLE public.listening_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listening_library_select" ON public.listening_library;
CREATE POLICY "listening_library_select" ON public.listening_library
    FOR SELECT USING (status = 'published' OR public.is_app_admin());

DROP POLICY IF EXISTS "listening_library_insert_admin" ON public.listening_library;
CREATE POLICY "listening_library_insert_admin" ON public.listening_library
    FOR INSERT WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "listening_library_update_admin" ON public.listening_library;
CREATE POLICY "listening_library_update_admin" ON public.listening_library
    FOR UPDATE USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "listening_library_delete_admin" ON public.listening_library;
CREATE POLICY "listening_library_delete_admin" ON public.listening_library
    FOR DELETE USING (public.is_app_admin());
