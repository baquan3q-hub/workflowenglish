/**
 * Pure helpers for the Speaking study screens: shadowing sets, the shadowing
 * score, cue card lookups and practice questions built from study content.
 */
import type { IeltsQuestion } from '../types';
import type { AudioSegment, ListeningVoice } from './listeningAudioService';
import { compareDictation, type DictationResult } from './listeningDrillLogic';
import {
  CUE_CARDS,
  CUE_CATEGORIES,
  CUE_CATEGORY_LABELS,
  PART1_PACKS,
  PART3_THEMES,
  STORY_BANKS,
  type CueCard,
  type CueCategory,
  type OreoAnswer,
  type Part1Pack,
  type Part3Theme,
  type SpeakingVocab,
  type StoryBank,
} from '../data/ielts/speakingTopics';

/** Voice for model answers and pronunciation examples. */
export const SAMPLE_VOICE: ListeningVoice = 'Aoede';

/** A clip of study text read in British English. */
export function speakClip(id: string, text: string, voice: ListeningVoice = SAMPLE_VOICE): AudioSegment {
  return { id, text: text.trim(), style: 'uk', voice };
}

/** Sentences of a spoken answer, keeping their end punctuation. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=["'A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function oreoText(o: OreoAnswer): string {
  return [o.opinion, o.reason, o.example, o.outcome].join(' ');
}

// ─── Shadowing ──────────────────────────────────────────────────────

export interface ShadowSentence {
  id: string;
  text: string;
  clip: AudioSegment;
}

export interface ShadowSet {
  id: string;
  kind: 'part1' | 'part2' | 'part3';
  title: string;
  subtitle: string;
  sentences: ShadowSentence[];
}

function shadowSet(id: string, kind: ShadowSet['kind'], title: string, subtitle: string, text: string): ShadowSet {
  return {
    id,
    kind,
    title,
    subtitle,
    sentences: splitSentences(text).map((s, i) => ({ id: `${id}:${i}`, text: s, clip: speakClip(`sh:${id}:${i}`, s) })),
  };
}

/** Every band 7 model answer, cut into sentences to repeat one by one. */
export function shadowingSets(): ShadowSet[] {
  return [
    ...PART1_PACKS.map((p) => shadowSet(p.id, 'part1', p.sample.question, `Part 1 · ${p.titleVi}`, p.sample.band7)),
    ...CUE_CARDS.map((c) => shadowSet(c.id, 'part2', c.title, `Part 2 · ${categoryLabel(c.category)}`, c.sample)),
    ...PART3_THEMES.map((t) => shadowSet(t.id, 'part3', t.oreo.question, `Part 3 · ${t.titleVi}`, oreoText(t.oreo))),
  ];
}

export function findShadowSet(id: string): ShadowSet | undefined {
  return shadowingSets().find((s) => s.id === id);
}

export type ShadowTone = 'good' | 'ok' | 'retry';

export interface ShadowScore {
  result: DictationResult;
  tone: ShadowTone;
  label: string;
}

/** How closely what the learner said (as transcribed) matches the sentence. */
export function shadowScore(reference: string, transcript: string): ShadowScore {
  const result = compareDictation(reference, transcript);
  const tone: ShadowTone = result.accuracy >= 90 ? 'good' : result.accuracy >= 70 ? 'ok' : 'retry';
  const label = tone === 'good' ? 'Rất tốt' : tone === 'ok' ? 'Khá, nghe lại chỗ tô màu' : 'Nghe chậm và nói lại';
  return { result, tone, label };
}

// ─── Cue cards ──────────────────────────────────────────────────────

export function categoryLabel(c: CueCategory): string {
  return CUE_CATEGORY_LABELS[c];
}

export function cardsByCategory(cards: readonly CueCard[] = CUE_CARDS): { category: CueCategory; cards: CueCard[] }[] {
  return CUE_CATEGORIES.map((category) => ({ category, cards: cards.filter((c) => c.category === category) })).filter((g) => g.cards.length);
}

/** Stories that can be reused for a cue card. */
export function storiesForCard(cardId: string, stories: readonly StoryBank[] = STORY_BANKS): StoryBank[] {
  return stories.filter((s) => s.covers.some((c) => c.cardId === cardId));
}

/** "Describe…\nYou should say:\n- …" in the same shape as the question bank. */
export function cueCardPrompt(card: CueCard): string {
  return `${card.title}\nYou should say:\n${card.bullets.map((b) => `- ${b}`).join('\n')}`;
}

// ─── Practice questions from study content ──────────────────────────

const base = { skill: 'speaking' as const, difficulty: 'medium' as const, targetBand: '6.5-7.0' };

export function part1Question(pack: Part1Pack, index: number): IeltsQuestion {
  return {
    ...base,
    id: `study_${pack.id}_${index}`,
    taskOrPart: 'part_1',
    questionType: 'personal',
    topic: pack.topic,
    prompt: pack.questions[index],
    frameworkId: 'fw_area',
    vocabulary: pack.vocabulary.map((v) => v.phrase),
    sampleAnswer: pack.questions[index] === pack.sample.question ? pack.sample.band7 : undefined,
  };
}

export function cueCardQuestion(card: CueCard): IeltsQuestion {
  return {
    ...base,
    id: `study_${card.id}`,
    taskOrPart: 'part_2',
    questionType: 'cue_card',
    topic: categoryLabel(card.category),
    prompt: cueCardPrompt(card),
    frameworkId: 'fw_prep_story',
    vocabulary: card.vocabulary.map((v) => v.phrase),
    sampleAnswer: card.sample,
  };
}

export function part3Question(theme: Part3Theme, index: number): IeltsQuestion {
  return {
    ...base,
    id: `study_${theme.id}_${index}`,
    taskOrPart: 'part_3',
    questionType: 'discussion',
    topic: theme.topic,
    prompt: theme.questions[index],
    frameworkId: 'fw_oreo',
    vocabulary: theme.vocabulary.map((v) => v.phrase),
    sampleAnswer: theme.questions[index] === theme.oreo.question ? oreoText(theme.oreo) : undefined,
  };
}

// ─── Review words ───────────────────────────────────────────────────

export interface ReviewWord {
  word: string;
  meaningVi?: string;
  example?: string;
}

export function reviewWords(items: readonly SpeakingVocab[]): ReviewWord[] {
  return items.map((v) => ({ word: v.phrase, meaningVi: v.meaningVi, example: v.example }));
}
