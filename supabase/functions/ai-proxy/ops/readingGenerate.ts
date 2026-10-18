/**
 * generateReadingPassage: one IELTS Academic Reading passage with its
 * questions, written by the model and returned in the app's ReadingPassage
 * shape (data/ielts/reading/types.ts).
 *
 * The learner picks the part, topic, difficulty and up to three question
 * kinds; readingPlan turns that into a blueprint of about 13 questions, which
 * the model echoes back. finalize runs the same data rules as the
 * hand-written passages (readingRules.ts) plus the blueprint: kinds and
 * counts, numbering, option letters, the word count and the distractors the
 * difficulty asks for. Any problem throws, so the proxy retries and then
 * falls back to the next model instead of handing the learner a broken
 * passage.
 */
import { asObject, BadRequest, FLASH_MODELS, jsonConfig, oneOf, q, S, str, userText, type OpSpec } from '../lib.ts';
import { squash } from './listeningRules.ts';
import {
  PART_MINUTES,
  PASSAGE_QUESTIONS,
  PASSAGE_WORDS,
  passageProblems,
  passageWordCount,
  READING_SKILLS,
  TFNG_VALUES,
} from './readingRules.ts';

export const READING_PARTS = [1, 2, 3] as const;
export type ReadingPart = (typeof READING_PARTS)[number];
export const READING_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type ReadingDifficulty = (typeof READING_DIFFICULTIES)[number];

/** The question kinds the model writes; diagrams are left to the admin editor. */
export const GENERATED_KINDS = [
  'headings',
  'matching_paragraph',
  'tfng',
  'ynng',
  'mcq',
  'mcq_multi',
  'matching_feature',
  'matching_ending',
  'completion',
  'summary_box',
  'flowchart',
  'short_answer',
] as const;
export type GeneratedKind = (typeof GENERATED_KINDS)[number];

/** Most kinds a learner can ask for; the plan may add one to reach the question count. */
export const MAX_WANTED_KINDS = 3;

/** Questions a generated passage carries. */
export const TARGET_QUESTIONS = 13;

/** The paragraph count the prompt asks for (A–H). */
export const PARAGRAPHS = { min: 5, max: 8 } as const;

/** Fewest distractors finalize accepts for each difficulty. */
export const MIN_DISTRACTORS: Record<ReadingDifficulty, number> = { easy: 0, medium: 2, hard: 3 };

export const TOPIC_TAGS = [
  'science',
  'biology',
  'environment',
  'history',
  'technology',
  'psychology',
  'society',
  'health',
  'education',
  'architecture',
  'business',
  'arts',
] as const;

interface KindSpec {
  count: number;
  min: number;
  max: number;
  /** Completion and short answer only. */
  wordLimit?: number;
  numberAllowed?: boolean;
  brief: string;
}

const KINDS: Record<GeneratedKind, KindSpec> = {
  headings: {
    count: 5,
    min: 4,
    max: 6,
    brief:
      'matching headings: the group options are the list of headings, keys "i", "ii", "iii"... (lower-case Roman numerals), with 2-3 more headings than questions. Each question asks for the heading of one paragraph: prompt is empty, paragraph is that paragraph, answers is the heading key, evidence is the topic sentence or the sentence that sums up the paragraph. Ask about different paragraphs in passage order and use each heading once. The wrong headings pick up words from the passage but miss the main idea',
  },
  matching_paragraph: {
    count: 4,
    min: 3,
    max: 5,
    brief:
      'matching information: each question prompt is a piece of information ("a description of...", "a reason why...", "an example of..."), answers is the letter of the paragraph that contains it, and paragraph is that same letter. Leave the group options empty. Not in passage order, and at least two different paragraphs',
  },
  tfng: {
    count: 5,
    min: 4,
    max: 7,
    brief:
      'TRUE / FALSE / NOT GIVEN about facts in the passage: each question prompt is one statement, answers is exactly one of "TRUE", "FALSE", "NOT GIVEN". Use each value at least once. A NOT GIVEN statement is about the topic but the passage gives no information either way; its evidence is the closest sentence. Questions follow the passage order',
  },
  ynng: {
    count: 5,
    min: 4,
    max: 7,
    brief:
      'YES / NO / NOT GIVEN about the claims and views of the writer: each question prompt is one statement of opinion, answers is exactly one of "YES", "NO", "NOT GIVEN". Use each value at least once. Questions follow the passage order',
  },
  mcq: {
    count: 4,
    min: 3,
    max: 6,
    brief:
      'multiple choice: each question has a prompt (a question or an unfinished sentence) and exactly 4 options with keys "A", "B", "C", "D"; answers is the one correct letter. Wrong options use words from the passage but say something it does not. Spread the correct letters',
  },
  mcq_multi: {
    count: 2,
    min: 2,
    max: 2,
    brief:
      'one "Which TWO ...?" question: the group prompt is the question and the group options are exactly 5 options "A"-"E". Write it as 2 questions with empty prompts that both have the same two correct letters in answers; each question\'s evidence supports one of the two letters',
  },
  matching_feature: {
    count: 4,
    min: 3,
    max: 5,
    brief:
      'matching features: the passage names 3-5 researchers, organisations or places; the group options are those names (keys "A"...), optionsTitle labels them ("List of Researchers"). Each question prompt is a finding or view, answers is the letter of who it belongs to. A letter may be used more than once; use at least two different letters',
  },
  matching_ending: {
    count: 4,
    min: 3,
    max: 5,
    brief:
      'matching sentence endings: each question prompt is the beginning of a sentence; the group options are 2-3 more endings than questions (keys "A"...), each a grammatical ending that fits several beginnings. answers is the letter of the ending that matches the passage; use each ending at most once',
  },
  completion: {
    count: 4,
    min: 3,
    max: 6,
    wordLimit: 2,
    numberAllowed: false,
    brief:
      'sentence completion: lines are sentences that paraphrase the passage, each with one blank {{number}}. answers are 1-2 words copied exactly from the passage. Questions follow the passage order',
  },
  summary_box: {
    count: 4,
    min: 3,
    max: 6,
    brief:
      'summary completion with a box of words: title is the summary heading, lines are the summary (2-4 sentences, one blank {{number}} for each question, in order). The group options are the box: 3-4 more single words or short phrases than blanks (keys "A"...), including plausible wrong ones. answers is the letter of the right word. The summary paraphrases the passage and the right word is usually a synonym of the passage\'s word',
  },
  flowchart: {
    count: 4,
    min: 3,
    max: 6,
    wordLimit: 2,
    numberAllowed: false,
    brief:
      'flow-chart completion of a process or sequence in the passage: title is the flow-chart heading, lines are 4-6 steps in order, each blank {{number}} in a step (a step may have no blank). answers are 1-2 words copied exactly from the passage. Questions follow the passage order',
  },
  short_answer: {
    count: 3,
    min: 3,
    max: 5,
    wordLimit: 3,
    numberAllowed: true,
    brief:
      'short-answer questions: each question prompt is a Wh- question; answers are 1-3 words (or a number) copied exactly from the passage. Questions follow the passage order',
  },
};

/** What a learner who picks no kinds gets, and what fills a plan that is short of questions. */
export const PART_DEFAULT_KINDS: Record<ReadingPart, GeneratedKind[]> = {
  1: ['tfng', 'matching_paragraph', 'completion', 'short_answer'],
  2: ['headings', 'mcq', 'summary_box', 'matching_feature'],
  3: ['ynng', 'mcq', 'matching_ending', 'flowchart'],
};

const PART_BRIEF: Record<ReadingPart, string> = {
  1: 'Passage 1: factual and descriptive, a clear account of a topic with dates, places, figures and named examples.',
  2: 'Passage 2: discursive, explaining a development, a debate or the work of several researchers, with more abstract vocabulary.',
  3: 'Passage 3: argumentative and analytical, from an academic book or journal; the writer weighs evidence, reports views and takes a position.',
};

const DIFFICULTY_BRIEF: Record<ReadingDifficulty, string> = {
  easy: 'easy (band 5-6): mostly clear sentences; questions paraphrase lightly and the evidence is easy to locate; few traps.',
  medium:
    'medium (band 6-7): questions paraphrase the passage with synonyms and changed word order; at least 2 questions have a distractor, a part of the passage that seems to fit but does not.',
  hard: 'hard (band 7-8): dense academic sentences, hedging and contrast ("although", "far from"); questions rely on paraphrase and inference; at least 3 questions have a distractor.',
};

export interface PlannedGroup {
  kind: GeneratedKind;
  count: number;
}

const ORDER = new Map<string, number>(GENERATED_KINDS.map((k, i) => [k, i]));
const isKind = (k: unknown): k is GeneratedKind => typeof k === 'string' && ORDER.has(k);

/**
 * The groups a passage will have: the kinds asked for (up to three, in exam
 * order) with counts that add up to about TARGET_QUESTIONS. When the kinds
 * cannot reach it, the part's default kinds fill the gap.
 */
export function readingPlan(part: ReadingPart, wanted: readonly string[] = []): PlannedGroup[] {
  const kinds = [...new Set(wanted.filter(isKind))].slice(0, MAX_WANTED_KINDS);
  if (!kinds.length) kinds.push(...PART_DEFAULT_KINDS[part].slice(0, 3));
  const fill = [...PART_DEFAULT_KINDS[part], ...GENERATED_KINDS];
  const capacity = () => kinds.reduce((n, k) => n + KINDS[k].max, 0);
  while (capacity() < TARGET_QUESTIONS) kinds.push(fill.find((k) => !kinds.includes(k))!);

  const counts = new Map(kinds.map((k) => [k, KINDS[k].count]));
  const total = () => [...counts.values()].reduce((a, b) => a + b, 0);
  const most = (score: (k: GeneratedKind) => number) => kinds.reduce((best, k) => (score(k) > score(best) ? k : best), kinds[0]);
  while (total() < TARGET_QUESTIONS) {
    const k = most((k) => KINDS[k].max - counts.get(k)!);
    counts.set(k, counts.get(k)! + 1);
  }
  while (total() > TARGET_QUESTIONS + 1) {
    const k = most((k) => counts.get(k)! - KINDS[k].min);
    if (counts.get(k)! <= KINDS[k].min) break;
    counts.set(k, counts.get(k)! - 1);
  }
  return kinds.sort((a, b) => ORDER.get(a)! - ORDER.get(b)!).map((kind) => ({ kind, count: counts.get(kind)! }));
}

/** The plan as the model echoes it: "tfng×5,completion×4,...". */
export const planKey = (plan: readonly PlannedGroup[]) => plan.map((g) => `${g.kind}×${g.count}`).join(',');

export function parsePlanKey(key: unknown): PlannedGroup[] | null {
  if (typeof key !== 'string' || !key) return null;
  const plan = key.split(',').map((part) => {
    const [kind, n] = part.split('×');
    return { kind, count: Number(n) };
  });
  return plan.every((g) => isKind(g.kind) && Number.isInteger(g.count) && g.count > 0) ? (plan as PlannedGroup[]) : null;
}

const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const limitText = (wordLimit: number, numberAllowed: boolean) =>
  (wordLimit === 1 ? 'ONE WORD ONLY' : `NO MORE THAN ${wordLimit === 2 ? 'TWO' : 'THREE'} WORDS`) + (numberAllowed ? ' AND/OR A NUMBER' : '');

/** The exam's instruction for a group, filled in once the passage and options are known. */
export function instructionFor(kind: GeneratedKind, paragraphs: number, options: number): string {
  const lastParagraph = String.fromCharCode(64 + Math.max(paragraphs, 1));
  const lastOption = String.fromCharCode(64 + Math.max(options, 1));
  const spec = KINDS[kind];
  switch (kind) {
    case 'headings':
      return `The passage has ${paragraphs} paragraphs, A–${lastParagraph}. Choose the correct heading for each paragraph from the list of headings below.`;
    case 'matching_paragraph':
      return `The passage has ${paragraphs} paragraphs, A–${lastParagraph}. Which paragraph contains the following information? Write the correct letter, A–${lastParagraph}. You may use any letter more than once.`;
    case 'tfng':
      return 'Do the following statements agree with the information given in the passage? Write TRUE, FALSE or NOT GIVEN.';
    case 'ynng':
      return 'Do the following statements agree with the claims of the writer in the passage? Write YES, NO or NOT GIVEN.';
    case 'mcq':
      return 'Choose the correct letter, A, B, C or D.';
    case 'mcq_multi':
      return `Choose TWO letters, A–${lastOption}.`;
    case 'matching_feature':
      return `Match each statement with the correct option, A–${lastOption}. You may use any letter more than once.`;
    case 'matching_ending':
      return `Complete each sentence with the correct ending, A–${lastOption}, below.`;
    case 'completion':
      return `Complete the sentences below. Choose ${limitText(spec.wordLimit!, spec.numberAllowed!)} from the passage for each answer.`;
    case 'summary_box':
      return `Complete the summary using the list of words, A–${lastOption}, below.`;
    case 'flowchart':
      return `Complete the flow-chart below. Choose ${limitText(spec.wordLimit!, spec.numberAllowed!)} from the passage for each answer.`;
    case 'short_answer':
      return `Answer the questions below. Choose ${limitText(spec.wordLimit!, spec.numberAllowed!)} from the passage for each answer.`;
  }
}

// --- Request -----------------------------------------------------------------

export interface ReadingGenerateRequest {
  part: ReadingPart;
  difficulty: ReadingDifficulty;
  topic: string;
  kinds: GeneratedKind[];
}

export function parseReadingGenerateRequest(payload: unknown): ReadingGenerateRequest {
  const p = asObject(payload);
  const part = Number(p.part);
  if (!(READING_PARTS as readonly number[]).includes(part)) throw new BadRequest('part must be 1, 2 or 3');
  const raw = p.kinds === undefined ? [] : p.kinds;
  if (!Array.isArray(raw) || raw.length > MAX_WANTED_KINDS) throw new BadRequest(`kinds must be a list of at most ${MAX_WANTED_KINDS}`);
  if (raw.some((k) => !isKind(k))) throw new BadRequest(`kinds must be among ${GENERATED_KINDS.join(', ')}`);
  return {
    part: part as ReadingPart,
    difficulty: oneOf(p, 'difficulty', READING_DIFFICULTIES, 'medium'),
    topic: str(p, 'topic', { max: 100, optional: true }).trim(),
    kinds: [...new Set(raw as GeneratedKind[])],
  };
}

const option = S.obj({ key: S.str(), text: S.str() });

function passageSchema(r: ReadingGenerateRequest, plan: PlannedGroup[]) {
  return S.obj(
    {
      blueprint: S.str([planKey(plan)]),
      part: S.str([String(r.part)]),
      difficulty: S.str([r.difficulty]),
      title: S.str(),
      subtitle: S.str(),
      topic: S.str([...TOPIC_TAGS]),
      summaryVi: S.str(),
      paragraphs: S.arr(S.str()),
      glossary: S.arr(S.obj({ term: S.str(), meaningVi: S.str() })),
      groups: S.arr(
        S.obj(
          {
            kind: S.str([...new Set(plan.map((g) => g.kind))]),
            title: S.str(),
            lines: S.arr(S.str()),
            prompt: S.str(),
            optionsTitle: S.str(),
            options: S.arr(option),
            questions: S.arr(
              S.obj(
                {
                  number: S.num(),
                  prompt: S.str(),
                  options: S.arr(option),
                  answers: S.arr(S.str()),
                  paragraph: S.str(letters(PARAGRAPHS.max)),
                  evidence: S.str(),
                  distractor: S.str(),
                  paraphraseQuestion: S.str(),
                  paraphrasePassage: S.str(),
                  explanationVi: S.str(),
                  skill: S.str([...READING_SKILLS]),
                },
                ['number', 'answers', 'paragraph', 'evidence', 'explanationVi', 'skill'],
              ),
            ),
          },
          ['kind', 'questions'],
        ),
      ),
    },
    ['blueprint', 'part', 'difficulty', 'title', 'topic', 'summaryVi', 'paragraphs', 'glossary', 'groups'],
  );
}

export function readingPassagePrompt(r: ReadingGenerateRequest, plan: PlannedGroup[]): string {
  let n = 1;
  const groups = plan
    .map((g, i) => {
      const range = `${n}-${n + g.count - 1}`;
      n += g.count;
      return `${i + 1}. kind "${g.kind}", questions ${range} (${g.count}): ${KINDS[g.kind].brief}.`;
    })
    .join('\n');
  const total = n - 1;

  return `You are an experienced IELTS Academic Reading test writer. Write one original IELTS Academic Reading passage with its questions, for Vietnamese learners. Never copy or adapt published IELTS or Cambridge material, and invent the people, studies and figures (no real brand names).

${PART_BRIEF[r.part]}
Topic: ${r.topic ? q(r.topic) : 'choose a fresh academic topic (science, history, environment, psychology, technology or society)'}
Difficulty: ${DIFFICULTY_BRIEF[r.difficulty]}

Return JSON with:
- blueprint: ${q(planKey(plan))}; part: "${r.part}"; difficulty: "${r.difficulty}"
- title: the passage title in English; subtitle (optional): one line under the title, or empty
- topic: the closest tag
- summaryVi: one Vietnamese sentence saying what the passage is about
- paragraphs: ${PARAGRAPHS.min + 1}-${PARAGRAPHS.max - 1} paragraphs of plain prose, in order. They are labelled A, B, C... by their position; do not write the letters, headings or line breaks inside them. Together they are ${PASSAGE_WORDS.min + 80}-${PASSAGE_WORDS.max - 70} words (never under ${PASSAGE_WORDS.min} or over ${PASSAGE_WORDS.max}), formal academic English at the level of a quality magazine or textbook.
- glossary: 4-8 hard words or phrases that appear in the passage exactly as written there, each with a short Vietnamese meaning
- groups: exactly these groups, in this order:
${groups}

Question rules:
- number runs from 1 to ${total} with no gaps, across the groups in order.
- paragraph is the letter of the paragraph that holds the answer (for headings, the paragraph asked about).
- evidence is copied character for character from that paragraph: the words or sentence that give the answer. For NOT GIVEN, the sentence that comes closest.
- distractor (optional) is copied character for character from the passage: words that seem to give a different answer. Leave it empty when there is none.
- paraphraseQuestion and paraphrasePassage (optional): the words in the question and the different words the passage uses for the same idea, the passage side copied from it.
- explanationVi: 1-2 Vietnamese sentences saying why the answer is right and, for traps, why the tempting answer is wrong. For NOT GIVEN, say what the passage does say and what it leaves out.
- skill: "scan" (find a detail by a name, number or keyword), "skim" (general idea of a part), "detail" (understand a specific point), "inference" (the writer's view or what is implied) or "main_idea" (the point of a paragraph).
- Fill options, prompt, lines, title and optionsTitle only where the group's kind uses them; leave the rest empty.
- Blanks are written {{number}} in lines, one per question, in question order. The words around a blank paraphrase the passage and never show the answer.
- Letter answers are capital letters ("B"); heading answers are lower-case Roman numerals ("iv"); option keys run from "A" (or "i") with no gaps.`;
}

/** Writes one IELTS Academic Reading passage with questions, answers and evidence. */
export const generateReadingPassage: OpSpec = {
  hourlyLimit: 10,
  models: FLASH_MODELS,
  timeoutMs: 120_000,
  kind: 'json',
  finalize: finalizeReadingPassage,
  build(payload) {
    const r = parseReadingGenerateRequest(payload);
    const plan = readingPlan(r.part, r.kinds);
    return {
      contents: userText(readingPassagePrompt(r, plan)),
      generationConfig: jsonConfig(passageSchema(r, plan), { temperature: 0.9 }),
    };
  },
};

// --- Output ------------------------------------------------------------------

interface RawOption {
  key?: unknown;
  text?: unknown;
}
interface RawQuestion {
  number?: unknown;
  prompt?: unknown;
  options?: RawOption[];
  answers?: unknown[];
  paragraph?: unknown;
  evidence?: unknown;
  distractor?: unknown;
  paraphraseQuestion?: unknown;
  paraphrasePassage?: unknown;
  explanationVi?: unknown;
  skill?: unknown;
}
interface RawGroup {
  kind?: unknown;
  title?: unknown;
  lines?: unknown[];
  prompt?: unknown;
  optionsTitle?: unknown;
  options?: RawOption[];
  questions?: RawQuestion[];
}
interface RawPassage {
  blueprint?: unknown;
  part?: unknown;
  difficulty?: unknown;
  title?: unknown;
  subtitle?: unknown;
  topic?: unknown;
  summaryVi?: unknown;
  paragraphs?: unknown[];
  glossary?: { term?: unknown; meaningVi?: unknown }[];
  groups?: RawGroup[];
}

export interface GeneratedOption {
  key: string;
  text: string;
}
export interface GeneratedQuestion {
  number: number;
  prompt?: string;
  options?: GeneratedOption[];
  answers: string[];
  paragraph: string;
  evidence: string;
  distractor?: string;
  paraphrase?: { question: string; passage: string };
  explanationVi: string;
  skill: (typeof READING_SKILLS)[number];
}
/** Structurally a ReadingGroup (no diagrams or tables). */
export interface GeneratedGroup {
  id: string;
  type: 'tfng' | 'mcq' | 'mcq_multi' | 'headings' | 'matching' | 'completion' | 'short_answer';
  instruction: string;
  questions: GeneratedQuestion[];
  variant?: 'tfng' | 'ynng';
  prompt?: string;
  options?: GeneratedOption[];
  headings?: GeneratedOption[];
  target?: 'paragraph' | 'feature' | 'ending';
  optionsTitle?: string;
  reuse?: boolean;
  wordLimit?: number;
  numberAllowed?: boolean;
  title?: string;
  lines?: string[];
  layout?: 'lines' | 'flowchart';
  wordBox?: GeneratedOption[];
}
/** Structurally a ReadingPassage. */
export interface GeneratedPassage {
  id: string;
  part: ReadingPart;
  title: string;
  subtitle?: string;
  topic: string;
  difficulty: ReadingDifficulty;
  paragraphs: { label: string; text: string }[];
  groups: GeneratedGroup[];
  glossary: { term: string; meaningVi: string }[];
  suggestedMinutes: number;
}
/** What the op returns: the passage, the blueprint it was written to and a line for the hub. */
export interface GeneratedReading {
  plan: PlannedGroup[];
  summaryVi: string;
  passage: GeneratedPassage;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const optional = (v: unknown) => text(v) || undefined;
const arr = <T>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

const options = (v: RawOption[] | undefined, lower = false): GeneratedOption[] =>
  arr(v)
    .map((o) => ({ key: lower ? text(o?.key).toLowerCase() : text(o?.key).toUpperCase(), text: text(o?.text) }))
    .filter((o) => o.key || o.text);

/** "Not given", "NOT_GIVEN" and "NG" all mean NOT GIVEN. */
const tfngValue = (a: string) => {
  const v = a.toUpperCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  return v === 'NG' ? 'NOT GIVEN' : v;
};

/** Paragraph labels the model wrote anyway: "[A] ..." or "A. ...". */
const stripLabel = (s: string) => s.replace(/^\[[A-H]\]\s*/, '').replace(/^[A-H][.:)]\s+/, '');

function normalizeQuestion(raw: RawQuestion, answer: (a: string) => string): GeneratedQuestion {
  const answers = [...new Set(arr(raw.answers).map((a) => answer(text(a))).filter(Boolean))];
  const pq = text(raw.paraphraseQuestion);
  const pp = text(raw.paraphrasePassage);
  const opts = options(raw.options);
  const skill = text(raw.skill) as GeneratedQuestion['skill'];
  return {
    number: Number(raw.number),
    prompt: optional(raw.prompt),
    ...(opts.length ? { options: opts } : {}),
    answers,
    paragraph: text(raw.paragraph).toUpperCase(),
    evidence: text(raw.evidence),
    distractor: optional(raw.distractor),
    ...(pq && pp ? { paraphrase: { question: pq, passage: pp } } : {}),
    explanationVi: text(raw.explanationVi),
    skill,
  };
}

const withoutOptions = ({ options: _o, ...q }: GeneratedQuestion): GeneratedQuestion => q;
const withoutPrompt = ({ prompt: _p, options: _o, ...q }: GeneratedQuestion): GeneratedQuestion => q;

/** The model's JSON in the app's shape, with ids, labels and instructions filled in. Does not check it. */
export function normalizeGeneratedPassage(data: unknown): GeneratedReading {
  const d = (data && typeof data === 'object' ? data : {}) as RawPassage;
  const part = (READING_PARTS as readonly number[]).includes(Number(d.part)) ? (Number(d.part) as ReadingPart) : 1;
  const difficulty = (READING_DIFFICULTIES as readonly unknown[]).includes(d.difficulty) ? (d.difficulty as ReadingDifficulty) : 'medium';
  const id = `gen-r${part}`;
  const paragraphs = arr(d.paragraphs)
    .map((p) => stripLabel(text(p)))
    .filter(Boolean)
    .map((t, i) => ({ label: String.fromCharCode(65 + i), text: t }));
  const body = paragraphs.map((p) => p.text.toLowerCase()).join(' ');

  const groups = arr(d.groups).map((g, gi): GeneratedGroup => {
    const kind = text(g?.kind) as GeneratedKind;
    const raw = arr(g?.questions).map((x) => x ?? {});
    const groupOptions = options(g?.options, kind === 'headings');
    const instruction = isKind(kind) ? instructionFor(kind, paragraphs.length, groupOptions.length) : '';
    const base = { id: `${id}-g${gi + 1}`, instruction };
    const letter = (a: string) => a.toUpperCase();
    const lines = arr(g?.lines).map(text).filter(Boolean);
    const spec = isKind(kind) ? KINDS[kind] : undefined;

    switch (kind) {
      case 'tfng':
      case 'ynng':
        return { ...base, type: 'tfng', variant: kind, questions: raw.map((x) => withoutOptions(normalizeQuestion(x, tfngValue))) };
      case 'mcq':
        return { ...base, type: 'mcq', questions: raw.map((x) => normalizeQuestion(x, letter)) };
      case 'mcq_multi': {
        const questions = raw.map((x) => withoutPrompt(normalizeQuestion(x, letter)));
        // Both questions carry the same pair of letters; repair a model that split them.
        const shared = [...new Set(questions.flatMap((q) => q.answers))].sort();
        return { ...base, type: 'mcq_multi', prompt: text(g?.prompt), options: groupOptions, questions: questions.map((q) => ({ ...q, answers: shared })) };
      }
      case 'headings':
        return {
          ...base,
          type: 'headings',
          headings: groupOptions,
          questions: raw.map((x) => withoutPrompt(normalizeQuestion(x, (a) => a.toLowerCase()))),
        };
      case 'matching_paragraph':
        return {
          ...base,
          type: 'matching',
          target: 'paragraph',
          reuse: true,
          options: paragraphs.map((p) => ({ key: p.label, text: `Paragraph ${p.label}` })),
          questions: raw.map((x) => withoutOptions(normalizeQuestion(x, letter))),
        };
      case 'matching_feature':
      case 'matching_ending':
        return {
          ...base,
          type: 'matching',
          target: kind === 'matching_feature' ? 'feature' : 'ending',
          ...(kind === 'matching_feature' ? { reuse: true, optionsTitle: optional(g?.optionsTitle) ?? 'List of Options' } : {}),
          options: groupOptions,
          questions: raw.map((x) => withoutOptions(normalizeQuestion(x, letter))),
        };
      case 'summary_box':
        return {
          ...base,
          type: 'completion',
          wordLimit: 1,
          numberAllowed: false,
          title: optional(g?.title),
          lines,
          wordBox: groupOptions,
          questions: raw.map((x) => withoutPrompt(normalizeQuestion(x, letter))),
        };
      case 'completion':
      case 'flowchart':
        return {
          ...base,
          type: 'completion',
          wordLimit: spec!.wordLimit!,
          numberAllowed: spec!.numberAllowed!,
          title: optional(g?.title),
          lines,
          ...(kind === 'flowchart' ? { layout: 'flowchart' as const } : {}),
          questions: raw.map((x) => withoutPrompt(normalizeQuestion(x, (a) => a))),
        };
      case 'short_answer':
        return {
          ...base,
          type: 'short_answer',
          wordLimit: spec!.wordLimit!,
          numberAllowed: spec!.numberAllowed!,
          questions: raw.map((x) => withoutOptions(normalizeQuestion(x, (a) => a))),
        };
    }
    return { ...base, type: 'mcq', instruction: `unknown kind ${kind}`, questions: [] };
  });

  // Keep only glossary words that really are in the passage.
  const glossary = arr(d.glossary)
    .map((e) => ({ term: text(e?.term), meaningVi: text(e?.meaningVi) }))
    .filter((e, i, all) => e.term && e.meaningVi && body.includes(e.term.toLowerCase()) && all.findIndex((o) => o.term.toLowerCase() === e.term.toLowerCase()) === i);

  return {
    plan: parsePlanKey(d.blueprint) ?? [],
    summaryVi: text(d.summaryVi),
    passage: {
      id,
      part,
      title: text(d.title),
      ...(optional(d.subtitle) ? { subtitle: optional(d.subtitle) } : {}),
      topic: (TOPIC_TAGS as readonly unknown[]).includes(text(d.topic)) ? text(d.topic) : 'science',
      difficulty,
      paragraphs,
      groups,
      glossary,
      suggestedMinutes: PART_MINUTES[part],
    },
  };
}

/** The kind a normalized group was written as. */
export function groupKind(g: GeneratedGroup): GeneratedKind | null {
  switch (g.type) {
    case 'tfng':
      return g.variant === 'ynng' ? 'ynng' : 'tfng';
    case 'matching':
      return g.target === 'paragraph' ? 'matching_paragraph' : g.target === 'feature' ? 'matching_feature' : 'matching_ending';
    case 'completion':
      return g.wordBox?.length ? 'summary_box' : g.layout === 'flowchart' ? 'flowchart' : 'completion';
    default:
      return g.type;
  }
}

/** Problems against the blueprint and the exam's shape, on top of the shared data rules. */
export function blueprintProblems(passage: GeneratedPassage, plan: readonly PlannedGroup[], difficulty?: ReadingDifficulty): string[] {
  const problems: string[] = [];
  const add = (msg: string) => problems.push(`${passage.id}: ${msg}`);

  if (!passage.title) add('no title');
  const paragraphs = passage.paragraphs.length;
  if (paragraphs < PARAGRAPHS.min || paragraphs > PARAGRAPHS.max) add(`needs ${PARAGRAPHS.min}-${PARAGRAPHS.max} paragraphs, got ${paragraphs}`);
  const words = passageWordCount(passage);
  if (words < PASSAGE_WORDS.min || words > PASSAGE_WORDS.max) add(`has ${words} words (${PASSAGE_WORDS.min}-${PASSAGE_WORDS.max})`);

  if (!plan.length) add('no blueprint');
  const shape = planKey(passage.groups.map((g) => ({ kind: groupKind(g) ?? (g.type as GeneratedKind), count: g.questions.length })));
  if (plan.length && shape !== planKey(plan)) add(`groups are [${shape}], expected [${planKey(plan)}]`);

  const questions = passage.groups.flatMap((g) => g.questions);
  if (questions[0]?.number !== 1) add('numbering must start at 1');
  if (questions.length < PASSAGE_QUESTIONS.min || questions.length > PASSAGE_QUESTIONS.max) {
    add(`has ${questions.length} questions (${PASSAGE_QUESTIONS.min}-${PASSAGE_QUESTIONS.max})`);
  }

  for (const g of passage.groups) {
    const at = (msg: string) => add(`${g.id}: ${msg}`);
    const kind = groupKind(g);
    const keysAre = (opts: GeneratedOption[] | undefined, min: number, max: number, keys: string[]) => {
      const got = (opts ?? []).map((o) => o.key);
      if (got.length < min || got.length > max) return at(`needs ${min === max ? min : `${min}-${max}`} options, got ${got.length}`);
      if (got.join() !== keys.slice(0, got.length).join()) at(`option keys must be ${keys.slice(0, got.length).join(', ')}`);
      if ((opts ?? []).some((o) => !o.text)) at('an option has no text');
      if (new Set((opts ?? []).map((o) => o.text.toLowerCase())).size !== got.length) at('options repeat');
    };
    const sameLetter = () => {
      const picked = g.questions.map((q) => q.answers[0]);
      if (picked.length >= 3 && new Set(picked).size === 1) at('every answer is the same');
    };
    const n = g.questions.length;

    switch (kind) {
      case 'headings':
        keysAre(g.headings, n + 1, ROMAN.length, ROMAN);
        if (n > paragraphs) at('asks about more paragraphs than the passage has');
        break;
      case 'tfng':
      case 'ynng': {
        const values = g.questions.map((q) => q.answers[0]);
        if (n >= 4 && !values.includes(TFNG_VALUES[kind][2])) at('needs at least one NOT GIVEN');
        if (n >= 3 && new Set(values).size < 2) at('every answer is the same');
        break;
      }
      case 'mcq':
        for (const q of g.questions) keysAre(q.options, 4, 4, letters(4));
        sameLetter();
        break;
      case 'mcq_multi':
        keysAre(g.options, 5, 5, letters(5));
        if (!g.prompt) at('no prompt');
        break;
      case 'matching_paragraph':
        if (n >= 3 && new Set(g.questions.map((q) => q.answers[0])).size < 2) at('every answer is the same paragraph');
        break;
      case 'matching_feature':
        keysAre(g.options, 3, 5, letters(5));
        sameLetter();
        break;
      case 'matching_ending':
        keysAre(g.options, n + 1, n + 4, letters(n + 4));
        break;
      case 'summary_box':
        keysAre(g.wordBox, n + 1, 12, letters(12));
        break;
      case 'completion':
      case 'flowchart':
        for (const q of g.questions) {
          const line = g.lines?.find((l) => l.includes(`{{${q.number}}}`)) ?? '';
          const around = squash(line.replace(/\{\{\d+\}\}/g, ' '));
          // Short answers ("6", "red") can occur by chance; longer ones would give the answer away.
          if (q.answers.some((a) => squash(a).length >= 4 && around.includes(squash(a)))) at(`Q${q.number}: the line already shows the answer`);
        }
        break;
    }
  }

  if (difficulty) {
    const distractors = questions.filter((q) => q.distractor).length;
    if (distractors < MIN_DISTRACTORS[difficulty]) add(`${difficulty} needs at least ${MIN_DISTRACTORS[difficulty]} distractors, got ${distractors}`);
  }
  return problems;
}

/** Every problem in a generated passage; empty when it can be used. */
export function generatedPassageProblems(g: GeneratedReading, difficulty: ReadingDifficulty | undefined = g.passage.difficulty): string[] {
  // Whole-passage problems first: the finalize message only lists the first few.
  return [...blueprintProblems(g.passage, g.plan, difficulty), ...passageProblems(g.passage)];
}

export function finalizeReadingPassage(data: unknown): GeneratedReading {
  const d = data as RawPassage | null;
  if (!(READING_PARTS as readonly number[]).includes(Number(d?.part))) throw new Error('generated passage has no valid part');
  const generated = normalizeGeneratedPassage(data);
  const problems = generatedPassageProblems(generated);
  if (problems.length) {
    throw new Error(`generated passage failed ${problems.length} check(s): ${problems.slice(0, 6).join('; ')}`);
  }
  return generated;
}
