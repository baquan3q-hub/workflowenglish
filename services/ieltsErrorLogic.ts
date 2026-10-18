/**
 * Error log (pure): the sentence corrections of Writing and Speaking attempts
 * grouped by error label, with how often each one comes back, whether it is
 * getting better, and examples from the learner's own answers. Corrections
 * saved before labels existed (or with an unknown label) go under "Khác".
 */

import type { IeltsAttempt, IeltsSkill } from '../types';
import { ERROR_CATEGORIES, errorCategory, type ErrorCategoryInfo } from '../data/ielts/errorCategories';
import { WRITING_ERRORS_LESSON_ID } from '../data/ielts/library';
import { normalizeSentence, stripBold } from './sentenceLogic';

export type ErrorSkill = Extract<IeltsSkill, 'writing' | 'speaking'>;
export type ErrorTrend = 'up' | 'down' | 'flat';

export const OTHER_CATEGORY = 'other';
export const OTHER_LABEL = 'Khác';
/** Change in errors per attempt between the older and newer half that counts as a trend. */
export const TREND_STEP = 0.25;
/** Attempts needed before a trend is shown (two in each half). */
export const TREND_MIN_ATTEMPTS = 4;
/** A single slip says nothing about a trend. */
export const TREND_MIN_ERRORS = 2;
export const EXAMPLE_LIMIT = 3;

export interface LoggedError {
  /** A label id from data/ielts/errorCategories.ts, or OTHER_CATEGORY. */
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  skill: ErrorSkill;
  attemptId?: string;
  createdAt?: string;
  /** Position of the attempt among the graded ones, newest = 0. */
  attemptIndex: number;
}

export interface ErrorSummary {
  category: string;
  info?: ErrorCategoryInfo;
  label: string;
  total: number;
  bySkill: Record<ErrorSkill, number>;
  /** Errors per graded attempt. */
  perAttempt: number;
  /** 'up' = more often lately, 'down' = less often; null with too few attempts. */
  trend: ErrorTrend | null;
  /** Newest first, one per distinct sentence. */
  examples: LoggedError[];
}

export interface ErrorLog {
  attempts: number;
  total: number;
  categories: ErrorSummary[];
}

const isErrorSkill = (s: string): s is ErrorSkill => s === 'writing' || s === 'speaking';

/** Graded Writing and Speaking attempts, newest first. */
export function gradedAttempts(attempts: ReadonlyArray<IeltsAttempt>, skill?: ErrorSkill): IeltsAttempt[] {
  return attempts
    .filter((a) => isErrorSkill(a.skill) && (!skill || a.skill === skill) && Array.isArray(a.aiFeedback?.sentenceCorrections))
    .map((a, i) => ({ a, i }))
    .sort((x, y) => (y.a.createdAt ?? '').localeCompare(x.a.createdAt ?? '') || x.i - y.i)
    .map(({ a }) => a);
}

/** Every correction of the graded attempts, labelled, newest attempt first. */
export function collectErrors(attempts: ReadonlyArray<IeltsAttempt>, skill?: ErrorSkill): LoggedError[] {
  return gradedAttempts(attempts, skill).flatMap((a, attemptIndex) =>
    (a.aiFeedback?.sentenceCorrections ?? [])
      .filter((c) => c && typeof c.original === 'string' && typeof c.corrected === 'string' && c.original.trim())
      .map((c) => ({
        category: errorCategory(c.category)?.id ?? OTHER_CATEGORY,
        original: c.original.trim(),
        corrected: c.corrected.trim(),
        explanation: typeof c.explanation === 'string' ? c.explanation : '',
        skill: a.skill as ErrorSkill,
        attemptId: a.id,
        createdAt: a.createdAt,
        attemptIndex,
      })),
  );
}

/** Newer half against older half, in errors per attempt. */
export function errorTrend(indices: ReadonlyArray<number>, attemptCount: number): ErrorTrend | null {
  if (attemptCount < TREND_MIN_ATTEMPTS || indices.length < TREND_MIN_ERRORS) return null;
  const newer = Math.floor(attemptCount / 2);
  const older = attemptCount - newer;
  const recent = indices.filter((i) => i < newer).length / newer;
  const before = indices.filter((i) => i >= newer).length / older;
  const change = recent - before;
  if (change >= TREND_STEP - 1e-9) return 'up';
  if (change <= -TREND_STEP + 1e-9) return 'down';
  return 'flat';
}

/** The error log: one summary per label, most frequent first, "Khác" last. */
export function summarizeErrors(attempts: ReadonlyArray<IeltsAttempt>, skill?: ErrorSkill): ErrorLog {
  const count = gradedAttempts(attempts, skill).length;
  const errors = collectErrors(attempts, skill);
  const byCategory = new Map<string, LoggedError[]>();
  for (const e of errors) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e]);

  const categories = [...byCategory].map(([category, list]): ErrorSummary => {
    const info = errorCategory(category);
    const seen = new Set<string>();
    const examples: LoggedError[] = [];
    for (const e of list) {
      const key = normalizeSentence(e.original);
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push(e);
      if (examples.length === EXAMPLE_LIMIT) break;
    }
    return {
      category,
      info,
      label: info?.label ?? OTHER_LABEL,
      total: list.length,
      bySkill: { writing: list.filter((e) => e.skill === 'writing').length, speaking: list.filter((e) => e.skill === 'speaking').length },
      perAttempt: count ? Math.round((list.length / count) * 10) / 10 : 0,
      trend: errorTrend(
        list.map((e) => e.attemptIndex),
        count,
      ),
      examples,
    };
  });

  const order = (s: ErrorSummary) => (s.info ? ERROR_CATEGORIES.indexOf(s.info) : ERROR_CATEGORIES.length);
  categories.sort((a, b) => (a.info ? 0 : 1) - (b.info ? 0 : 1) || b.total - a.total || order(a) - order(b));
  return { attempts: count, total: errors.length, categories };
}

/** Library lesson that explains a label. */
export function lessonFor(category: string): string {
  return category === 'task_response' ? 'lib_descriptors_writing' : WRITING_ERRORS_LESSON_ID;
}

/** Whether a rewrite matches the correction, ignoring case, punctuation and **bold** marks. */
export function isCorrectionFixed(answer: string, corrected: string): boolean {
  const a = normalizeSentence(stripBold(answer));
  return a.length > 0 && a === normalizeSentence(stripBold(corrected));
}

const STOPWORDS = new Set(
  (
    'about above actually after again against almost along already although always among another anyone anything ' +
    'around because become becomes been before being below between beyond could didn doesn doing during either ' +
    'enough especially every everyone everything example first going having however itself later least maybe might ' +
    'never nothing often other others otherwise people perhaps quite rather really second should since ' +
    'something sometimes still their theirs there therefore these thing things think those though three through ' +
    'today together under unless until usually where whereas whether which while whole whose without would years ' +
    'yourself'
  ).split(' '),
);

/** Words worth saving from a model answer: 5+ letters, no common function words, first occurrence order. */
export function pickableWords(text: string, limit = 40): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.replace(/[‘’]/g, "'").matchAll(/\p{L}+(?:[-']\p{L}+)*/gu)) {
    const word = m[0].toLowerCase();
    if (word.includes("'") || word.replace(/-/g, '').length < 5 || STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
    if (out.length === limit) break;
  }
  return out;
}

/** The sentence of a text that contains a word, for the SRS example. */
export function sentenceWith(text: string, word: string): string | undefined {
  const re = new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu');
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .find((s) => re.test(s));
}
