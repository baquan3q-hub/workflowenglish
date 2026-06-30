-- Migration: IELTS Writing & Speaking modules
-- Version: 003
-- Description: Create ielts_attempts table for storing user's writing/speaking practice data

-- ─── Table: ielts_attempts ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ielts_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill text NOT NULL CHECK (skill IN ('writing', 'speaking')),
  task_or_part text NOT NULL,
  question_type text,
  topic text,
  question_prompt text NOT NULL,
  answer_text text,
  audio_url text,
  duration_seconds integer,
  word_count integer,
  estimated_band numeric(2,1),
  criterion_scores jsonb,
  ai_feedback jsonb,
  attempt_number integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────────

ALTER TABLE ielts_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own attempts
CREATE POLICY "Users can view own ielts attempts"
  ON ielts_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ielts attempts"
  ON ielts_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ielts attempts"
  ON ielts_attempts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ielts attempts"
  ON ielts_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────

-- Fast lookup by user, skill, and creation time
CREATE INDEX IF NOT EXISTS idx_ielts_attempts_user_skill
  ON ielts_attempts(user_id, skill, created_at DESC);

-- Fast lookup by user and question for tracking attempt history
CREATE INDEX IF NOT EXISTS idx_ielts_attempts_user_question
  ON ielts_attempts(user_id, question_prompt, created_at DESC);

-- ─── Comments ──────────────────────────────────────────

COMMENT ON TABLE ielts_attempts IS 'Stores IELTS writing and speaking practice attempts with AI feedback';
COMMENT ON COLUMN ielts_attempts.skill IS 'Either writing or speaking';
COMMENT ON COLUMN ielts_attempts.task_or_part IS 'task_1, task_2 for writing; part_1, part_2, part_3 for speaking';
COMMENT ON COLUMN ielts_attempts.criterion_scores IS 'JSON object with criterion name -> score mapping';
COMMENT ON COLUMN ielts_attempts.ai_feedback IS 'Full structured AI feedback including corrections, improved version, etc.';
COMMENT ON COLUMN ielts_attempts.attempt_number IS 'Which attempt this is for the same question (1 = first, 2 = rewrite/retry)';
