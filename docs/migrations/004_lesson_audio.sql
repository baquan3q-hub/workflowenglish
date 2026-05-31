-- =============================================================================
-- Migration: 004_lesson_audio
-- Purpose: Create lesson_audio table to store base64 audio separately from 
--          JSONB columns. This prevents payload size bottlenecks during lesson 
--          saves and avoids N+1 / massive JSON fetch overhead on dashboard lists.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lesson_audio (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id       UUID         NOT NULL REFERENCES public.learning_history(id) ON DELETE CASCADE,
    audio_base64    TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    
    CONSTRAINT lesson_audio_record_id_unique UNIQUE (record_id)
);

-- Enable RLS
ALTER TABLE public.lesson_audio ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own lesson audio"   ON public.lesson_audio;
DROP POLICY IF EXISTS "Users can insert own lesson audio" ON public.lesson_audio;
DROP POLICY IF EXISTS "Users can update own lesson audio" ON public.lesson_audio;
DROP POLICY IF EXISTS "Users can delete own lesson audio" ON public.lesson_audio;

-- Users can select/insert/update/delete only their own lesson audios (linked via learning_history.user_id)
CREATE POLICY "Users can view own lesson audio"
    ON public.lesson_audio
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_history
            WHERE learning_history.id = lesson_audio.record_id
              AND learning_history.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own lesson audio"
    ON public.lesson_audio
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.learning_history
            WHERE learning_history.id = lesson_audio.record_id
              AND learning_history.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own lesson audio"
    ON public.lesson_audio
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_history
            WHERE learning_history.id = lesson_audio.record_id
              AND learning_history.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.learning_history
            WHERE learning_history.id = lesson_audio.record_id
              AND learning_history.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own lesson audio"
    ON public.lesson_audio
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_history
            WHERE learning_history.id = lesson_audio.record_id
              AND learning_history.user_id = auth.uid()
        )
    );
