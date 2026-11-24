/** Grammar module content model. One bank of lessons serves the roadmap and the topic hubs. */

export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HubId =
  | 'tenses'
  | 'passive'
  | 'conjunctions'
  | 'adverbs'
  | 'conditionals'
  | 'relative'
  | 'modals'
  | 'questions'
  | 'word-classes'
  | 'sentence'
  | 'ielts-writing';

/** Light entry, loaded with the module: enough to draw the roadmap, hubs and search. */
export interface LessonMeta {
  id: string;
  stage: StageId;
  cefr: Cefr;
  title: string;
  en: string;
  /** What the learner can say or write after the lesson. */
  hook: string;
  prereq: string[];
  aliases?: string[];
}

export interface Form {
  label: string;
  pattern: string;
  example: string;
}
export interface Example {
  /** Square brackets mark the part to notice. */
  en: string;
  vi: string;
}
export interface Contrast {
  /** Lesson the learner tends to confuse this one with. */
  with?: string;
  title: string;
  rule: string;
  pairs: { a: string; b: string; meaning: string }[];
}
export interface Trap {
  wrong: string;
  right: string;
  why: string;
}

/** Recognition (1) → controlled production (2) → translate (3) → write (4) → speak (5). */
export type Level = 1 | 2 | 3 | 4 | 5;
export type ItemKind = 'choice' | 'spot' | 'fill' | 'fix' | 'order' | 'translate' | 'write' | 'speak';

interface ItemBase {
  /** Stable, derived from the lesson and the item text. */
  id: string;
  kind: ItemKind;
  level: Level;
  /** Used by the placement test. */
  diag?: boolean;
  /** Held back for spaced review. */
  review?: boolean;
}
export interface ChoiceItem extends ItemBase {
  kind: 'choice';
  prompt: string;
  answer: string;
  options: string[];
  why: string;
}
export interface SpotItem extends ItemBase {
  kind: 'spot';
  /** First sentence is the correct one; the screen shuffles them. */
  sentences: string[];
  why: string;
}
export interface FillItem extends ItemBase {
  kind: 'fill';
  prompt: string;
  /** Shown in brackets after the gap, e.g. the base verb. */
  cue?: string;
  answer: string;
  accept: string[];
  why: string;
}
export interface FixItem extends ItemBase {
  kind: 'fix';
  wrong: string;
  answer: string;
  accept: string[];
  why: string;
}
export interface OrderItem extends ItemBase {
  kind: 'order';
  /** Chunks in the correct order. */
  chunks: string[];
  answer: string;
  why: string;
}
export interface OpenItem extends ItemBase {
  kind: 'translate' | 'write' | 'speak';
  task: string;
  /** A model answer, shown after grading and given to the AI as a reference. */
  model: string;
  /** Other good answers. */
  alts?: string[];
}
export type Item = ChoiceItem | SpotItem | FillItem | FixItem | OrderItem | OpenItem;

export interface LessonBody {
  id: string;
  when: string[];
  why: string;
  forms: Form[];
  examples: Example[];
  contrast?: Contrast;
  traps: Trap[];
  ielts?: string;
  items: Item[];
}
export type Lesson = LessonMeta & LessonBody;
