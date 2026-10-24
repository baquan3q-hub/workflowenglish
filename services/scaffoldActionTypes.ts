/**
 * Scaffold Action Types
 *
 * Types for educational scaffolding, structured agentic actions
 * (sentence breakdown, vocabulary extraction with SRS save, interactive quiz),
 * and multimodal attachments.
 */

export type ScaffoldingLevel = 'hint' | 'framework' | 'deep';

export type ScaffoldActionType =
  | 'chat'
  | 'sentence_breakdown'
  | 'vocab_extract'
  | 'quiz_generate'
  | 'writing_scaffold'
  | 'speaking_scaffold';

export interface SentenceBreakdownItem {
  id: string;
  original: string;
  ipa?: string;
  translationVi: string;
  grammarAnalysis?: string;
  nuanceNotes?: string;
  keyWords?: {
    word: string;
    meaning: string;
  }[];
}

export interface ScaffoldVocabItem {
  id: string;
  word: string;
  ipa?: string;
  partOfSpeech?: string;
  level?: string; // B1, B2, C1, C2, Band 6.5, etc.
  meaningVi: string;
  exampleSentence?: string;
  exampleTranslationVi?: string;
  collocations?: string[];
  savedToSrs?: boolean;
}

export interface InteractiveQuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface InteractiveQuizItem {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'paraphrase';
  question: string;
  subPrompt?: string;
  contextSentence?: string;
  options?: InteractiveQuizOption[];
  correctAnswer?: string; // for fill_blank or paraphrase
  explanation: string;
  scaffoldHint?: string;
  userSelectedOptionId?: string;
  userAnswerText?: string;
  isAnswered?: boolean;
  isCorrect?: boolean;
}

export interface StructuredScaffoldPayload {
  sentences?: SentenceBreakdownItem[];
  vocabulary?: ScaffoldVocabItem[];
  quiz?: InteractiveQuizItem[];
}
