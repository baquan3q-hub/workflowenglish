/**
 * IELTS Reading (Academic) test data. Every passage and question is written
 * for this app; nothing is copied from published tests.
 *
 * A passage is a list of lettered paragraphs (A, B, …) and question groups.
 * Every question names the paragraph that holds its answer and quotes the
 * words that give it, so review can scroll there and highlight them. Blanks
 * in completion templates are written {{n}} with the question number.
 */
import type { ChoiceOption } from '../listening/types';

export type { ChoiceOption };

/** What the question tests, for the per-skill breakdown after a test. */
export type ReadingSkill = 'scan' | 'skim' | 'detail' | 'inference' | 'main_idea';

export type ReadingDifficulty = 'easy' | 'medium' | 'hard';

export interface ReadingParagraph {
  /** "A", "B", …: the letter the passage prints and matching questions use. */
  label: string;
  text: string;
}

export interface ReadingQuestion {
  number: number;
  /**
   * The statement (TRUE/FALSE/NOT GIVEN), the question (choice, short answer),
   * the information to locate (matching paragraphs), the person's view or the
   * sentence beginning (matching features or endings).
   */
  prompt?: string;
  /** Multiple choice: the options for this question. */
  options?: ChoiceOption[];
  /**
   * Accepted answers: words for completion and short answer; letters for
   * choice, matching and word-box questions; a heading key ("iv") for
   * headings; TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN for those groups.
   */
  answers: string[];
  /** Label of the paragraph that holds the answer (the one asked about, for headings). */
  paragraph: string;
  /**
   * Words from that paragraph that give the answer. For NOT GIVEN, the words
   * that come closest, showing what the passage does and does not say.
   */
  evidence: string;
  /** Words from the passage meant to mislead. */
  distractor?: string;
  /** The question's wording and how the passage says it. */
  paraphrase?: { question: string; passage: string };
  explanationVi: string;
  skill: ReadingSkill;
}

interface GroupBase {
  id: string;
  instruction: string;
  questions: ReadingQuestion[];
}

/**
 * Sentence, summary, note, table and flow-chart completion. With a word box
 * the learner picks a letter for each blank instead of copying words.
 */
export interface ReadingCompletionGroup extends GroupBase {
  type: 'completion';
  /** Most words allowed in an answer (ignored with a word box). */
  wordLimit: number;
  /** "AND/OR A NUMBER": one number may be added on top of the words. */
  numberAllowed: boolean;
  title?: string;
  /** Sentences, a summary paragraph, notes or flow-chart steps, one per line. */
  lines?: string[];
  table?: { header: string[]; rows: string[][] };
  /** "flowchart" draws the lines as steps joined by arrows. */
  layout?: 'lines' | 'flowchart';
  /** Summary with a box of words: answers are its letters. */
  wordBox?: ChoiceOption[];
}

export interface ReadingShortAnswerGroup extends GroupBase {
  type: 'short_answer';
  wordLimit: number;
  numberAllowed: boolean;
}

/** One correct letter per question; options sit on each question. */
export interface ReadingChoiceGroup extends GroupBase {
  type: 'mcq';
}

/** "Choose TWO letters": one question per letter to pick, all sharing `answers`. */
export interface ReadingMultiChoiceGroup extends GroupBase {
  type: 'mcq_multi';
  prompt: string;
  options: ChoiceOption[];
}

/** TRUE/FALSE/NOT GIVEN (facts) or YES/NO/NOT GIVEN (the writer's views). */
export interface TfngGroup extends GroupBase {
  type: 'tfng';
  variant: 'tfng' | 'ynng';
}

/** A heading for each listed paragraph; there are always more headings than paragraphs. */
export interface HeadingsGroup extends GroupBase {
  type: 'headings';
  /** Keys are Roman numerals: i, ii, iii, … */
  headings: ChoiceOption[];
  /** A paragraph done as an example; its heading is not used again. */
  example?: { paragraph: string; heading: string };
}

/**
 * Matching information (which paragraph contains…), features (which person
 * or thing said…) and sentence endings.
 */
export interface ReadingMatchingGroup extends GroupBase {
  type: 'matching';
  target: 'paragraph' | 'feature' | 'ending';
  optionsTitle?: string;
  /** For `paragraph`, the paragraph labels; otherwise the people, things or endings. */
  options: ChoiceOption[];
  /** "You may use any letter more than once." */
  reuse?: boolean;
}

export type DiagramShapeKind = 'box' | 'circle' | 'line' | 'arrow';

/** One part of a labelled diagram; `text` may hold a blank {{n}}. */
export interface DiagramShape {
  kind: DiagramShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
}

/** Label a diagram: each blank sits in a shape's text. */
export interface DiagramGroup extends GroupBase {
  type: 'diagram';
  wordLimit: number;
  numberAllowed: boolean;
  diagram: { title: string; width: number; height: number; shapes: DiagramShape[] };
}

export type ReadingGroup =
  | ReadingCompletionGroup
  | ReadingShortAnswerGroup
  | ReadingChoiceGroup
  | ReadingMultiChoiceGroup
  | TfngGroup
  | HeadingsGroup
  | ReadingMatchingGroup
  | DiagramGroup;

export type ReadingGroupType = ReadingGroup['type'];

export interface GlossaryEntry {
  term: string;
  meaningVi: string;
}

export interface ReadingPassage {
  id: string;
  part: 1 | 2 | 3;
  title: string;
  /** Short topic tag: "science", "history", … */
  topic: string;
  difficulty: ReadingDifficulty;
  /** A line under the title, as some passages have. */
  subtitle?: string;
  paragraphs: ReadingParagraph[];
  groups: ReadingGroup[];
  /** Hard words in this passage, shown when tapped. */
  glossary?: GlossaryEntry[];
  /** Practice-mode timer: 17, 20 and 23 minutes add up to the exam's 60. */
  suggestedMinutes: number;
}

export interface ReadingTest {
  id: string;
  title: string;
  kind: 'full' | 'practice';
  descriptionVi: string;
  passages: ReadingPassage[];
}

/** Letters chosen in a multi-choice group are stored on its first question, comma-separated. */
export type ReadingAnswers = Record<number, string>;
