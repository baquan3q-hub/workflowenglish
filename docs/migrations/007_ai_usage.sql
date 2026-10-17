-- =============================================================================
-- Migration: 007_ai_usage
-- Feature: Upgrade plan v3 — Phase 4 (ai-proxy Edge Function)
-- Plan: docs/upgrade-plan-v3.md (section 4.5)
-- Description:
--   One row per AI call made through the ai-proxy function. Used for the
--   hourly per-user limit and to measure real latency (p50/p95).
--   Only the function writes here (service role). Users can read their own rows.
--
-- Safe to re-run. Without it the proxy still works but has no rate limit.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    op          TEXT         NOT NULL,
    model       TEXT,
    latency_ms  INTEGER,
    ok          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- The rate-limit lookup: one user, one op, last hour.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_op_time ON public.ai_usage (user_id, op, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage
    FOR SELECT USING (auth.uid() = user_id);

-- No insert/update/delete policies: only the service role (which bypasses RLS) writes.

-- Latency per op over the last 7 days, e.g. for the sentence-grading target:
-- SELECT op,
--        percentile_cont(0.5)  WITHIN GROUP (ORDER BY latency_ms) AS p50,
--        percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
--        count(*)
-- FROM public.ai_usage
-- WHERE ok AND created_at > now() - interval '7 days'
-- GROUP BY op;
