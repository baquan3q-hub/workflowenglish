import type { IeltsQuestion, IeltsWritingTask } from '../types';
import type { BandEssay, SampleNote } from '../data/ielts/writingSamples';

export interface AnnotatedPiece {
  text: string;
  /** Index of the note in the paragraph's notes, numbered from 0. */
  note?: number;
}

/**
 * Splits a paragraph into plain text and the quoted spans of its notes. Each
 * quote marks its first occurrence; a quote that is missing or overlaps an
 * earlier one is skipped.
 */
export function annotateParagraph(text: string, notes: ReadonlyArray<SampleNote> = []): AnnotatedPiece[] {
  const spans = notes
    .map((n, note) => ({ note, start: text.indexOf(n.quote), end: text.indexOf(n.quote) + n.quote.length }))
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start);
  const pieces: AnnotatedPiece[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start < at) continue;
    if (s.start > at) pieces.push({ text: text.slice(at, s.start) });
    pieces.push({ text: text.slice(s.start, s.end), note: s.note });
    at = s.end;
  }
  if (at < text.length) pieces.push({ text: text.slice(at) });
  return pieces;
}

export function essayWordCount(essay: BandEssay): number {
  return essay.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
}

/** Short criterion names in the order of `BandEssay.scores`. */
export function criterionLabels(task: IeltsWritingTask): [string, string, string, string] {
  return [task === 'task_1' ? 'Task Achievement' : 'Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammar'];
}

/** Topics of the given questions, in order of first appearance. */
export function questionTopics(questions: ReadonlyArray<IeltsQuestion>): string[] {
  return [...new Set(questions.map((q) => q.topic))];
}
