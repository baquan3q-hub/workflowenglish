-- =============================================================================
-- Migration: 002_flashcard_metadata
-- Feature: Learning Quality V2
-- Description: Adds 6 nullable TEXT columns to `word_mastery` to store
--              flashcard metadata (IPA, Vietnamese meaning, English definition,
--              example sentences, part of speech) alongside SRS state.
--              This enables the Review Session to display full card info.
-- =============================================================================

-- Add metadata columns (all nullable so existing rows remain valid)
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS ipa TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS meaning_vi TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS definition_en TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS example_sentence TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS example_sentence_vi TEXT DEFAULT NULL;
ALTER TABLE public.word_mastery ADD COLUMN IF NOT EXISTS part_of_speech TEXT DEFAULT NULL;

-- =============================================================================
-- End of migration 002_flashcard_metadata
-- =============================================================================
