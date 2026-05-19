-- =============================================================================
-- Migration: 003_fix_learning_history_rls
-- Purpose: Ensure Row Level Security policies on `learning_history` table
--          allow authenticated users to INSERT/UPDATE/DELETE their own rows.
--          Run this if you find that "Lưu bài học" button doesn't actually
--          save to the database.
-- =============================================================================

-- Make sure the table exists (in case it was never created)
CREATE TABLE IF NOT EXISTS public.learning_history (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic           TEXT         NOT NULL,
    level           TEXT         NOT NULL,
    words           TEXT         NOT NULL,
    quiz_score      INTEGER,
    quiz_total      INTEGER,
    lesson_data     JSONB,
    completed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for faster history queries
CREATE INDEX IF NOT EXISTS idx_learning_history_user_completed
    ON public.learning_history (user_id, completed_at DESC);

-- Enable RLS
ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) so we can recreate them cleanly
DROP POLICY IF EXISTS "Users can view own history"   ON public.learning_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.learning_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.learning_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.learning_history;

-- Create RLS policies
CREATE POLICY "Users can view own history"
    ON public.learning_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
    ON public.learning_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
    ON public.learning_history
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
    ON public.learning_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- End of migration 003_fix_learning_history_rls
-- =============================================================================
