export enum AppPhase {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  FLASHCARDS = 'FLASHCARDS',
  STORY = 'STORY',
  QUIZ = 'QUIZ',
  FILL_BLANK = 'FILL_BLANK',
  HISTORY = 'HISTORY',
  REVIEW_SESSION = 'REVIEW_SESSION',
  ANALYTICS = 'ANALYTICS',
  IELTS_WRITING_HUB = 'IELTS_WRITING_HUB',
  IELTS_WRITING_PRACTICE = 'IELTS_WRITING_PRACTICE',
  IELTS_WRITING_FEEDBACK = 'IELTS_WRITING_FEEDBACK',
  IELTS_SPEAKING_HUB = 'IELTS_SPEAKING_HUB',
  IELTS_SPEAKING_PRACTICE = 'IELTS_SPEAKING_PRACTICE',
  IELTS_SPEAKING_FEEDBACK = 'IELTS_SPEAKING_FEEDBACK',
}

// ─── IELTS Module Types ────────────────────────────────────────────

export type IeltsSkill = 'writing' | 'speaking';
export type IeltsWritingTask = 'task_1' | 'task_2';
export type IeltsSpeakingPart = 'part_1' | 'part_2' | 'part_3';
export type IeltsEssayType = 'opinion' | 'discussion' | 'advantages_disadvantages' | 'problem_solution' | 'cause_effect' | 'two_part';
export type IeltsDifficulty = 'easy' | 'medium' | 'hard';
export type IeltsPopularity = 'common' | 'recent' | 'rare' | 'high_frequency';

export interface IeltsQuestion {
  id: string;
  skill: IeltsSkill;
  taskOrPart: IeltsWritingTask | IeltsSpeakingPart;
  questionType: string;
  topic: string;
  difficulty: IeltsDifficulty;
  popularity?: IeltsPopularity;
  prompt: string;
  frameworkId: string;
  sampleAnswer?: string;
  targetBand: string;
  planningPrompts?: string[];
  vocabulary?: string[];
  grammarFocus?: string[];
  chartData?: any;
  subQuestions?: string[];
}

export interface IeltsCriterionScore {
  name: string;
  nameVi: string;
  score: number;
  comment: string;
}

export interface IeltsSentenceCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface IeltsAiFeedback {
  estimatedBand: number;
  criterionScores: IeltsCriterionScore[];
  strengths: string[];
  weaknesses: string[];
  sentenceCorrections: IeltsSentenceCorrection[];
  improvedVersion: string;
  nextActions: string[];
  pronunciationNotes?: string[];
  followUpDrill?: string;
}

export interface IeltsAttempt {
  id?: string;
  userId: string;
  skill: IeltsSkill;
  taskOrPart: string;
  questionType: string;
  topic: string;
  questionPrompt: string;
  answerText: string;
  audioUrl?: string;
  durationSeconds?: number;
  wordCount?: number;
  estimatedBand?: number;
  criterionScores?: Record<string, number>;
  aiFeedback?: IeltsAiFeedback;
  attemptNumber?: number;
  createdAt?: string;
}

export interface IeltsFramework {
  id: string;
  skill: IeltsSkill;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  steps: { label: string; detail: string }[];
  sample: string;
}

export enum DifficultyLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export enum MasteryLevel {
  NEW = 0,
  LEARNING = 1,
  REVIEWING = 2,
  MASTERED = 3,
  LAPSED = 4,
}

/**
 * User self-assessed confidence after reviewing a card.
 * 0 = Again (Lại), 1 = Hard (Khó), 2 = Good (Tốt), 3 = Easy (Dễ)
 */
export type ConfidenceRating = 0 | 1 | 2 | 3;

export interface FlashcardData {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaningVietnamese: string;
  definitionEnglish: string;
  exampleSentence: string;
  exampleSentenceVietnamese: string;
}

export interface StoryData {
  title: string;
  content: string;
  translation: string; // Full Vietnamese translation
  audioBase64?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: 'multiple-choice' | 'fill-blank';
}

export interface GeneratedLesson {
  flashcards: FlashcardData[];
  story: StoryData;
  quiz: QuizQuestion[];
}

export interface UserSettings {
  level: DifficultyLevel;
  topic: string;
}

/**
 * Context captured when a user answers a quiz question incorrectly.
 * Used for weakness pattern analysis.
 */
export interface IncorrectContext {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  timestamp: string; // ISO 8601
}

/**
 * Per-(user, word) SRS state. Mirrors the `word_mastery` table schema
 * defined in `docs/migrations/001_personalized_learning.sql` and
 * `docs/migrations/002_flashcard_metadata.sql`.
 */
export interface WordMasteryRecord {
  id: string;
  user_id: string;
  word: string;
  mastery_level: MasteryLevel;
  easiness_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string; // ISO 8601 timestamptz
  last_reviewed_at: string | null; // ISO 8601 timestamptz
  correct_count: number;
  incorrect_count: number;
  incorrect_contexts: IncorrectContext[];
  created_at: string;
  updated_at: string;
  // Flashcard metadata (nullable — legacy rows may not have these)
  ipa?: string | null;
  meaning_vi?: string | null;
  definition_en?: string | null;
  example_sentence?: string | null;
  example_sentence_vi?: string | null;
  part_of_speech?: string | null;
}

/**
 * Per-user goals and streak state. Mirrors the `user_goals` table schema
 * defined in `docs/migrations/001_personalized_learning.sql`.
 */
export interface UserGoals {
  id: string;
  user_id: string;
  daily_word_goal: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  words_reviewed_today: number;
  last_review_reset_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  preferred_level: string; // CEFR level (e.g. 'B1')
  created_at: string;
  updated_at: string;
}

/**
 * AI-generated word recommendation surfaced on the dashboard.
 */
export interface WordRecommendation {
  word: string;
  meaningVietnamese: string;
  cefrLevel: string;
  topic: string;
  relevanceReason: string;
}

/**
 * Detected weakness pattern derived from incorrect answers.
 */
export interface WeaknessPattern {
  category: string;
  categoryVi: string;
  errorCount: number;
  examples: Array<{
    word: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }>;
  status: 'active' | 'improving' | 'resolved';
}

/**
 * A pre-built vocabulary set organized by topic and CEFR level.
 * Stored as hardcoded data in `data/vocabularyTemplates.ts`.
 */
export interface VocabularyTemplate {
  id: string;
  name: string;                  // Vietnamese display name
  topic: string;                 // Topic tag (matches TOPICS array in Dashboard)
  cefrLevel: DifficultyLevel;
  words: string[];               // 8-15 English words
  meanings: string[];            // Vietnamese meanings (same length as words)
  samplePreview: string[];       // 3-4 words for card preview
}
