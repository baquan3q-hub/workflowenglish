# Requirements Document

## Introduction

This feature set improves the learning quality of VocabMaster by addressing four key gaps: (1) lack of quick-mark status buttons during flashcard learning, (2) missing vocabulary metadata in SRS review sessions, (3) absence of pre-built vocabulary templates for guided learning, and (4) poor onboarding experience for new users facing an empty dashboard. Together, these changes reduce friction, enrich the review experience, and provide a clear starting path for learners.

## Glossary

- **Flashcard_View**: The existing flashcard learning view (`views/Flashcards.tsx`) that displays word cards with flip-to-reveal interaction during a generated lesson.
- **Review_Session**: The SRS-based review view (`views/ReviewSession.tsx`) that presents due words for spaced repetition practice.
- **Word_Mastery_Record**: A database row in the `word_mastery` table tracking per-user, per-word SRS state and metadata.
- **Mastery_Service**: The service layer (`services/masteryService.ts`) responsible for CRUD operations on `word_mastery` records and mastery state transitions.
- **Template**: A pre-defined vocabulary set organized by topic and CEFR level, stored as a hardcoded JSON structure in the client bundle.
- **Template_Library**: A UI view or section that displays available vocabulary templates for users to browse and select.
- **Dashboard**: The main input view (`views/Dashboard.tsx`) where users enter vocabulary, see goals/streaks, and start lessons.
- **CEFR_Level**: Common European Framework of Reference level (A1, A2, B1, B2, C1, C2) indicating language proficiency.
- **Quick_Mark_Button**: A UI button allowing learners to rapidly classify a word as remembered or needing review during flashcard study.
- **Flashcard_Metadata**: The set of linguistic data associated with a word: IPA transcription, Vietnamese meaning, English definition, example sentence, example sentence Vietnamese translation, and part of speech.

## Requirements

### Requirement 1: Flashcard Quick-Mark Status Buttons

**User Story:** As a learner, I want to quickly mark words as "Đã nhớ" (Remembered) or "Cần ôn lại" (Need Review) during flashcard study, so that I can efficiently sort words by confidence without using the full 4-button SRS rating.

#### Acceptance Criteria

1. WHEN the user flips a flashcard to reveal the back side, THE Flashcard_View SHALL display two Quick_Mark_Buttons labeled "✓ Đã nhớ" and "↻ Cần ôn lại" below the card content.
2. WHEN the user taps the "✓ Đã nhớ" Quick_Mark_Button, THE Mastery_Service SHALL update the Word_Mastery_Record with a confidence rating equivalent to "Tốt" (rating = 2) and advance the card to the next word.
3. WHEN the user taps the "↻ Cần ôn lại" Quick_Mark_Button, THE Mastery_Service SHALL update the Word_Mastery_Record with a confidence rating equivalent to "Lại" (rating = 0) and advance the card to the next word.
4. WHILE the Quick_Mark_Buttons are visible, THE Flashcard_View SHALL hide the existing 4-button SRS rating panel to avoid duplicate rating controls.
5. THE Flashcard_View SHALL display the Quick_Mark_Buttons for all mastery levels including NEW words, enabling first-time classification.
6. WHEN a Quick_Mark_Button is tapped, THE Flashcard_View SHALL provide visual feedback (brief color flash or animation) before advancing to the next card.

### Requirement 2: Rich Review Session Cards with Flashcard Metadata

**User Story:** As a learner reviewing due words, I want to see the full flashcard information (Vietnamese meaning, English definition, IPA, example sentence, part of speech) on the review card back, so that I can properly recall and verify my understanding.

#### Acceptance Criteria

1. THE Word_Mastery_Record SHALL store Flashcard_Metadata fields: `ipa`, `meaning_vi`, `definition_en`, `example_sentence`, `example_sentence_vi`, and `part_of_speech` as nullable text columns.
2. WHEN a lesson is generated and words are saved to `word_mastery`, THE Mastery_Service SHALL store the Flashcard_Metadata from the generated lesson alongside the word, without overwriting existing SRS state fields.
3. WHEN the user flips a review card in the Review_Session, THE Review_Session SHALL display the stored Flashcard_Metadata on the back of the card: Vietnamese meaning, English definition, IPA transcription, example sentence with Vietnamese translation, and part of speech.
4. IF a Word_Mastery_Record has no stored Flashcard_Metadata (legacy rows), THEN THE Review_Session SHALL display only the word text and mastery statistics on the back, without rendering empty metadata sections.
5. THE Mastery_Service SHALL provide a `bulkEnsureWordsWithMetadata` function that accepts an array of FlashcardData objects and upserts Word_Mastery_Records with metadata, preserving existing SRS state for words that already have rows.
6. WHEN metadata is stored, THE Mastery_Service SHALL normalize the word field identically to the existing `normalizeWord` function to maintain the unique constraint on `(user_id, word)`.

### Requirement 3: Vocabulary Templates Library

**User Story:** As a learner, I want to browse pre-built vocabulary sets organized by topic and CEFR level, so that I can quickly start learning relevant words without manually typing them.

#### Acceptance Criteria

1. THE Template_Library SHALL provide a collection of 10 to 20 vocabulary templates, each containing 8 to 15 English words with Vietnamese meanings.
2. THE Template_Library SHALL organize templates by topic (e.g., Travel, Business, Academic/IELTS, Technology, Daily Life) and CEFR_Level (A1 through C1).
3. THE Template_Library SHALL store template data as a hardcoded TypeScript file (`data/vocabularyTemplates.ts`) bundled with the client application, requiring no database table.
4. WHEN the user selects a template and taps "Học ngay" (Learn now), THE Dashboard SHALL populate the vocabulary input textarea with the template words and set the CEFR level and topic to match the template, then trigger lesson generation automatically.
5. THE Template_Library SHALL display each template as a card showing: template name (Vietnamese), topic tag, CEFR level badge, word count, and 3-4 sample words as preview.
6. WHEN the user navigates to the Template_Library, THE Template_Library SHALL allow filtering templates by CEFR_Level.
7. THE Template_Library SHALL be accessible from the Dashboard via a clearly visible "Thư viện từ vựng" (Vocabulary Library) button or tab.

### Requirement 4: Dashboard Onboarding with Template Suggestions

**User Story:** As a new user with no learning history, I want to see template suggestions on the Dashboard instead of an empty textarea, so that I have a clear starting point for my learning journey.

#### Acceptance Criteria

1. WHILE the user has no learning history records and the vocabulary textarea is empty, THE Dashboard SHALL display a prominent onboarding section suggesting 3-4 featured templates from the Template_Library.
2. WHEN the user taps a suggested template in the onboarding section, THE Dashboard SHALL behave identically to selecting a template from the Template_Library: populate words, set level/topic, and trigger lesson generation.
3. THE Dashboard SHALL display the onboarding section above the vocabulary input area with a welcoming message guiding the user to pick a template.
4. WHEN the user has at least one learning history record, THE Dashboard SHALL hide the onboarding template suggestions section.
5. IF the user dismisses the onboarding section or begins typing in the textarea, THEN THE Dashboard SHALL hide the onboarding section for the current session.

### Requirement 5: Database Migration for Flashcard Metadata Columns

**User Story:** As a developer, I want the `word_mastery` table extended with metadata columns, so that flashcard information can be stored alongside SRS state without requiring a separate table.

#### Acceptance Criteria

1. THE migration SHALL add six nullable columns to the `word_mastery` table: `ipa` (TEXT), `meaning_vi` (TEXT), `definition_en` (TEXT), `example_sentence` (TEXT), `example_sentence_vi` (TEXT), and `part_of_speech` (TEXT).
2. THE migration SHALL use `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` to ensure existing rows remain valid without requiring data backfill.
3. THE migration SHALL not modify existing columns, constraints, indexes, or RLS policies on the `word_mastery` table.
4. WHEN the migration is applied, THE Word_Mastery_Record TypeScript interface SHALL be updated to include the six new optional fields matching the database column names.
