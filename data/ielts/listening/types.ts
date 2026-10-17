/**
 * IELTS Listening test data. Every script and question is written for this
 * app; nothing is copied from published tests.
 *
 * A section (one part) has speakers, a script cut into segments (one audio
 * clip each) and question groups. Blanks in completion templates are written
 * {{n}} with the question number.
 */
import type { ListeningStyle, ListeningVoice } from '../../../services/listeningAudioService';

export interface ListeningSpeaker {
  /** Used in "Name: line" dialogue text, so a single word: "Anna". */
  name: string;
  voice: ListeningVoice;
  /** Shown in the transcript, e.g. "Nhân viên lễ tân". */
  roleVi?: string;
}

export interface ScriptLine {
  speaker: string;
  text: string;
}

/** One audio clip: up to two speakers, at most ~1500 characters. */
export interface ListeningSegment {
  id: string;
  lines: ScriptLine[];
}

export interface ChoiceOption {
  key: string;
  text: string;
}

export interface ListeningQuestion {
  number: number;
  /** Question text for choice, matching, map and short-answer items. */
  prompt?: string;
  /** Multiple choice: the options for this question. */
  options?: ChoiceOption[];
  /** Accepted answers. Letters for choice, matching and map questions. */
  answers: string[];
  /** Segment that contains the answer. */
  segmentId: string;
  /** Words from the script that give the answer. */
  evidence: string;
  /** Words from the script meant to mislead. */
  distractor?: string;
  /** The question's wording and how the audio says it. */
  paraphrase?: { question: string; audio: string };
  explanationVi: string;
}

interface GroupBase {
  id: string;
  instruction: string;
  questions: ListeningQuestion[];
}

export interface CompletionGroup extends GroupBase {
  type: 'completion';
  /** Most words allowed in an answer. */
  wordLimit: number;
  /** "AND/OR A NUMBER": one number may be added on top of the words. */
  numberAllowed: boolean;
  title?: string;
  /** Form, notes or sentences, one line each. */
  lines?: string[];
  table?: { header: string[]; rows: string[][] };
}

export interface ShortAnswerGroup extends GroupBase {
  type: 'short_answer';
  wordLimit: number;
  numberAllowed: boolean;
}

/** One correct letter per question; options sit on each question. */
export interface ChoiceGroup extends GroupBase {
  type: 'mcq';
}

/** "Choose TWO letters": one question per letter to pick, all sharing `answers`. */
export interface MultiChoiceGroup extends GroupBase {
  type: 'mcq_multi';
  prompt: string;
  options: ChoiceOption[];
}

export interface MatchingGroup extends GroupBase {
  type: 'matching';
  optionsTitle?: string;
  options: ChoiceOption[];
}

export type MapShapeKind = 'building' | 'path' | 'green' | 'water' | 'entrance';

export interface MapShape {
  kind: MapShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** A named place. */
  label?: string;
  /** A lettered place to identify (A, B, …). */
  key?: string;
}

export interface MapGroup extends GroupBase {
  type: 'map';
  map: { title: string; width: number; height: number; shapes: MapShape[] };
}

export type ListeningGroup = CompletionGroup | ShortAnswerGroup | ChoiceGroup | MultiChoiceGroup | MatchingGroup | MapGroup;

export interface ListeningSection {
  id: string;
  part: 1 | 2 | 3 | 4;
  title: string;
  /** One line of context in Vietnamese: who is talking and why. */
  contextVi: string;
  style: ListeningStyle;
  speakers: ListeningSpeaker[];
  segments: ListeningSegment[];
  groups: ListeningGroup[];
  /** Seconds to read the questions before the audio (exam mode). */
  prepSeconds: number;
}

export interface ListeningTest {
  id: string;
  title: string;
  kind: 'full' | 'practice';
  descriptionVi: string;
  sections: ListeningSection[];
}

/** Letters chosen in a multi-choice group are stored on its first question, comma-separated. */
export type ListeningAnswers = Record<number, string>;
