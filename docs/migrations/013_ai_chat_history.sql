-- =============================================================================
-- Migration: 013_ai_chat_history
-- Feature: IELTS Mentor chat — conversation history saved to the account
-- Description:
--   ai_chat_conversations: one row per conversation with the mentor, so the
--   history follows the learner across devices. `messages` is an array in the
--   app's ChatMessage shape (services/chatLogic.ts) with file data removed.
--   `id` is made by the app ("conv_…"), unique per user.
--   Each user sees and changes only their own rows.
--
-- Needs nothing else. Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_conversations (
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    id          TEXT         NOT NULL CHECK (char_length(id) BETWEEN 1 AND 80),
    title       TEXT         NOT NULL DEFAULT '' CHECK (char_length(title) <= 120),
    messages    JSONB        NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(messages) = 'array'),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id),
    -- Keeps one row well under Supabase's request limits (the app sends at most 120 messages).
    CONSTRAINT ai_chat_conversations_size CHECK (pg_column_size(messages) < 2000000)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_time
    ON public.ai_chat_conversations (user_id, updated_at DESC);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_conversations_select_own" ON public.ai_chat_conversations;
CREATE POLICY "ai_chat_conversations_select_own" ON public.ai_chat_conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_chat_conversations_insert_own" ON public.ai_chat_conversations;
CREATE POLICY "ai_chat_conversations_insert_own" ON public.ai_chat_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_chat_conversations_update_own" ON public.ai_chat_conversations;
CREATE POLICY "ai_chat_conversations_update_own" ON public.ai_chat_conversations
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_chat_conversations_delete_own" ON public.ai_chat_conversations;
CREATE POLICY "ai_chat_conversations_delete_own" ON public.ai_chat_conversations
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_chat_conversations IS 'IELTS Mentor chat history, one row per conversation (013).';
