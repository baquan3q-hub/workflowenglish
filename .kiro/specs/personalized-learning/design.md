# Design Document

## Overview

Thiết kế chi tiết cho tính năng Personalized Learning của VocabMaster, bao gồm kiến trúc hệ thống, database schema, thuật toán SRS, và kế hoạch triển khai theo 3 phase.

## Architecture

### Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (App.tsx)                        │
├─────────────────────────────────────────────────────────────────┤
│  Views (AppPhase)                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │Dashboard │ │Flashcards│ │ReviewSess│ │AnalyticsDashboard│   │
│  │(updated) │ │(updated) │ │  (new)   │ │     (new)        │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Services Layer                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │srsService.ts │ │masteryService│ │recommendationService │    │
│  │  (new)       │ │   .ts (new)  │ │      .ts (new)       │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │goalService.ts│ │analyticsServ │ │  weaknessService.ts  │    │
│  │   (new)      │ │  ice.ts(new) │ │       (new)          │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │geminiService │ │supabaseClient│  ← existing, extended        │
│  │  .ts (ext)   │ │  .ts (ext)   │                              │
│  └──────────────┘ └──────────────┘                              │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)                                           │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐   │
│  │profiles  │ │learning_hist │ │word_mast │ │ user_goals   │   │
│  │(existing)│ │ory (existing)│ │ery (new) │ │   (new)      │   │
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc thiết kế

1. **Tách biệt logic SRS**: Thuật toán SM-2 là pure function, không phụ thuộc UI hay database
2. **Service layer pattern**: Mỗi domain có service riêng, giao tiếp với Supabase
3. **Giữ nguyên kiến trúc hiện tại**: Thêm AppPhase mới, không refactor routing
4. **Inline SVG charts**: Không thêm charting library, giữ bundle size nhỏ
5. **Progressive enhancement**: Mỗi phase hoạt động độc lập, không phụ thuộc phase sau

## Database Schema

### Bảng mới: `word_mastery`

```sql
CREATE TABLE word_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  -- 0=New, 1=Learning, 2=Reviewing, 3=Mastered, 4=Lapsed
  easiness_factor REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  repetition_count INTEGER NOT NULL DEFAULT 0,
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  incorrect_contexts JSONB DEFAULT '[]'::jsonb,
  -- Array of {question, userAnswer, correctAnswer, timestamp}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, word)
);

CREATE INDEX idx_word_mastery_user_review 
  ON word_mastery(user_id, next_review_date);
CREATE INDEX idx_word_mastery_user_level 
  ON word_mastery(user_id, mastery_level);
```

### Bảng mới: `user_goals`

```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  daily_word_goal INTEGER NOT NULL DEFAULT 10,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  words_reviewed_today INTEGER NOT NULL DEFAULT 0,
  last_review_reset_date DATE,
  -- Reset words_reviewed_today when date changes
  preferred_level TEXT DEFAULT 'B1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Row Level Security (RLS)

```sql
-- word_mastery: users can only access their own data
ALTER TABLE word_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own word mastery"
  ON word_mastery FOR ALL
  USING (auth.uid() = user_id);

-- user_goals: users can only access their own goals
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals"
  ON user_goals FOR ALL
  USING (auth.uid() = user_id);
```

## Component Design

### Phase 1: Core SRS Components

#### 1. `services/srsService.ts` — SM-2 Algorithm (Pure Functions)

```typescript
// Core SM-2 calculation — pure function, no side effects
export interface SRSCard {
  easinessFactor: number;  // EF, min 1.3, default 2.5
  intervalDays: number;    // days until next review
  repetitionCount: number; // consecutive correct answers
}

export type ConfidenceRating = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

export interface SRSResult {
  easinessFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewDate: Date;
}

export function calculateSRS(card: SRSCard, rating: ConfidenceRating): SRSResult {
  // SM-2 implementation
  let { easinessFactor, intervalDays, repetitionCount } = card;
  
  switch (rating) {
    case 0: // Again
      easinessFactor = Math.max(1.3, easinessFactor - 0.2);
      intervalDays = 1;
      repetitionCount = 0;
      break;
    case 1: // Hard
      easinessFactor = Math.max(1.3, easinessFactor - 0.15);
      intervalDays = Math.max(1, intervalDays * 1.2);
      break;
    case 2: // Good
      intervalDays = repetitionCount === 0 ? 1 : 
                     repetitionCount === 1 ? 6 : 
                     intervalDays * easinessFactor;
      repetitionCount += 1;
      break;
    case 3: // Easy
      easinessFactor += 0.15;
      intervalDays = repetitionCount === 0 ? 4 :
                     intervalDays * easinessFactor * 1.3;
      repetitionCount += 1;
      break;
  }
  
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.ceil(intervalDays));
  
  return { easinessFactor, intervalDays, repetitionCount, nextReviewDate };
}
```

#### 2. `services/masteryService.ts` — Word Mastery CRUD

```typescript
export function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function getMasteryLevel(card: WordMasteryRecord): MasteryLevel {
  // Derive mastery level from SRS parameters
}

export function determineMasteryTransition(
  currentLevel: MasteryLevel,
  rating: ConfidenceRating,
  repetitionCount: number,
  intervalDays: number
): MasteryLevel {
  // State machine logic
}

// Supabase CRUD operations
export async function getWordMastery(userId: string, word: string): Promise<WordMasteryRecord | null>
export async function upsertWordMastery(record: Partial<WordMasteryRecord>): Promise<WordMasteryRecord>
export async function getDueWords(userId: string): Promise<WordMasteryRecord[]>
export async function getWordMasteryStats(userId: string): Promise<MasteryStats>
```

#### 3. `views/ReviewSession.tsx` — SRS Review UI

```
┌─────────────────────────────────────────┐
│  Ôn tập hôm nay (12 từ)          ✕     │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   [Flashcard]   │             │
│         │   (flip to see  │             │
│         │    meaning)     │             │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │Lại │ │Khó │ │Tốt │ │Dễ  │          │
│  │<1d │ │ 3d │ │ 7d │ │15d │          │
│  └────┘ └────┘ └────┘ └────┘          │
│                                         │
│  Progress: ████████░░░░ 8/12            │
└─────────────────────────────────────────┘
```

### Phase 2: Analytics & Goals Components

#### 4. `views/AnalyticsDashboard.tsx` — Learning Analytics

```
┌─────────────────────────────────────────────────────────┐
│  📊 Phân tích học tập                                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ 156  │ │  42  │ │  8   │ │  B1  │                   │
│  │Tổng  │ │Thành │ │Cần ôn│ │Level │                   │
│  │từ    │ │thạo  │ │hôm nay│ │      │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                          │
│  Hoạt động 30 ngày:                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │ [Heatmap grid - 30 cells, color intensity]  │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  Phân bố từ vựng:                                       │
│  New      ████████████░░░░░░░░  45                      │
│  Learning ██████░░░░░░░░░░░░░░  28                      │
│  Reviewing████████████████░░░░  62                      │
│  Mastered ██████████░░░░░░░░░░  42                      │
│  Lapsed   ██░░░░░░░░░░░░░░░░░░   8                     │
│                                                          │
│  Điểm quiz gần đây:                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │ [Line chart - last 10 quiz scores]          │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  🔥 Streak: 7 ngày | Kỷ lục: 14 ngày                   │
└─────────────────────────────────────────────────────────┘
```

#### 5. Dashboard Updates — Goals & Review Badge

```
┌─────────────────────────────────────────────────────────┐
│  VocabMaster                                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────┐      │
│  │ 🔥 5 ngày       │  │  Ôn tập: 8 từ cần ôn   │      │
│  │ ████████░░ 7/10 │  │  [Bắt đầu ôn tập →]    │      │
│  │ Mục tiêu hôm nay│  │                         │      │
│  └─────────────────┘  └─────────────────────────┘      │
│                                                          │
│  Gợi ý cho bạn:                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │
│  │word1│ │word2│ │word3│ │word4│ │word5│             │
│  │ B1  │ │ B1  │ │ B2  │ │ B1  │ │ B1  │             │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘             │
│                                                          │
│  [Existing Dashboard content: level, topic, textarea]    │
└─────────────────────────────────────────────────────────┘
```

### Phase 3: AI-Enhanced Components

#### 6. `services/recommendationService.ts`

```typescript
export interface WordRecommendation {
  word: string;
  meaningVietnamese: string;
  cefrLevel: string;
  topic: string;
  relevanceReason: string;
}

export async function generateRecommendations(
  topTopics: string[],
  currentLevel: string,
  masteredWords: string[]
): Promise<WordRecommendation[]>

export function getCachedRecommendations(): WordRecommendation[] | null
export function cacheRecommendations(recs: WordRecommendation[]): void
```

#### 7. `services/weaknessService.ts`

```typescript
export interface WeaknessPattern {
  category: 'vocabulary_gap' | 'grammar_confusion' | 'spelling_similarity' | 'meaning_overlap';
  categoryVi: string;
  errorCount: number;
  examples: { word: string; context: string }[];
  status: 'active' | 'improving';
}

export function analyzeWeaknesses(incorrectContexts: IncorrectContext[]): WeaknessPattern[]
export async function generateTargetedLesson(weakness: WeaknessPattern): Promise<GeneratedLesson>
```

## Types Extension

### Thêm vào `types.ts`

```typescript
// New AppPhases
export enum AppPhase {
  // ... existing phases
  REVIEW_SESSION = 'REVIEW_SESSION',
  ANALYTICS = 'ANALYTICS',
}

// Mastery types
export enum MasteryLevel {
  NEW = 0,
  LEARNING = 1,
  REVIEWING = 2,
  MASTERED = 3,
  LAPSED = 4,
}

export interface WordMasteryRecord {
  id: string;
  user_id: string;
  word: string;
  mastery_level: MasteryLevel;
  easiness_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  correct_count: number;
  incorrect_count: number;
  incorrect_contexts: IncorrectContext[];
}

export interface IncorrectContext {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  timestamp: string;
}

export interface UserGoals {
  id: string;
  user_id: string;
  daily_word_goal: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  words_reviewed_today: number;
  last_review_reset_date: string | null;
  preferred_level: string;
}
```

## Algorithm Details

### SM-2 State Machine

```
                    rating=Again
         ┌──────────────────────────┐
         │                          ▼
    ┌────┴───┐    rating≥Good    ┌──────────┐    3x Good/Easy    ┌───────────┐
    │  NEW   │ ──────────────→   │ LEARNING │ ──────────────→    │ REVIEWING │
    └────────┘                   └──────────┘                    └───────────┘
                                      ▲                               │
                                      │ rating=Again                  │ interval>21d
                                      │                               │ + Good/Easy
                                 ┌────┴───┐                          ▼
                                 │ LAPSED │  ←── incorrect    ┌──────────┐
                                 └────────┘      quiz answer  │ MASTERED │
                                                              └──────────┘
```

### Streak Logic

```typescript
function updateStreak(goals: UserGoals, today: Date): UserGoals {
  const lastActive = goals.last_active_date ? new Date(goals.last_active_date) : null;
  
  // Reset daily counter if new day
  if (!lastActive || !isSameDay(lastActive, today)) {
    goals.words_reviewed_today = 0;
  }
  
  // Check if streak should reset (missed a full day)
  if (lastActive) {
    const daysDiff = differenceInCalendarDays(today, lastActive);
    if (daysDiff > 1) {
      goals.current_streak = 0;
    }
  }
  
  return goals;
}
```

### Adaptive Difficulty Logic

```typescript
function checkLevelSuggestion(
  recentScores: { score: number; total: number; level: string }[]
): 'upgrade' | 'downgrade' | null {
  const currentLevel = recentScores[0]?.level;
  const sameLevelScores = recentScores.filter(s => s.level === currentLevel);
  
  // Check upgrade: 3 consecutive >= 90%
  if (sameLevelScores.length >= 3) {
    const last3 = sameLevelScores.slice(0, 3);
    if (last3.every(s => s.score / s.total >= 0.9)) return 'upgrade';
  }
  
  // Check downgrade: 2 consecutive < 50%
  if (sameLevelScores.length >= 2) {
    const last2 = sameLevelScores.slice(0, 2);
    if (last2.every(s => s.score / s.total < 0.5)) return 'downgrade';
  }
  
  return null;
}
```

## File Structure (New/Modified)

```
Work-FlowEnglish/
├── types.ts                    ← MODIFIED (add MasteryLevel, WordMasteryRecord, UserGoals, new AppPhases)
├── App.tsx                     ← MODIFIED (add REVIEW_SESSION, ANALYTICS phases + goal/review state)
├── services/
│   ├── geminiService.ts        ← MODIFIED (add recommendation prompt, weakness lesson prompt)
│   ├── supabaseClient.ts       ← MODIFIED (add word_mastery & user_goals CRUD)
│   ├── srsService.ts           ← NEW (SM-2 algorithm, pure functions)
│   ├── masteryService.ts       ← NEW (word mastery logic + Supabase operations)
│   ├── goalService.ts          ← NEW (streak, daily goal logic + Supabase operations)
│   ├── analyticsService.ts     ← NEW (data aggregation for charts)
│   ├── recommendationService.ts← NEW (Gemini-powered recommendations + cache)
│   └── weaknessService.ts      ← NEW (pattern analysis + targeted lessons)
├── views/
│   ├── Dashboard.tsx           ← MODIFIED (add goal progress, review badge, recommendations)
│   ├── Flashcards.tsx          ← MODIFIED (add mastery badges, confidence rating on review)
│   ├── ReviewSession.tsx       ← NEW (SRS review UI with rating buttons)
│   ├── AnalyticsDashboard.tsx  ← NEW (charts, heatmap, stats)
│   └── QuizMode.tsx            ← MODIFIED (track incorrect answers for weakness detection)
└── components/
    ├── Common.tsx              ← MODIFIED (add Toast, CircularProgress, HeatmapGrid)
    ├── MasteryBadge.tsx        ← NEW (color-coded mastery indicator)
    └── SVGCharts.tsx           ← NEW (inline SVG chart components)
```

## Correctness Properties

### Property 1: SM-2 Interval Monotonicity for Good/Easy Ratings
- **Requirement:** 2.4, 2.5
- **Property:** For any card with rating Good (2) or Easy (3) and repetition_count > 1, the new interval_days SHALL be strictly greater than the previous interval_days
- **Rationale:** The spaced repetition algorithm must produce increasing intervals for successful reviews to space out reviews over time

### Property 2: Easiness Factor Bounds
- **Requirement:** 2.2, 2.3, 2.5
- **Property:** For any sequence of ratings applied to a card, the easiness_factor SHALL remain within the range [1.3, +∞) and never drop below 1.3
- **Rationale:** SM-2 defines 1.3 as the minimum EF to prevent intervals from shrinking too aggressively

### Property 3: Word Normalization Idempotence
- **Requirement:** 1.6
- **Property:** For any input string, normalizeWord(normalizeWord(s)) SHALL equal normalizeWord(s)
- **Rationale:** Normalization must be stable — applying it multiple times should not change the result

### Property 4: Mastery Level Transition Validity
- **Requirement:** 1.2, 1.3
- **Property:** For any sequence of (rating, quizResult) events, the mastery_level SHALL only transition through valid edges in the state machine: New→Learning, Learning→Reviewing, Reviewing→Mastered, {Reviewing,Mastered}→Lapsed, Lapsed→Learning
- **Rationale:** Invalid transitions (e.g., New→Mastered directly) would corrupt the learning model

### Property 5: Streak Counter Consistency
- **Requirement:** 6.4, 6.7
- **Property:** For any sequence of daily activity events, longest_streak SHALL always be greater than or equal to current_streak
- **Rationale:** The longest streak is the historical maximum and must never be less than the current value

### Property 6: Adaptive Difficulty Threshold Correctness
- **Requirement:** 3.1, 3.2
- **Property:** For any sequence of quiz scores, the upgrade suggestion SHALL only trigger when the last 3 consecutive same-level scores are all >= 90%, and the downgrade suggestion SHALL only trigger when the last 2 consecutive same-level scores are all < 50%
- **Rationale:** Premature level changes would frustrate learners; the thresholds must be strictly enforced

### Property 7: Recommendation Cache Expiry
- **Requirement:** 5.4
- **Property:** For any cached recommendation with timestamp T, getCachedRecommendations() called at time T + 24h + 1ms SHALL return null (cache miss)
- **Rationale:** Stale recommendations reduce personalization quality; the 24-hour window ensures freshness

### Property 8: Again Rating Always Resets Interval
- **Requirement:** 2.2
- **Property:** For any card state (any EF, any interval, any repetition count), applying rating Again (0) SHALL result in interval_days = 1 and repetition_count = 0
- **Rationale:** The "Again" rating indicates complete failure to recall; the card must restart from the shortest interval regardless of previous progress

## Implementation Plan (Phased)

### Phase 1: Core SRS (Tuần 1-2)

**Mục tiêu:** Xây dựng nền tảng theo dõi từ vựng và ôn tập ngắt quãng

1. Tạo bảng `word_mastery` và `user_goals` trên Supabase (với RLS)
2. Implement `srsService.ts` — thuật toán SM-2 (pure functions)
3. Implement `masteryService.ts` — CRUD word mastery + state transitions
4. Thêm `MasteryLevel` enum và types mới vào `types.ts`
5. Thêm `AppPhase.REVIEW_SESSION` vào navigation
6. Tạo `views/ReviewSession.tsx` — UI ôn tập với 4 nút rating
7. Cập nhật `views/Flashcards.tsx` — thêm mastery badge + confidence rating
8. Cập nhật `views/Dashboard.tsx` — thêm badge "X từ cần ôn"
9. Cập nhật `views/QuizMode.tsx` — ghi nhận incorrect answers vào word_mastery

### Phase 2: Analytics & Goals (Tuần 3-4)

**Mục tiêu:** Tăng engagement qua visualization và gamification

10. Implement `goalService.ts` — streak logic + daily goal tracking
11. Implement `analyticsService.ts` — data aggregation queries
12. Tạo `components/SVGCharts.tsx` — inline SVG chart components
13. Tạo `views/AnalyticsDashboard.tsx` — full analytics page
14. Thêm `AppPhase.ANALYTICS` vào navigation + header button
15. Cập nhật `views/Dashboard.tsx` — thêm goal progress circle + streak display
16. Tạo `components/Common.tsx` updates — Toast notification, CircularProgress

### Phase 3: AI-Enhanced (Tuần 5-6)

**Mục tiêu:** Cá nhân hóa sâu bằng AI

17. Implement `recommendationService.ts` — Gemini prompt + localStorage cache
18. Implement `weaknessService.ts` — pattern analysis + targeted lessons
19. Implement adaptive difficulty logic trong `masteryService.ts`
20. Cập nhật `views/Dashboard.tsx` — thêm recommendation section
21. Cập nhật `views/AnalyticsDashboard.tsx` — thêm weakness list
22. Cập nhật `services/geminiService.ts` — thêm prompts cho recommendations & weakness lessons

## Testing Strategy

| Component | Test Type | Tool |
|-----------|-----------|------|
| `srsService.ts` (SM-2) | Property-based test | fast-check |
| `masteryService.ts` (transitions) | Property-based test | fast-check |
| `goalService.ts` (streak logic) | Property-based test | fast-check |
| `normalizeWord()` | Property-based test | fast-check |
| Supabase CRUD | Integration test | Vitest + Supabase local |
| UI components | Component test | Vitest + React Testing Library |
| Gemini prompts | Manual test | Dev environment |

