export enum AppPhase {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  FLASHCARDS = 'FLASHCARDS',
  STORY = 'STORY',
  QUIZ = 'QUIZ',
  FILL_BLANK = 'FILL_BLANK',
  HISTORY = 'HISTORY',
}

export enum DifficultyLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

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
