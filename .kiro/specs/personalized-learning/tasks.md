# Implementation Plan: Personalized Learning

## Overview

Triển khai tính năng Personalized Learning cho VocabMaster theo 3 phase: (1) Core SRS foundation với SM-2 algorithm và word mastery tracking, (2) Analytics dashboard cùng learning goals/streaks, (3) AI-enhanced personalization với recommendations, weakness detection, và adaptive difficulty. Mỗi task xây dựng trên các task trước, kết thúc bằng việc wire các phần lại với nhau qua `App.tsx`. Ngôn ngữ triển khai: **TypeScript** (matching the existing React + Vite + Supabase codebase).

## Tasks

## Phase 1: Core SRS Foundation (Tuần 1-2)

- [x] 1. Database & type foundations
  - [x] 1.1 Create Supabase migration for `word_mastery` and `user_goals`
    - Author SQL migration in `docs/migrations/001_personalized_learning.sql`
    - `word_mastery`: id (UUID PK), user_id (FK profiles ON DELETE CASCADE), word (TEXT), mastery_level (INTEGER default 0), easiness_factor (REAL default 2.5), interval_days (REAL default 0), repetition_count (INTEGER default 0), next_review_date (TIMESTAMPTZ default NOW()), last_reviewed_at (TIMESTAMPTZ nullable), correct_count (INTEGER default 0), incorrect_count (INTEGER default 0), incorrect_contexts (JSONB default '[]'), created_at, updated_at
    - `user_goals`: id (UUID PK), user_id (FK profiles UNIQUE ON DELETE CASCADE), daily_word_goal (INTEGER default 10), current_streak (INTEGER default 0), longest_streak (INTEGER default 0), last_active_date (DATE nullable), words_reviewed_today (INTEGER default 0), last_review_reset_date (DATE nullable), preferred_level (TEXT default 'B1'), created_at, updated_at
    - Add UNIQUE(user_id, word) on `word_mastery`
    - Indexes: `idx_word_mastery_user_review` on (user_id, next_review_date), `idx_word_mastery_user_level` on (user_id, mastery_level)
    - Enable RLS on both tables; policies allow users to manage only their own rows (`auth.uid() = user_id`)
    - _Requirements: 1.4, 1.6, 6.5_

  - [x] 1.2 Extend `types.ts` with new enums, interfaces, and AppPhases
    - Add `MasteryLevel` enum (NEW=0, LEARNING=1, REVIEWING=2, MASTERED=3, LAPSED=4)
    - Add `ConfidenceRating` type alias `0 | 1 | 2 | 3`
    - Add `WordMasteryRecord` interface mirroring the table schema
    - Add `IncorrectContext` interface: `{ question, userAnswer, correctAnswer, timestamp }`
    - Add `UserGoals` interface mirroring the `user_goals` schema
    - Add `AppPhase.REVIEW_SESSION` and `AppPhase.ANALYTICS` to the `AppPhase` enum
    - Add `WordRecommendation` interface: `{ word, meaningVietnamese, cefrLevel, topic, relevanceReason }`
    - Add `WeaknessPattern` interface: `{ category, categoryVi, errorCount, examples, status }`
    - File: `types.ts`
    - _Requirements: 1.1, 1.2, 4.6, 5.6, 7.2_

- [x] 2. SRS algorithm and word mastery service
  - [x] 2.1 Implement `services/srsService.ts` with SM-2 algorithm as pure functions
    - Export `SRSCard`, `SRSResult` interfaces and `ConfidenceRating`
    - `calculateSRS(card, rating)` implements SM-2:
      - Rating 0 (Again): EF -= 0.2 (clamp ≥ 1.3), interval = 1, repetitionCount = 0
      - Rating 1 (Hard): EF -= 0.15 (clamp ≥ 1.3), interval *= 1.2 (min 1)
      - Rating 2 (Good): interval = rep==0 ? 1 : rep==1 ? 6 : interval*EF, repetitionCount += 1
      - Rating 3 (Easy): EF += 0.15, interval = rep==0 ? 4 : interval*EF*1.3, repetitionCount += 1
    - Export `getNextReviewDate(intervalDays, from?)` and `formatIntervalDisplay(days)` helpers
    - Functions are pure: no `Date.now()` reads inside core math, accept dates as parameters
    - File: `services/srsService.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 2.2 Write property-based tests for SRS service
    - **Property 1: SM-2 Interval Monotonicity for Good/Easy** (Validates: Requirements 2.4, 2.5) — for any card with rating Good or Easy and `repetitionCount > 1`, the new `intervalDays` is strictly greater than the previous `intervalDays`
    - **Property 2: Easiness Factor Bounds** (Validates: Requirements 2.2, 2.3, 2.5) — for any sequence of ratings, `easinessFactor` never drops below 1.3
    - **Property 8: Again Resets Interval** (Validates: Requirement 2.2) — for any card state, applying rating Again yields `intervalDays = 1` and `repetitionCount = 0`
    - Use `fast-check` arbitraries: easinessFactor (1.3 – 5.0), intervalDays (1 – 365), repetitionCount (0 – 50), rating (0 – 3)
    - File: `services/__tests__/srsService.test.ts`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Implement `services/masteryService.ts` (state transitions + Supabase CRUD)
    - `normalizeWord(word)`: lowercase + trim + collapse internal whitespace
    - `determineMasteryTransition(currentLevel, rating, repCount, intervalDays)`: enforce edges New→Learning, Learning→Reviewing (after 3 consecutive Good/Easy), Reviewing→Mastered (interval > 21 days with Good/Easy), {Reviewing,Mastered}→Lapsed on incorrect quiz, Lapsed→Learning on resume
    - Supabase CRUD: `getWordMastery`, `upsertWordMastery`, `getDueWords`, `getDueWordCount`, `getWordMasteryStats`, `bulkEnsureWords`
    - `recordQuizIncorrect(userId, word, context)` increments `incorrect_count`, appends to `incorrect_contexts`, and demotes Reviewing/Mastered words to Lapsed (interval reset to 1)
    - File: `services/masteryService.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 7.5_

  - [x]* 2.4 Write property-based tests for normalization and transitions
    - **Property 3: Word Normalization Idempotence** (Validates: Requirement 1.6) — `normalizeWord(normalizeWord(s)) === normalizeWord(s)` for any string `s`
    - **Property 4: Mastery Level Transition Validity** (Validates: Requirements 1.2, 1.3) — for any sequence of (rating, quizResult) events, transitions only follow valid edges; Lapsed only reachable from Reviewing/Mastered via incorrect quiz
    - Use fast-check string arbitrary for normalization, custom arbitraries for `(MasteryLevel, ConfidenceRating, repCount, intervalDays)` tuples for transitions
    - File: `services/__tests__/masteryService.test.ts`
    - _Requirements: 1.2, 1.3, 1.6_

- [x] 3. Review session UI and Phase 1 wiring
  - [x] 3.1 Build `components/MasteryBadge.tsx`
    - Props: `level: MasteryLevel`, `size?: 'sm' | 'md'`
    - Color tokens: NEW=gray-400, LEARNING=yellow-500, REVIEWING=blue-500, MASTERED=emerald-500, LAPSED=red-500
    - Vietnamese labels via tooltip: "Mới", "Đang học", "Ôn tập", "Thành thạo", "Đã quên"
    - Support dark-mode Tailwind variants
    - File: `components/MasteryBadge.tsx`
    - _Requirements: 1.5_

  - [x] 3.2 Build `views/ReviewSession.tsx`
    - Props: `userId`, `onComplete`, `onBack`
    - On mount: `getDueWords(userId)`; show loading skeleton
    - Empty state: congratulatory message + next scheduled review date + "Quay lại Dashboard"
    - Active state: flippable flashcard (front: word + IPA + POS; back: meaning + definition + example), 4 rating buttons "Lại / Khó / Tốt / Dễ" each annotated with predicted next interval (use `formatIntervalDisplay`)
    - Progress bar "X / Y từ đã ôn"
    - On rating click: `calculateSRS` → `upsertWordMastery` → advance; on `recordWordReview` integrate goal counter (used in Phase 2)
    - Completion summary with "Hoàn thành" button → `onComplete()`
    - File: `views/ReviewSession.tsx`
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 3.3 Update `views/Flashcards.tsx` to track mastery and rate reviewed words
    - Accept `userId` prop (extend `FlashcardsProps`)
    - On mount: `bulkEnsureWords(userId, cards.map(c => c.word))`; fetch mastery for current lesson words
    - Render `MasteryBadge` next to each word on the front of the card
    - In review mode (existing words with mastery_level > NEW): after flipping, prompt "Bạn nhớ từ này không?" with 4 rating buttons
    - First-time learning (NEW): auto-rate as "Good" when user advances
    - Persist updates via `upsertWordMastery` after each rating
    - File: `views/Flashcards.tsx`
    - _Requirements: 1.1, 1.5, 2.1_

  - [x] 3.4 Update `views/Dashboard.tsx` with SRS review badge entry point
    - Accept `userId` and `onStartReview` props
    - On mount: `getDueWordCount(userId)`
    - When count > 0: render prominent card "📚 X từ cần ôn tập" with "Bắt đầu ôn tập" button → `onStartReview()`
    - When count === 0: subtle "✅ Không có từ cần ôn hôm nay" message
    - Use indigo/blue gradient with pulsing badge for emphasis
    - File: `views/Dashboard.tsx`
    - _Requirements: 2.6, 2.7_

  - [x] 3.5 Update `views/QuizMode.tsx` to record incorrect answers
    - Accept optional `userId` prop
    - On incorrect answer: extract target word from question, call `recordQuizIncorrect(userId, word, { question, userAnswer, correctAnswer, timestamp })`
    - This triggers the Lapsed transition for words at Reviewing/Mastered (handled in masteryService)
    - File: `views/QuizMode.tsx`
    - _Requirements: 1.3, 7.5_

  - [x] 3.6 Wire Phase 1 phases into `App.tsx`
    - Add `AppPhase.REVIEW_SESSION` switch case rendering `<ReviewSession />`
    - Pass `userId={currentUser.id}` to `Dashboard`, `Flashcards`, `QuizMode`
    - Pass `onStartReview={() => setPhase(AppPhase.REVIEW_SESSION)}` to Dashboard
    - Wire `onComplete` / `onBack` of ReviewSession back to Dashboard
    - File: `App.tsx`
    - _Requirements: 2.6, 2.7_

- [x] 4. Phase 1 checkpoint
  - Ensure all unit and property tests pass; manually exercise Dashboard → ReviewSession → Flashcards → QuizMode flow. Ask the user if questions arise.

## Phase 2: Analytics & Goals (Tuần 3-4)

- [x] 5. Goals service and analytics aggregation
  - [x] 5.1 Implement `services/goalService.ts` with streak logic and daily tracking
    - `getOrCreateUserGoals(userId)`: fetch or create with defaults (`daily_word_goal=10`, `preferred_level='B1'`)
    - `updateDailyGoal(userId, goal)`: validate goal ∈ {5, 10, 15, 20}; persist
    - `recordWordReview(userId)`: increments `words_reviewed_today` (resetting it on new day), reports `goalReached` boolean, updates streak when goal newly reached, refreshes `last_active_date`
    - Pure helpers: `checkAndResetStreak(goals, today)`, `updateStreak(goals)`, `isSameDay`, `differenceInCalendarDays`
    - Update `longest_streak = max(longest_streak, current_streak)` whenever current streak grows
    - File: `services/goalService.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x]* 5.2 Write property-based tests for streak logic
    - **Property 5: Streak Counter Consistency** (Validates: Requirements 6.4, 6.7) — for any sequence of daily activity events, `longest_streak >= current_streak`
    - Additional properties:
      - Streak resets to 0 when `daysDiff > 1` and previous day's goal not met
      - On a new calendar day, `words_reviewed_today` is reset to 0 before incrementing
      - `current_streak` increments by exactly 1 when goal is newly reached on a new day
    - Use fast-check date arbitraries and a small state-machine arbitrary for goal events
    - File: `services/__tests__/goalService.test.ts`
    - _Requirements: 6.4, 6.7_

  - [x] 5.3 Implement `services/analyticsService.ts` for data aggregation
    - `getMasteryDistribution(userId)` → `Record<MasteryLevel, number>`
    - `getActivityHeatmap(userId, days)` → `{ date, count }[]` for the last N days based on `word_mastery.last_reviewed_at` or `learning_history.completed_at`
    - `getQuizScoreTrend(userId, limit)` → `{ date, score, total }[]` from `learning_history`
    - `getTotalStats(userId)` → `{ totalWords, masteredWords, dueToday, currentLevel }`
    - File: `services/analyticsService.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Charts and Analytics view
  - [x] 6.1 Build `components/SVGCharts.tsx` chart primitives
    - `HeatmapGrid` (7×~5 cells, color buckets 0 / 1–5 / 6–10 / 11+)
    - `BarChart` (horizontal bars from `{ label, value, color }[]`)
    - `LineChart` (polyline + dots, Y-axis 0–100%) for quiz score trend
    - `CircularProgress` (`value`, `max`, `size`) for goal progress
    - All inline SVG (no external charting lib), responsive `viewBox`, dark-mode safe
    - File: `components/SVGCharts.tsx`
    - _Requirements: 4.2, 4.3, 4.4, 4.7_

  - [x] 6.2 Build `views/AnalyticsDashboard.tsx`
    - Props: `userId`, `onBack`, `onStartLesson`
    - Sections in order:
      1. Summary cards (4): total words, mastered, due today, current level
      2. 30-day activity heatmap (`HeatmapGrid`)
      3. Mastery distribution `BarChart` (5 bars, color-coded)
      4. Quiz score trend `LineChart` (last 10)
      5. Streak + daily goal block (🔥 emoji when streak ≥ 3)
    - When `learning_history` count < 3: show onboarding card "Bắt đầu học để xem thống kê!" + CTA → `onStartLesson()`
    - Loading skeleton while data fetches
    - File: `views/AnalyticsDashboard.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 7. Goals + Analytics integration into Dashboard and App
  - [x] 7.1 Add Toast component for goal-completion celebration
    - In `components/Common.tsx`, add `Toast` (`message`, `type: 'success' | 'info'`, `visible`, `onClose`); auto-dismiss after 3s; slide-down + fade animation; fixed top-center, above header
    - Wire toast state in `App.tsx` and trigger from `recordWordReview` when `goalReached === true`
    - Files: `components/Common.tsx`, `App.tsx`
    - _Requirements: 6.2_

  - [x] 7.2 Update `views/Dashboard.tsx` with goal progress + streak header
    - Accept `userGoals: UserGoals | null` prop (fetched in `App.tsx` via `getOrCreateUserGoals`)
    - Add a row above the vocabulary input:
      - Left: `CircularProgress` showing `words_reviewed_today / daily_word_goal`
      - Center: streak text with 🔥 when `current_streak >= 3`, e.g. "🔥 7 ngày liên tiếp"
      - Right: dropdown {5, 10, 15, 20} từ/ngày → `updateDailyGoal` on change
    - File: `views/Dashboard.tsx`
    - _Requirements: 6.1, 6.3, 6.6_

  - [x] 7.3 Wire `AppPhase.ANALYTICS` and navigation in `App.tsx`
    - Add `AppPhase.ANALYTICS` switch case rendering `<AnalyticsDashboard ... />`
    - Add header navigation button "📊 Thống kê" alongside the existing History button
    - Confirm-before-leaving when an active lesson is in progress
    - File: `App.tsx`
    - _Requirements: 4.6_

- [x] 8. Phase 2 checkpoint
  - Ensure all tests pass and Analytics Dashboard renders correctly with seeded data. Ask the user if questions arise.

## Phase 3: AI-Enhanced Personalization (Tuần 5-6)

- [x] 9. Recommendation, weakness, and adaptive-difficulty services
  - [x] 9.1 Implement `services/recommendationService.ts`
    - `generateRecommendations(topTopics, currentLevel, masteredWords)` calls Gemini with the prompt described in design.md and parses a JSON array of `WordRecommendation`
    - `getCachedRecommendations(userId)` / `cacheRecommendations(userId, recs)` use `localStorage` key `vocabmaster_recommendations_{userId}` with 24h expiry timestamp
    - `clearRecommendationCache(userId)`
    - `getTopStudiedTopics(userId)`: query `learning_history`, group by topic, return top 3
    - `getMasteredWordsList(userId)`: query `word_mastery WHERE mastery_level = 3`
    - File: `services/recommendationService.ts`
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6_

  - [x]* 9.2 Write unit / property tests for recommendation cache expiry
    - **Property 7: Recommendation Cache Expiry** (Validates: Requirement 5.4) — for any cached entry written at time T, `getCachedRecommendations` at time `T + 24h + 1ms` returns `null`
    - Mock `Date.now()` / `localStorage`; use fast-check time-offset arbitrary
    - File: `services/__tests__/recommendationService.test.ts`
    - _Requirements: 5.4_

  - [x] 9.3 Implement `services/weaknessService.ts`
    - `analyzeWeaknesses(incorrectContexts)` categorizes errors into the 4 types from Requirement 7.2:
      - vocabulary_gap: ≥ 3 incorrect, no correct answers for the word
      - grammar_confusion: correct vs user answer differ in part-of-speech
      - spelling_similarity: Levenshtein distance < 3
      - meaning_overlap: same incorrect Vietnamese translation chosen for multiple words
    - `getWeaknessData(userId)` aggregates all `incorrect_contexts` from `word_mastery` and runs analysis
    - `generateTargetedLesson(weakness, level)` calls Gemini for a 5-word mini-lesson addressing the pattern
    - `markWeaknessImproving(userId, category)` updates the stored status (used after ≥ 80% on a targeted quiz)
    - Vietnamese labels: "Từ vựng chưa biết", "Nhầm loại từ", "Từ giống nhau", "Nghĩa tương tự"
    - File: `services/weaknessService.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 9.4 Implement `services/adaptiveDifficultyService.ts`
    - `getNextLevel(current, direction)` — pure boundary-aware traversal of the CEFR ladder (A1 → C2)
    - `checkLevelSuggestion(userId)` reads the user's `preferred_level`, fetches the last 5 `learning_history` rows, restricts to same-level scored rows, and returns:
      - `'upgrade'` when last 3 same-level scores all ≥ 90% AND a higher level exists
      - `'downgrade'` when last 2 same-level scores all < 50% AND a lower level exists
      - `null` otherwise
    - `acceptLevelChange(userId, newLevel)` updates `user_goals.preferred_level`
    - `dismissLevelSuggestion` / `wasLevelSuggestionDismissed` use `localStorage` key scoped by `userId + level + direction` (UI-only nudge memory)
    - File: `services/adaptiveDifficultyService.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x]* 9.5 Write property-based tests for adaptive difficulty thresholds
    - **Property 6: Adaptive Difficulty Threshold Correctness** (Validates: Requirements 3.1, 3.2) — `checkLevelSuggestion` returns `'upgrade'` only when the last 3 same-level scores are all ≥ 90% AND a higher level exists; returns `'downgrade'` only when the last 2 same-level scores are all < 50% AND a lower level exists
    - Use fast-check arbitraries for score sequences and current level
    - File: `services/__tests__/adaptiveDifficultyService.test.ts`
    - _Requirements: 3.1, 3.2, 3.6_

- [x] 10. AI integration in views
  - [x] 10.1 Update `views/Dashboard.tsx` with personalized recommendations
    - After the goal/streak row and before the vocabulary input, add a "Gợi ý cho bạn" section
    - On mount when user has ≥ 3 lessons: check cache → `generateRecommendations` if miss
    - Render up to 5 word cards (word bold, Vietnamese meaning, CEFR badge, topic tag) in a horizontally scrollable row
    - Each card has a "Học từ này" button that appends the word to the vocabulary textarea
    - When the user has < 2 distinct topics: show 3 topic suggestion cards ("Du lịch", "Công việc", "Đời sống") with sample words instead
    - Add loading skeleton and a "Làm mới gợi ý" button (clears cache, regenerates)
    - File: `views/Dashboard.tsx`
    - _Requirements: 5.1, 5.3, 5.5, 5.6_

  - [x] 10.2 Update `views/AnalyticsDashboard.tsx` with weakness section
    - Add Section 6 "Điểm yếu cần cải thiện", visible only when total incorrect answers ≥ 10
    - Fetch via `getWeaknessData(userId)`; render a prioritized list of cards: category icon, Vietnamese category name, error count, 2–3 example words
    - Each card has a "Luyện tập" button → `generateTargetedLesson` → navigate to `FLASHCARDS` phase with the generated lesson
    - Show "improving" badge on weaknesses already addressed
    - Empty state: "Tuyệt vời! Không phát hiện điểm yếu nào."
    - File: `views/AnalyticsDashboard.tsx`
    - _Requirements: 7.1, 7.3, 7.4, 7.6_

  - [x] 10.3 Wire adaptive difficulty modal into `App.tsx`
    - In the quiz-completion handler, call `checkLevelSuggestion(userId)` (skipping if previously dismissed for this `userId + level + direction`)
    - Render a dismissible modal with two CTAs ("Chấp nhận" / "Giữ nguyên"):
      - Upgrade copy: "🎉 Bạn đang tiến bộ rất tốt! Nâng lên {nextLevel}?"
      - Downgrade copy: "💪 Hãy củng cố nền tảng! Chuyển về {prevLevel}?"
    - On accept: `acceptLevelChange(userId, newLevel)` and update Dashboard's default level selection
    - On decline: `dismissLevelSuggestion`
    - C2 upgrade edge case: show "🏆 Chúc mừng! Bạn đã đạt trình độ cao nhất!" without an upgrade button
    - File: `App.tsx`
    - _Requirements: 3.3, 3.4, 3.6_

- [x] 11. Final checkpoint
  - Ensure all unit, property, and integration tests pass; smoke-test the full flow Dashboard → Recommendations → Lesson → Quiz → Adaptive modal → Review → Analytics → Weakness mini-lesson. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP — they cover property-based and unit tests.
- Each task references the specific sub-requirements it implements (`_Requirements:_`) so traceability stays intact when requirements evolve.
- Property-based tests target the 8 correctness properties defined in `design.md`; each PBT sub-task is annotated with its property number and the requirement clauses it validates.
- Implementation language is **TypeScript** (matches the existing React + Vite + Supabase stack); no pseudocode-to-language translation needed.
- Adaptive difficulty lives in its own `services/adaptiveDifficultyService.ts` (not inside `masteryService.ts`) to keep level-suggestion logic decoupled from mastery state transitions.
- Checkpoints (tasks 4, 8, 11) are validation gates between phases.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "3.1", "5.1", "5.3", "9.1", "9.3", "9.4"] },
    { "id": 3, "tasks": ["3.2", "5.2", "6.1", "9.2", "9.5"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "6.2", "7.2"] },
    { "id": 5, "tasks": ["3.6", "7.1", "7.3", "10.1", "10.2"] },
    { "id": 6, "tasks": ["10.3"] }
  ]
}
```
