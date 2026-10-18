/**
 * generateListeningSection: one IELTS Listening part written by the model and
 * returned in the app's ListeningSection shape (data/ielts/listening/types.ts).
 *
 * finalize runs the same data rules as the hand-written tests
 * (listeningRules.ts) plus the part's blueprint: question types and counts,
 * numbering, speakers, option letters and the order of answers in the
 * recording. Any problem throws, so the proxy retries and then falls back to
 * the next model instead of handing the learner a broken part.
 */
import { asObject, FLASH_MODELS, jsonConfig, oneOf, q, S, str, userText, type OpSpec } from '../lib.ts';
import type { ListeningStyle, ListeningVoice } from './listening.ts';
import { sectionProblems, squash, type CheckSection } from './listeningRules.ts';

export const LISTENING_PARTS = [1, 2, 3, 4] as const;
export type ListeningPart = (typeof LISTENING_PARTS)[number];
export const LISTENING_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type ListeningDifficulty = (typeof LISTENING_DIFFICULTIES)[number];
export type GeneratedGroupType = 'completion' | 'mcq' | 'mcq_multi' | 'matching';

interface GroupPlan {
  type: GeneratedGroupType;
  count: number;
  /** Completion only. */
  wordLimit?: number;
  numberAllowed?: boolean;
  /** What the model should write for this group. */
  brief: string;
}

interface PartPlan {
  speakers: 1 | 2;
  /** Accent of the recording; the real test mixes accents across parts. */
  style: ListeningStyle;
  brief: string;
  groups: GroupPlan[];
}

const MCQ = (count: number): GroupPlan => ({
  type: 'mcq',
  count,
  brief: `${count} multiple-choice questions, each with a prompt and exactly 3 options A, B, C`,
});
const MULTI: GroupPlan = {
  type: 'mcq_multi',
  count: 2,
  brief: 'one "Which TWO ...?" question with exactly 5 options A-E, written as 2 questions that both have the same two letters in answers',
};
const MATCHING = (count: number): GroupPlan => ({
  type: 'matching',
  count,
  brief: `${count} items to match (people, places, stages, features...) against a box of 5-7 options A-G; the group prompt says what to decide about each item`,
});

/** What every generated part contains, modelled on the real test. */
export const LISTENING_BLUEPRINTS: Record<ListeningPart, PartPlan> = {
  1: {
    speakers: 2,
    style: 'uk',
    brief:
      'A phone call or face-to-face conversation in an everyday social context (booking, enquiry, registration, reporting a problem). One speaker asks for and notes down details; the other gives personal details, numbers, dates, prices, an address and a surname or street name that is spelled out letter by letter.',
    groups: [
      {
        type: 'completion',
        count: 6,
        wordLimit: 1,
        numberAllowed: true,
        brief: 'a form: a title and 7-9 lines such as "Surname: {{1}}" or "Date of arrival: {{2}} May"; one or two lines may be filled in already as examples',
      },
      {
        type: 'completion',
        count: 4,
        wordLimit: 2,
        numberAllowed: true,
        brief: 'notes: a title and 4-6 short lines, for example requirements, extras or things to bring',
      },
    ],
  },
  2: {
    speakers: 1,
    style: 'au',
    brief:
      'A monologue in an everyday social context: a guide, organiser or presenter giving information about a place, an event, a service or a local facility.',
    groups: [MCQ(4), MULTI, MATCHING(4)],
  },
  3: {
    speakers: 2,
    style: 'us',
    brief:
      'A discussion between two students (or a student and a tutor) about an assignment, a research project, a presentation or a course. They give opinions, agree and disagree, and change their minds.',
    groups: [MCQ(4), MULTI, MATCHING(4)],
  },
  4: {
    speakers: 1,
    style: 'lecture',
    brief:
      'A university lecture on an academic subject (science, history, environment, business, psychology...), with a clear structure: introduction, two or three main points with examples or research findings, and a conclusion.',
    groups: [
      {
        type: 'completion',
        count: 10,
        wordLimit: 1,
        numberAllowed: false,
        brief: 'lecture notes: a title and 12-16 short lines under 2-4 headings; headings are lines without a blank',
      },
    ],
  },
};

const DIFFICULTY_BRIEF: Record<ListeningDifficulty, string> = {
  easy: 'Easy (band 5-6): clear and direct; the words of the questions are close to the words in the script; at most 2 distractors in the whole part.',
  medium:
    'Medium (band 6-7): the questions paraphrase the script; at least 3 questions have a distractor (an option or value that is mentioned and then rejected or corrected).',
  hard: 'Hard (band 7-8): most questions paraphrase the script with different words; at least 5 questions have a distractor; speakers correct themselves and change their minds.',
};

/** Fewest distractors finalize accepts for each difficulty. */
export const MIN_DISTRACTORS: Record<ListeningDifficulty, number> = { easy: 0, medium: 2, hard: 4 };

const FEMALE_VOICES: readonly ListeningVoice[] = ['Kore', 'Aoede', 'Leda'];
const MALE_VOICES: readonly ListeningVoice[] = ['Puck', 'Charon', 'Orus'];

export const firstQuestion = (part: ListeningPart) => (part - 1) * 10 + 1;
const SPEAKER_NAME = /^[A-Z][A-Za-z]{0,19}$/;
const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
const letterRange = (n: number) => `A–${letters(n)[n - 1]}`;

function completionInstruction(plan: GroupPlan, form: 'form' | 'notes'): string {
  const limit =
    plan.wordLimit === 1
      ? plan.numberAllowed
        ? 'ONE WORD AND/OR A NUMBER'
        : 'ONE WORD ONLY'
      : `NO MORE THAN ${plan.wordLimit === 2 ? 'TWO' : 'THREE'} WORDS${plan.numberAllowed ? ' AND/OR A NUMBER' : ''}`;
  return `Complete the ${form} below. Write ${limit} for each answer.`;
}

// --- Request -----------------------------------------------------------------

const option = S.obj({ key: S.str(), text: S.str() });

function sectionSchema(part: ListeningPart, difficulty: ListeningDifficulty) {
  const types = [...new Set(LISTENING_BLUEPRINTS[part].groups.map((g) => g.type))];
  return S.obj(
    {
      part: S.str([String(part)]),
      difficulty: S.str([difficulty]),
      title: S.str(),
      contextVi: S.str(),
      speakers: S.arr(S.obj({ name: S.str(), gender: S.str(['female', 'male']), roleVi: S.str() })),
      segments: S.arr(S.obj({ lines: S.arr(S.obj({ speaker: S.str(), text: S.str() })) })),
      groups: S.arr(
        S.obj(
          {
            type: S.str(types),
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
                  segment: S.num(),
                  evidence: S.str(),
                  distractor: S.str(),
                  paraphraseQuestion: S.str(),
                  paraphraseAudio: S.str(),
                  explanationVi: S.str(),
                },
                ['number', 'answers', 'segment', 'evidence', 'explanationVi'],
              ),
            ),
          },
          ['type', 'questions'],
        ),
      ),
    },
    ['part', 'difficulty', 'title', 'contextVi', 'speakers', 'segments', 'groups'],
  );
}

export function listeningSectionPrompt(part: ListeningPart, difficulty: ListeningDifficulty, topic: string): string {
  const plan = LISTENING_BLUEPRINTS[part];
  let n = firstQuestion(part);
  const groups = plan.groups
    .map((g, i) => {
      const range = `${n}-${n + g.count - 1}`;
      n += g.count;
      const limit =
        g.type === 'completion'
          ? ` Every answer is at most ${g.wordLimit} word${g.wordLimit === 1 ? '' : 's'}${g.numberAllowed ? ', or a number, or words plus one number' : ' and never a number'}.`
          : '';
      return `${i + 1}. type "${g.type}", questions ${range}: ${g.brief}.${limit}`;
    })
    .join('\n');
  const speakers =
    plan.speakers === 2
      ? 'Exactly 2 speakers, one female and one male, both used in every segment.'
      : 'Exactly 1 speaker, who says every line.';

  return `You are an experienced IELTS test writer. Write one original IELTS Academic Listening Part ${part} section for Vietnamese learners. Never copy or adapt published IELTS or Cambridge material, and use no real brand names.

Part ${part}: ${plan.brief}
Topic: ${topic ? q(topic) : 'choose a fresh, realistic topic typical of this part'}
Difficulty: ${DIFFICULTY_BRIEF[difficulty]}

Return JSON with:
- part: "${part}"; difficulty: "${difficulty}"
- title: a short English title for the section
- contextVi: one Vietnamese sentence saying who is talking and why
- speakers: ${speakers} name is one capitalised English first name in plain letters ("Anna"), gender is "female" or "male", roleVi is the role in Vietnamese ("Nhân viên lễ tân")
- segments: the script in 4-6 parts, in order. Each segment is one audio clip of 700-1300 characters of spoken text, never more than 1400. lines[].speaker is exactly a speaker name; lines[].text is what they say, with no name prefix.
- groups: exactly these groups, in this order:
${groups}

Script rules:
- About 550-800 words in total, natural spoken English: short turns, contractions, a few fillers ("Let me see", "Right") and self-corrections, but no stage directions or sound effects.
- Every answer is said clearly once. The questions follow the order of the recording: a later question is never answered in an earlier segment.
- Write numbers in the script as a speaker would say them ("fourteen", "two thousand and five"), or as digits for long numbers, prices and times.

Question rules:
- number runs from ${firstQuestion(part)} to ${firstQuestion(part) + 9} with no gaps, across the groups in order.
- segment is the 1-based number of the segment that contains the answer.
- evidence is copied character for character from that segment: the phrase or sentence that gives the answer.
- distractor (optional) is copied character for character from the script: words that mention a wrong option or a value that is then corrected ("No, sorry, it's actually..."). Leave it empty when there is none.
- paraphraseQuestion and paraphraseAudio (optional): the words in the question and the different words the speaker uses for the same idea, the audio side copied from the script.
- explanationVi: 1-2 Vietnamese sentences saying why the answer is right and, if there is a distractor, why it is wrong.

Completion groups:
- title is the heading of the form or notes. lines are the form or note lines; each blank is written {{number}} (for example "Cost per night: £{{3}}"), each question has exactly one blank, in order.
- The line around a blank paraphrases the script; never write the answer itself in the lines.
- answers are words copied from the script, spelled as in the script, within the word limit. Add accepted variants as extra items (for example ["14", "fourteen"], ["colour", "color"]). Leave prompt and options empty.

Multiple choice ("mcq"): each question has prompt and options A, B, C (keys "A", "B", "C"); answers is the one correct letter. The wrong options are plausible and most are mentioned in the script. Spread the correct letters; do not use the same letter for every question.

"mcq_multi": the group prompt is the "Which TWO ...?" question and the group options are A-E. Both questions have the same answers: the two correct letters. Each question's evidence supports one of the two letters.

"matching": the group prompt is the task ("What does the speaker say about each place?"), optionsTitle labels the box, and the group options are 5-7 letters starting at A, more options than questions. Each question prompt is one item to match and answers is one letter. Use several different letters.`;
}

/** Writes one IELTS Listening part with questions, answers and evidence. */
export const generateListeningSection: OpSpec = {
  hourlyLimit: 10,
  models: FLASH_MODELS,
  timeoutMs: 90_000,
  kind: 'json',
  finalize: finalizeListeningSection,
  build(payload) {
    const p = asObject(payload);
    const part = Number(p.part);
    const safePart: ListeningPart = (LISTENING_PARTS as readonly number[]).includes(part) ? (part as ListeningPart) : 1;
    const difficulty = oneOf(p, 'difficulty', LISTENING_DIFFICULTIES, 'medium');
    const topic = str(p, 'topic', { max: 100, optional: true }).trim();
    return {
      contents: userText(listeningSectionPrompt(safePart, difficulty, topic)),
      generationConfig: jsonConfig(sectionSchema(safePart, difficulty), { temperature: 0.9 }),
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
  segment?: unknown;
  evidence?: unknown;
  distractor?: unknown;
  paraphraseQuestion?: unknown;
  paraphraseAudio?: unknown;
  explanationVi?: unknown;
}
interface RawGroup {
  type?: unknown;
  title?: unknown;
  lines?: unknown[];
  prompt?: unknown;
  optionsTitle?: unknown;
  options?: RawOption[];
  questions?: RawQuestion[];
}
interface RawSection {
  part?: unknown;
  difficulty?: unknown;
  title?: unknown;
  contextVi?: unknown;
  speakers?: { name?: unknown; gender?: unknown; roleVi?: unknown }[];
  segments?: { lines?: { speaker?: unknown; text?: unknown }[] }[];
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
  segmentId: string;
  evidence: string;
  distractor?: string;
  paraphrase?: { question: string; audio: string };
  explanationVi: string;
}
export interface GeneratedGroup {
  id: string;
  type: GeneratedGroupType;
  instruction: string;
  questions: GeneratedQuestion[];
  wordLimit?: number;
  numberAllowed?: boolean;
  title?: string;
  lines?: string[];
  prompt?: string;
  optionsTitle?: string;
  options?: GeneratedOption[];
}
/** Structurally a ListeningSection with no map or table groups. */
export interface GeneratedSection {
  id: string;
  part: ListeningPart;
  title: string;
  contextVi: string;
  style: ListeningStyle;
  speakers: { name: string; voice: ListeningVoice; roleVi?: string }[];
  segments: { id: string; lines: { speaker: string; text: string }[] }[];
  groups: GeneratedGroup[];
  prepSeconds: number;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
const optional = (v: unknown) => text(v) || undefined;
const arr = <T>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

const options = (v: RawOption[] | undefined): GeneratedOption[] =>
  arr(v)
    .map((o) => ({ key: text(o?.key).toUpperCase(), text: text(o?.text) }))
    .filter((o) => o.key || o.text);

function normalizeQuestion(raw: RawQuestion, letterAnswers: boolean, segmentId: (n: unknown) => string): GeneratedQuestion {
  const answers = [...new Set(arr(raw.answers).map((a) => (letterAnswers ? text(a).toUpperCase() : text(a))).filter(Boolean))];
  const pq = text(raw.paraphraseQuestion);
  const pa = text(raw.paraphraseAudio);
  const opts = options(raw.options);
  return {
    number: Number(raw.number),
    prompt: optional(raw.prompt),
    ...(opts.length ? { options: opts } : {}),
    answers,
    segmentId: segmentId(raw.segment),
    evidence: text(raw.evidence),
    distractor: optional(raw.distractor),
    ...(pq && pa ? { paraphrase: { question: pq, audio: pa } } : {}),
    explanationVi: text(raw.explanationVi),
  };
}

/** The model's JSON in the app's shape, with ids, voices and instructions filled in. Does not check it. */
export function normalizeGeneratedSection(data: unknown): GeneratedSection {
  const d = (data && typeof data === 'object' ? data : {}) as RawSection;
  const part = Number(d.part) as ListeningPart;
  const plan = LISTENING_BLUEPRINTS[part] ?? LISTENING_BLUEPRINTS[1];
  const id = `gen-p${part}`;

  const used = { female: 0, male: 0 };
  const speakers = arr(d.speakers).map((s) => {
    const gender = s?.gender === 'male' ? 'male' : 'female';
    const voices = gender === 'male' ? MALE_VOICES : FEMALE_VOICES;
    return { name: text(s?.name), voice: voices[used[gender]++ % voices.length], roleVi: optional(s?.roleVi) };
  });

  const segments = arr(d.segments).map((seg, i) => ({
    id: `${id}-s${i + 1}`,
    lines: arr(seg?.lines)
      .map((l) => {
        const speaker = text(l?.speaker);
        // Models sometimes repeat the name inside the line ("Anna: Hello").
        const said = text(l?.text).replace(new RegExp(`^${speaker.replace(/[^A-Za-z]/g, '')}\\s*:\\s*`), '');
        return { speaker, text: said };
      })
      .filter((l) => l.text),
  }));
  const segmentId = (n: unknown) => segments[Number(n) - 1]?.id ?? `${id}-s${String(n)}`;

  const groups = arr(d.groups).map((g, gi): GeneratedGroup => {
    const type = text(g?.type) as GeneratedGroupType;
    const groupPlan = plan.groups[gi];
    const questions = arr(g?.questions).map((raw) => normalizeQuestion(raw ?? {}, type !== 'completion', segmentId));
    const base = { id: `${id}-g${gi + 1}`, type, questions };
    const groupOptions = options(g?.options);
    const first = questions[0]?.number;
    const last = questions[questions.length - 1]?.number;

    if (type === 'completion') {
      const wordLimit = groupPlan?.type === 'completion' ? groupPlan.wordLimit! : 1;
      const numberAllowed = groupPlan?.type === 'completion' ? groupPlan.numberAllowed! : false;
      const form = part === 1 && gi === 0 ? 'form' : 'notes';
      return {
        ...base,
        instruction: completionInstruction({ type, count: questions.length, wordLimit, numberAllowed, brief: '' }, form),
        wordLimit,
        numberAllowed,
        title: optional(g?.title),
        lines: arr(g?.lines).map(text).filter(Boolean),
        questions: questions.map(({ options: _o, prompt: _p, ...q }) => q),
      };
    }
    if (type === 'mcq') return { ...base, instruction: 'Choose the correct letter, A, B or C.' };
    if (type === 'mcq_multi') {
      // Both questions carry the same pair of letters; repair a model that split them.
      const shared = [...new Set(questions.flatMap((q) => q.answers))].sort();
      return {
        ...base,
        instruction: `Choose TWO letters, ${letterRange(groupOptions.length || 5)}.`,
        prompt: optional(g?.prompt),
        options: groupOptions,
        questions: questions.map(({ options: _o, prompt: _p, ...q }) => ({ ...q, answers: shared })),
      };
    }
    if (type === 'matching') {
      const task = text(g?.prompt);
      const ask = `Choose the correct letter, ${letterRange(groupOptions.length || 5)}, next to questions ${first}–${last}.`;
      return {
        ...base,
        instruction: task ? `${/[.?!]$/.test(task) ? task : `${task}.`} ${ask}` : ask,
        optionsTitle: optional(g?.optionsTitle),
        options: groupOptions,
        questions: questions.map(({ options: _o, ...q }) => q),
      };
    }
    return { ...base, instruction: '' };
  });

  return {
    id,
    part,
    title: text(d.title),
    contextVi: text(d.contextVi),
    style: plan.style,
    speakers,
    segments,
    groups,
    prepSeconds: 30,
  };
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Questions must follow the recording: a later question is never answered
 * in an earlier segment. The two questions of a "Choose TWO" group may come
 * in either order.
 */
export function orderProblems(section: CheckSection): string[] {
  const index = new Map(section.segments.map((s, i) => [s.id, i]));
  const items = section.groups.flatMap((g) => g.questions.map((q) => ({ q, g })));
  const problems: string[] = [];
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const cur = items[i];
    if (prev.g === cur.g && cur.g.type === 'mcq_multi') continue;
    const a = index.get(prev.q.segmentId);
    const b = index.get(cur.q.segmentId);
    if (a !== undefined && b !== undefined && b < a) problems.push(`${section.id} Q${cur.q.number}: answered before Q${prev.q.number} in the recording`);
  }
  return problems;
}

/** Problems against the part's blueprint, on top of the shared data rules. */
export function blueprintProblems(section: GeneratedSection, difficulty?: ListeningDifficulty): string[] {
  const problems: string[] = [];
  const plan = LISTENING_BLUEPRINTS[section.part];
  if (!plan) return [`unknown part ${String(section.part)}`];
  const add = (msg: string) => problems.push(`${section.id}: ${msg}`);

  if (!section.title) add('no title');
  if (!section.contextVi) add('no contextVi');

  const names = section.speakers.map((s) => s.name);
  if (names.length !== plan.speakers) add(`needs ${plan.speakers} speaker(s), got ${names.length}`);
  if (new Set(names).size !== names.length) add('speaker names repeat');
  for (const n of names) if (!SPEAKER_NAME.test(n)) add(`speaker name "${n}" must be one capitalised word`);
  if (new Set(section.speakers.map((s) => s.voice)).size !== section.speakers.length) add('two speakers share a voice');

  if (section.segments.length < 3 || section.segments.length > 8) add(`needs 3-8 segments, got ${section.segments.length}`);
  const total = words(section.segments.flatMap((s) => s.lines.map((l) => l.text)).join(' '));
  if (total < 400) add(`script is only ${total} words`);

  const shape = section.groups.map((g) => `${g.type}×${g.questions.length}`).join(', ');
  const expected = plan.groups.map((g) => `${g.type}×${g.count}`).join(', ');
  if (shape !== expected) add(`groups are [${shape}], expected [${expected}]`);

  const questions = section.groups.flatMap((g) => g.questions);
  if (questions[0]?.number !== firstQuestion(section.part)) add(`numbering must start at ${firstQuestion(section.part)}`);

  for (const g of section.groups) {
    const at = (msg: string) => add(`${g.id}: ${msg}`);
    const keysAre = (opts: GeneratedOption[] | undefined, min: number, max: number) => {
      const keys = (opts ?? []).map((o) => o.key);
      if (keys.length < min || keys.length > max) return at(`needs ${min === max ? min : `${min}-${max}`} options, got ${keys.length}`);
      if (keys.join() !== letters(keys.length).join()) at(`option letters must be ${letterRange(keys.length)}`);
      if ((opts ?? []).some((o) => !o.text)) at('an option has no text');
      if (new Set((opts ?? []).map((o) => o.text.toLowerCase())).size !== keys.length) at('options repeat');
    };

    if (g.type === 'completion') {
      if (!g.lines?.length) at('no lines');
      for (const q of g.questions) {
        const line = g.lines?.find((l) => l.includes(`{{${q.number}}}`)) ?? '';
        const around = squash(line.replace(/\{\{\d+\}\}/g, ' '));
        // Short answers ("6", "red") can occur by chance; longer ones would give the answer away.
        if (q.answers.some((a) => squash(a).length >= 4 && around.includes(squash(a)))) at(`Q${q.number}: the notes already show the answer`);
      }
    } else if (g.type === 'mcq') {
      for (const q of g.questions) keysAre(q.options, 3, 3);
      const picked = g.questions.map((q) => q.answers[0]);
      if (picked.length >= 3 && new Set(picked).size === 1) at('every answer is the same letter');
    } else if (g.type === 'mcq_multi') {
      keysAre(g.options, 5, 5);
      if (!g.prompt) at('no prompt');
    } else if (g.type === 'matching') {
      keysAre(g.options, g.questions.length + 1, 8);
      const picked = g.questions.map((q) => q.answers[0]);
      if (picked.length >= 3 && new Set(picked).size === 1) at('every answer is the same letter');
    }
    for (const q of g.questions) {
      if (q.answers.length === 0) continue;
      if (g.type !== 'completion' && q.answers.some((a) => !/^[A-Z]$/.test(a))) at(`Q${q.number}: answers must be letters`);
    }
  }

  if (difficulty) {
    const distractors = questions.filter((q) => q.distractor).length;
    if (distractors < MIN_DISTRACTORS[difficulty]) add(`${difficulty} needs at least ${MIN_DISTRACTORS[difficulty]} distractors, got ${distractors}`);
  }
  return [...problems, ...orderProblems(section)];
}

/** Every problem in a generated section; empty when it can be used. */
export function generatedSectionProblems(section: GeneratedSection, difficulty?: ListeningDifficulty): string[] {
  return [...sectionProblems(section), ...blueprintProblems(section, difficulty)];
}

export function finalizeListeningSection(data: unknown): GeneratedSection {
  const d = data as RawSection | null;
  if (!LISTENING_BLUEPRINTS[Number(d?.part) as ListeningPart]) throw new Error('generated section has no valid part');
  const difficulty = (LISTENING_DIFFICULTIES as readonly unknown[]).includes(d?.difficulty)
    ? (d!.difficulty as ListeningDifficulty)
    : undefined;
  const section = normalizeGeneratedSection(data);
  const problems = generatedSectionProblems(section, difficulty);
  if (problems.length) {
    throw new Error(`generated section failed ${problems.length} check(s): ${problems.slice(0, 6).join('; ')}`);
  }
  return section;
}
