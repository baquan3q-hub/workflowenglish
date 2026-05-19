# Design Document: Learning Quality V2

## Overview

This design covers four interconnected improvements to VocabMaster's learning experience:
1. Quick-Mark buttons replacing the 4-button SRS panel during flashcard study
2. Rich metadata display on Review Session back cards
3. A hardcoded Vocabulary Templates Library
4. Dashboard onboarding with template suggestions for new users

All changes integrate with the existing state-based routing (`AppPhase` enum), Supabase backend, and service layer architecture.

---

## Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         App.tsx (State Hub)                          │
│  lessonData, phase, currentUser                                     │
└──────┬──────────────┬──────────────┬──────────────┬─────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐
│Flashcards│  │ReviewSession │  │Dashboard │  │TemplateLibrary   │
│(Quick-   │  │(Rich back    │  │(Onboard- │  │(Modal/Section)   │
│ Mark)    │  │ card)        │  │ ing)     │  │                  │
└────┬─────┘  └──────┬───────┘  └────┬─────┘  └────────┬─────────┘
     │               │               │                  │
     ▼               ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    masteryService.ts                                  │
│  bulkEnsureWordsWithMetadata() ← NEW                                │
│  upsertWordMastery() (existing)                                      │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Supabase: word_mastery table                             │
│  + ipa, meaning_vi, definition_en, example_sentence,                 │
│    example_sentence_vi, part_of_speech (6 new nullable TEXT cols)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy Changes

```
App.tsx
├── Dashboard.tsx
│   ├── OnboardingSection (new inline section)
│   │   └── TemplateCard[] (featured templates)
│   └── TemplateLibraryModal (new component)
│       ├── LevelFilter
│       └── TemplateCard[]
├── Flashcards.tsx
│   └── QuickMarkButtons (replaces 4-button SRS panel)
└── ReviewSession.tsx
    └── RichBackCard (enhanced back card with metadata)
```

---

## Components and Interfaces

### QuickMarkButtons (inline in Flashcards.tsx)

```typescript
// Replaces the existing RATING_BUTTONS 4-button panel
interface QuickMarkConfig {
  label: string;        // "✓ Đã nhớ" or "↻ Cần ôn lại"
  rating: ConfidenceRating; // 2 or 0
  bgColor: string;      // Tailwind class
  flashColor: string;   // Tailwind class for feedback animation
}

const QUICK_MARK_BUTTONS: QuickMarkConfig[] = [
  { label: '✓ Đã nhớ', rating: 2, bgColor: 'bg-emerald-500', flashColor: 'bg-emerald-300' },
  { label: '↻ Cần ôn lại', rating: 0, bgColor: 'bg-orange-500', flashColor: 'bg-orange-300' },
];
```

**Props:** None (inline in Flashcards, uses parent state)
**Visibility:** `isFlipped === true` (for ALL mastery levels including NEW)
**Behavior:** On tap → visual flash → save rating → advance card

### TemplateLibraryModal

```typescript
interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: VocabularyTemplate) => void;
}
```

**Internal state:** `selectedLevel: DifficultyLevel | 'ALL'`
**Renders:** Filter bar + responsive grid of template cards
**Each card shows:** name, topic badge, CEFR badge, word count, 3-4 sample words, "Học ngay" button

### RichBackCard (inline in ReviewSession.tsx)

```typescript
// Determines whether to show rich or minimal back card
function hasMetadata(card: WordMasteryRecord): boolean {
  return !!(card.ipa || card.meaning_vi || card.definition_en ||
            card.example_sentence || card.example_sentence_vi || card.part_of_speech);
}
```

**Behavior:** If `hasMetadata(currentCard)` → render full metadata layout. Otherwise → render existing minimal layout.

### VocabularyTemplate Interface

```typescript
export interface VocabularyTemplate {
  id: string;                    // Unique identifier (e.g. "travel-a2")
  name: string;                  // Vietnamese display name
  topic: string;                 // Topic tag matching TOPICS array
  cefrLevel: DifficultyLevel;    // A1-C1
  words: string[];               // 8-15 English words
  meanings: string[];            // Vietnamese meanings (same length as words)
  samplePreview: string[];       // 3-4 words for card preview (subset of words)
}
```

### bulkEnsureWordsWithMetadata Function

```typescript
export async function bulkEnsureWordsWithMetadata(
  userId: string,
  flashcards: FlashcardData[],
): Promise<void>;
```

**Contract:**
- Normalizes all words via `normalizeWord()`
- Deduplicates by normalized word
- Skips empty/whitespace-only words
- Maps FlashcardData fields to DB columns
- Upserts with `onConflict: 'user_id,word'`
- Never overwrites existing SRS state (mastery_level, easiness_factor, interval_days, repetition_count, next_review_date)
- Fills metadata columns only (ipa, meaning_vi, definition_en, example_sentence, example_sentence_vi, part_of_speech)

---

## Data Models

### Database: word_mastery (extended)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| ipa | TEXT | NULL | IPA transcription |
| meaning_vi | TEXT | NULL | Vietnamese meaning |
| definition_en | TEXT | NULL | English definition |
| example_sentence | TEXT | NULL | Example sentence in English |
| example_sentence_vi | TEXT | NULL | Vietnamese translation of example |
| part_of_speech | TEXT | NULL | Part of speech (noun, verb, etc.) |

All 6 columns are nullable, added via ALTER TABLE. No indexes needed (queried only when fetching a specific row).

### TypeScript: WordMasteryRecord (extended)

```typescript
export interface WordMasteryRecord {
  // ... existing 13 fields unchanged ...
  ipa?: string | null;
  meaning_vi?: string | null;
  definition_en?: string | null;
  example_sentence?: string | null;
  example_sentence_vi?: string | null;
  part_of_speech?: string | null;
}
```

### Template Data Structure

Stored in `data/vocabularyTemplates.ts` as:
```typescript
export const VOCABULARY_TEMPLATES: VocabularyTemplate[] = [
  {
    id: 'travel-a2',
    name: 'Du lịch cơ bản',
    topic: 'Travel & Tourism',
    cefrLevel: DifficultyLevel.A2,
    words: ['airport', 'luggage', 'passport', ...],
    meanings: ['sân bay', 'hành lý', 'hộ chiếu', ...],
    samplePreview: ['airport', 'luggage', 'passport', 'hotel'],
  },
  // ... 9-19 more templates
];
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| `bulkEnsureWordsWithMetadata` fails | Log error, don't block flashcard display (same as existing `bulkEnsureWords` pattern) |
| Quick-Mark save fails | Show inline error text below buttons, keep buttons enabled for retry |
| ReviewSession metadata fields partially null | Render only non-null fields; skip sections with null data |
| Template Library modal fails to render | Catch at component level, show "Không thể tải thư viện" message |
| Onboarding history count query fails | Default to hiding onboarding (fail closed) |
| Migration not applied (columns missing) | Supabase returns null for missing columns; TypeScript optional fields handle gracefully |

---

## Testing Strategy

- **Unit tests:** `bulkEnsureWordsWithMetadata` — verify normalization, deduplication, metadata mapping, SRS preservation
- **Unit tests:** `hasMetadata` helper — verify true/false for various null combinations
- **Integration test:** Quick-Mark flow — verify rating=2 for "Đã nhớ", rating=0 for "Cần ôn lại", card advancement
- **Manual test:** Template Library modal — filter by level, select template, verify textarea population and auto-generation
- **Manual test:** Onboarding visibility — new user sees section, existing user doesn't, typing hides it
- **Migration test:** Run SQL on test DB, verify columns exist with NULL defaults, existing rows unaffected

---

## Correctness Properties

### Property 1: Quick-Mark Rating Mapping

**Validates: Requirements 1.2, 1.3**

For all Quick-Mark button taps, "Đã nhớ" always produces exactly rating=2 and "Cần ôn lại" always produces exactly rating=0. No intermediate or alternative ratings are possible from the Quick-Mark UI.

### Property 2: Metadata Preservation on Upsert

**Validates: Requirements 2.5, 2.2**

For all calls to `bulkEnsureWordsWithMetadata`, if a word_mastery row already exists for (user_id, word), the SRS state fields (mastery_level, easiness_factor, interval_days, repetition_count, next_review_date, last_reviewed_at, correct_count, incorrect_count) remain unchanged after the upsert.

### Property 3: Word Normalization Idempotence

**Validates: Requirements 2.6**

`normalizeWord(normalizeWord(w)) === normalizeWord(w)` for all string inputs. This ensures metadata upserts match existing rows correctly regardless of input casing or whitespace.

### Property 4: Template Data Integrity

**Validates: Requirements 3.1, 3.2, 3.5**

For every template in VOCABULARY_TEMPLATES: `words.length >= 8 && words.length <= 15 && words.length === meanings.length && samplePreview.length >= 3 && samplePreview.length <= 4 && samplePreview.every(w => words.includes(w)) && Object.values(DifficultyLevel).includes(cefrLevel)`.

### Property 5: Review Card Fallback Completeness

**Validates: Requirements 2.4**

For any WordMasteryRecord where all 6 metadata fields are null/undefined, the ReviewSession back card renders the legacy minimal layout. For any record where at least one metadata field is non-null, the rich layout is rendered.

### Property 6: Onboarding Visibility Invariant

**Validates: Requirements 4.1, 4.4, 4.5**

The onboarding section is visible if and only if: `historyCount === 0 AND inputText.trim() === '' AND onboardingDismissed === false`. Any violation of these three conditions hides the section.

---

## File Structure (New/Modified)

```
Work-FlowEnglish/
├── data/
│   └── vocabularyTemplates.ts          # NEW: hardcoded template data
├── components/
│   └── TemplateLibraryModal.tsx         # NEW: modal component
├── views/
│   ├── Dashboard.tsx                    # MODIFIED: onboarding + template button
│   ├── Flashcards.tsx                   # MODIFIED: quick-mark buttons
│   └── ReviewSession.tsx                # MODIFIED: rich back card
├── services/
│   └── masteryService.ts               # MODIFIED: bulkEnsureWordsWithMetadata
├── types.ts                            # MODIFIED: WordMasteryRecord + VocabularyTemplate
└── docs/migrations/
    └── 002_flashcard_metadata.sql       # NEW: ALTER TABLE migration
```
