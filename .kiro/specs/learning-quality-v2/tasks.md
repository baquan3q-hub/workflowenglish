# Implementation Plan: Learning Quality V2

## Overview

This plan implements 5 requirements covering Quick-Mark flashcard buttons, rich Review Session metadata, a Vocabulary Templates Library, Dashboard onboarding, and the supporting database migration. Tasks are ordered by dependency: types/migration first, then service layer, then UI components.

## Tasks

- [ ] 1. Create database migration `docs/migrations/002_flashcard_metadata.sql` adding 6 nullable TEXT columns (ipa, meaning_vi, definition_en, example_sentence, example_sentence_vi, part_of_speech) to word_mastery table using ALTER TABLE ADD COLUMN DEFAULT NULL
- [ ] 2. Update `WordMasteryRecord` interface in `types.ts` to add 6 optional metadata fields (ipa, meaning_vi, definition_en, example_sentence, example_sentence_vi, part_of_speech as `string | null`)
- [ ] 3. Add `VocabularyTemplate` interface to `types.ts` with fields: id, name, topic, cefrLevel, words array, meanings array, samplePreview array
- [ ] 4. Implement `bulkEnsureWordsWithMetadata(userId, flashcards)` in `services/masteryService.ts` — upserts word_mastery rows with metadata from FlashcardData, normalizes words, deduplicates, preserves existing SRS state fields for words that already have rows
- [ ] 5. Remove the existing 4-button SRS rating panel (shouldShowRatingPrompt condition and RATING_BUTTONS grid) from `views/Flashcards.tsx`
- [ ] 6. Add Quick-Mark buttons to Flashcards that appear when isFlipped is true for ALL mastery levels: "✓ Đã nhớ" (green, rating=2) and "↻ Cần ôn lại" (orange, rating=0), with visual feedback flash and auto-advance to next card
- [ ] 7. Replace `bulkEnsureWords` call with `bulkEnsureWordsWithMetadata` in Flashcards useEffect to store metadata on first lesson encounter
- [ ] 8. Modify ReviewSession back card to display rich metadata when available: IPA + part_of_speech, meaning_vi, definition_en in styled box, example_sentence + example_sentence_vi in blue box, with fallback to minimal layout when all metadata fields are null
- [ ] 9. Create `data/vocabularyTemplates.ts` with 10-20 hardcoded VocabularyTemplate objects covering topics (Travel, Business, Academic/IELTS, Technology, Daily Life) and levels (A1-C1), each with 8-15 words and matching Vietnamese meanings
- [ ] 10. Create `components/TemplateLibraryModal.tsx` — modal with responsive template card grid, CEFR level filter pills, each card showing name/topic/level/word count/preview, and "Học ngay" button calling onSelectTemplate callback
- [ ] 11. Add "📚 Thư viện từ vựng" button to Dashboard that opens TemplateLibraryModal, and implement handleSelectTemplate to populate textarea with template words, set level/topic, and trigger lesson generation
- [ ] 12. Add onboarding section to Dashboard shown when user has 0 learning_history records and textarea is empty: welcoming message + 3-4 featured template cards, hidden on typing or after first lesson completion

## Task Dependency Graph

```json
{
  "waves": [
    {"tasks": [1, 3]},
    {"tasks": [2, 5, 9]},
    {"tasks": [4, 6, 10]},
    {"tasks": [7, 8, 11]},
    {"tasks": [12]}
  ]
}
```

- Wave 1: Migration (1) and VocabularyTemplate type (3) have no dependencies
- Wave 2: WordMasteryRecord types (2) depends on migration (1); remove old panel (5) is independent; template data (9) depends on type (3)
- Wave 3: Service function (4) depends on types (2); Quick-Mark buttons (6) depend on panel removal (5); modal (10) depends on data (9)
- Wave 4: Flashcards integration (7) and ReviewSession (8) depend on service (4); Dashboard integration (11) depends on modal (10)
- Wave 5: Onboarding (12) depends on Dashboard integration (11)

## Notes

- The migration (Task 1) must be run on Supabase before testing Tasks 4, 7, 8
- Quick-Mark buttons (Tasks 5-6) can be developed in parallel with Template Library (Tasks 9-12)
- ReviewSession rich card (Task 8) depends on both the migration and the service function
- No new AppPhase is needed — Template Library is a modal overlay on Dashboard
