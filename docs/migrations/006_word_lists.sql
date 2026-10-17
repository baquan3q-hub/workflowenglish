-- =============================================================================
-- Migration: 006_word_lists
-- Feature: Upgrade plan v3 — Phase 2 (SRS word library)
-- Plan: docs/upgrade-plan-v3.md (section 2.4)
-- Description:
--   User-made word lists ("Bộ từ của tôi"). A list only points at
--   word_mastery rows: deleting a list never deletes words or SRS progress.
--
-- Safe to re-run. Before it is applied the word library still works; the
-- "Bộ từ của tôi" group just stays empty.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.word_lists (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name        TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
    color       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_lists_user ON public.word_lists (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.word_list_items (
    list_id          UUID         NOT NULL REFERENCES public.word_lists(id) ON DELETE CASCADE,
    word_mastery_id  UUID         NOT NULL REFERENCES public.word_mastery(id) ON DELETE CASCADE,
    added_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (list_id, word_mastery_id)
);

CREATE INDEX IF NOT EXISTS idx_word_list_items_word ON public.word_list_items (word_mastery_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_word_lists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_word_lists_updated_at ON public.word_lists;
CREATE TRIGGER trg_word_lists_updated_at
    BEFORE UPDATE ON public.word_lists
    FOR EACH ROW
    EXECUTE FUNCTION public.set_word_lists_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.word_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own word lists" ON public.word_lists;
CREATE POLICY "Users manage own word lists"
    ON public.word_lists
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Items are allowed when the list belongs to the user, and the word too.
DROP POLICY IF EXISTS "Users manage items of own lists" ON public.word_list_items;
CREATE POLICY "Users manage items of own lists"
    ON public.word_list_items
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.word_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.word_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.word_mastery w WHERE w.id = word_mastery_id AND w.user_id = auth.uid())
    );

-- =============================================================================
-- End of migration 006_word_lists
-- =============================================================================
