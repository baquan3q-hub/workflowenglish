/**
 * Reading library (IELTS phase R7): tests written on the admin page and kept
 * in `reading_library` (migration 012). Pure: building and editing a test,
 * splitting a pasted passage into lettered paragraphs, question groups and
 * their numbering, checks before publishing and the AI notes merge.
 *
 * A library test opens like a bundled one, with the id `rlib_<row id>`.
 */
import type {
  ChoiceOption,
  DiagramGroup,
  DiagramShape,
  DiagramShapeKind,
  GlossaryEntry,
  ReadingCompletionGroup,
  ReadingDifficulty,
  ReadingGroup,
  ReadingParagraph,
  ReadingPassage,
  ReadingQuestion,
  ReadingSkill,
  ReadingTest,
} from '../data/ielts/reading/types';
import type { GroupKind } from '../components/ielts/questions/questionLogic';
import { passageQuestions, passageWordCount, validateReadingTest } from './readingLogic';
import { isMissingTable } from './listeningLibraryLogic';
import { foldText } from './vocabLibraryLogic';
import type { ReadingQuestionNote } from '../supabase/functions/ai-proxy/ops/readingNotes.ts';

export { answersText, optionsText, parseAnswers, parseOptions } from './listeningLibraryLogic';

export type ReadingLibraryKind = 'full' | 'practice';
export type ReadingLibraryStatus = 'draft' | 'published';
export type ReadingPart = ReadingPassage['part'];

export interface ReadingLibraryItem {
  id: string;
  title: string;
  kind: ReadingLibraryKind;
  status: ReadingLibraryStatus;
  descriptionVi: string;
  passages: ReadingPassage[];
  createdAt: string;
  updatedAt: string;
}

/** Every question type the editor can add (all Reading kinds; maps are Listening only). */
export type ReadingEditorKind = Exclude<GroupKind, 'map'>;

export const READING_EDITOR_KINDS: ReadingEditorKind[] = [
  'tfng',
  'ynng',
  'mcq',
  'mcq_multi',
  'headings',
  'matching_paragraph',
  'matching_feature',
  'matching_ending',
  'completion',
  'summary_box',
  'flowchart',
  'short_answer',
  'diagram',
];

export const SKILL_LABELS_VI: Record<ReadingSkill, string> = {
  scan: 'Scan (tìm chi tiết)',
  skim: 'Skim (đọc lướt)',
  detail: 'Hiểu chi tiết',
  inference: 'Suy luận',
  main_idea: 'Ý chính',
};

/** The passage word count the exam uses. */
export const PASSAGE_WORDS = { min: 700, max: 950 } as const;

/** Suggested minutes per passage: 17 + 20 + 23 = the exam's 60. */
export const PART_MINUTES: Record<ReadingPart, number> = { 1: 17, 2: 20, 3: 23 };

// --- Ids ----------------------------------------------------------------------------

const TEST_PREFIX = 'rlib_';
export const readingLibraryTestId = (id: string) => `${TEST_PREFIX}${id}`;
export const isReadingLibraryTestId = (testId: string) => testId.startsWith(TEST_PREFIX);
export const readingLibraryRowId = (testId: string) => testId.slice(TEST_PREFIX.length);
export const readingPreviewTestId = (id: string) => `rpreview_${id}`;

/** Passage ids are unique across the library, since drafts and highlights are keyed by them. */
export const passageIdFor = (itemId: string, part: ReadingPart) => `rlib-${itemId.replace(/-/g, '').slice(0, 10)}-p${part}`;

function freshGroupId(passage: ReadingPassage): string {
  const taken = passage.groups.map((g) => g.id);
  for (let n = taken.length + 1; ; n++) {
    const id = `${passage.id}-g${n}`;
    if (!taken.includes(id)) return id;
  }
}

/** A passage under a new id, its group ids moved with it. */
function rekeyPassage(p: ReadingPassage, id: string): ReadingPassage {
  return { ...p, id, groups: p.groups.map((g) => ({ ...g, id: g.id.startsWith(`${p.id}-`) ? `${id}-${g.id.slice(p.id.length + 1)}` : g.id })) };
}

// --- New tests ------------------------------------------------------------------------------

export function emptyPassage(itemId: string, part: ReadingPart): ReadingPassage {
  return {
    id: passageIdFor(itemId, part),
    part,
    title: '',
    topic: '',
    difficulty: part === 1 ? 'easy' : part === 2 ? 'medium' : 'hard',
    paragraphs: [],
    groups: [],
    glossary: [],
    suggestedMinutes: PART_MINUTES[part],
  };
}

export function emptyReadingItem(id: string, kind: ReadingLibraryKind, part: ReadingPart = 1, now = new Date().toISOString()): ReadingLibraryItem {
  const parts: ReadingPart[] = kind === 'full' ? [1, 2, 3] : [part];
  return { id, title: '', kind, status: 'draft', descriptionVi: '', passages: parts.map((p) => emptyPassage(id, p)), createdAt: now, updatedAt: now };
}

/** A draft copy with its own ids, so its drafts and highlights never mix with the original's. */
export function duplicateReadingItem(item: ReadingLibraryItem, newId: string, now = new Date().toISOString()): ReadingLibraryItem {
  return {
    ...structuredClone(item),
    id: newId,
    title: `${item.title} (bản sao)`.slice(0, 200),
    status: 'draft',
    passages: item.passages.map((p) => rekeyPassage(structuredClone(p), passageIdFor(newId, p.part))),
    createdAt: now,
    updatedAt: now,
  };
}

/** A one-passage test moved to another part: new id, the part's suggested minutes. */
export function setPracticePart(item: ReadingLibraryItem, part: ReadingPart): ReadingLibraryItem {
  if (item.kind !== 'practice') return item;
  return {
    ...item,
    passages: item.passages.map((p) => ({ ...rekeyPassage(p, passageIdFor(item.id, part)), part, suggestedMinutes: PART_MINUTES[part] })),
  };
}

export function libraryReadingTest(item: ReadingLibraryItem, id = readingLibraryTestId(item.id)): ReadingTest {
  const first = item.passages[0];
  const fallback = item.kind === 'full' ? 'Đề Reading 3 passage do giáo viên soạn.' : `Passage ${first?.part ?? 1}${first?.topic ? ` · ${first.topic}` : ''}.`;
  return { id, title: item.title || 'Đề chưa đặt tên', kind: item.kind, descriptionVi: item.descriptionVi || fallback, passages: item.passages };
}

// --- Paragraphs and glossary --------------------------------------------------------------------

const LETTER_PREFIX = /^([A-L])[.):]?\s+(?=\S)/;

/**
 * A pasted passage split at blank lines into paragraphs A, B, …. A letter
 * already printed at the start ("A ", "B.") is dropped, and lines inside a
 * paragraph are joined. Without blank lines every line is a paragraph.
 */
export function splitParagraphs(text: string): ReadingParagraph[] {
  const normal = text.replace(/\r\n?/g, '\n').trim();
  if (!normal) return [];
  const blocks = /\n\s*\n/.test(normal) ? normal.split(/\n\s*\n/) : normal.split('\n');
  const texts = blocks.map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean).join(' ')).filter(Boolean);
  // Strip printed letters only when every paragraph has its own, in order.
  const lettered = texts.every((t, i) => LETTER_PREFIX.exec(t)?.[1] === String.fromCharCode(65 + i));
  return texts.slice(0, 12).map((t, i) => ({ label: String.fromCharCode(65 + i), text: lettered ? t.replace(LETTER_PREFIX, '') : t }));
}

export const paragraphsText = (paragraphs: readonly ReadingParagraph[]) => paragraphs.map((p) => p.text).join('\n\n');

/** New paragraphs; "which paragraph" options follow the letters. */
export function setParagraphs(p: ReadingPassage, paragraphs: ReadingParagraph[]): ReadingPassage {
  const options = paragraphs.map((x) => ({ key: x.label, text: `Paragraph ${x.label}` }));
  return {
    ...p,
    paragraphs,
    groups: p.groups.map((g) => (g.type === 'matching' && g.target === 'paragraph' ? { ...g, options } : g)),
  };
}

/** "term = nghĩa" (or "term: nghĩa") per line. */
export function parseGlossary(text: string): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = /^(.+?)\s*[=:]\s*(.+)$/.exec(raw.trim());
    if (m && !out.some((g) => g.term.toLowerCase() === m[1].toLowerCase())) out.push({ term: m[1].trim(), meaningVi: m[2].trim() });
  }
  return out.slice(0, 40);
}

export const glossaryText = (glossary: readonly GlossaryEntry[] | undefined) => (glossary ?? []).map((g) => `${g.term} = ${g.meaningVi}`).join('\n');

// --- Question groups ---------------------------------------------------------------------------------

const DEFAULT_SKILL: Record<ReadingEditorKind, ReadingSkill> = {
  tfng: 'detail',
  ynng: 'inference',
  mcq: 'detail',
  mcq_multi: 'detail',
  headings: 'main_idea',
  matching_paragraph: 'scan',
  matching_feature: 'scan',
  matching_ending: 'detail',
  completion: 'scan',
  summary_box: 'detail',
  flowchart: 'scan',
  short_answer: 'scan',
  diagram: 'scan',
};

export const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
const blankOptions = (n: number): ChoiceOption[] => letters(n).map((key) => ({ key, text: '' }));

export function blankReadingQuestion(number: number, paragraph: string, skill: ReadingSkill, extra: Partial<ReadingQuestion> = {}): ReadingQuestion {
  return { number, answers: [], paragraph, evidence: '', explanationVi: '', skill, ...extra };
}

function instructionFor(kind: ReadingEditorKind, part: ReadingPart, paragraphs: number): string {
  const last = String.fromCharCode(64 + Math.max(paragraphs, 1));
  switch (kind) {
    case 'tfng':
      return `Do the following statements agree with the information given in Reading Passage ${part}? Write TRUE, FALSE or NOT GIVEN.`;
    case 'ynng':
      return `Do the following statements agree with the claims of the writer in Reading Passage ${part}? Write YES, NO or NOT GIVEN.`;
    case 'mcq':
      return 'Choose the correct letter, A, B, C or D.';
    case 'mcq_multi':
      return 'Choose TWO letters, A–E.';
    case 'headings':
      return `Reading Passage ${part} has ${paragraphs} paragraphs, A–${last}. Choose the correct heading for each paragraph from the list of headings below.`;
    case 'matching_paragraph':
      return `Reading Passage ${part} has ${paragraphs} paragraphs, A–${last}. Which paragraph contains the following information? You may use any letter more than once.`;
    case 'matching_feature':
      return 'Look at the following statements and the list of people below. Match each statement with the correct person.';
    case 'matching_ending':
      return 'Complete each sentence with the correct ending below.';
    case 'completion':
      return 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.';
    case 'summary_box':
      return 'Complete the summary using the list of words below.';
    case 'flowchart':
      return 'Complete the flow-chart below. Choose ONE WORD ONLY from the passage for each answer.';
    case 'short_answer':
      return 'Answer the questions below. Choose NO MORE THAN THREE WORDS from the passage for each answer.';
    case 'diagram':
      return 'Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer.';
  }
}

/** A new group of `kind` with one question (two for "Choose TWO"), numbered when the test is renumbered. */
export function addReadingGroup(p: ReadingPassage, kind: ReadingEditorKind): ReadingPassage {
  const id = freshGroupId(p);
  const n = (passageQuestions(p).at(-1)?.number ?? 0) + 1;
  const para = p.paragraphs[0]?.label ?? 'A';
  const skill = DEFAULT_SKILL[kind];
  const instruction = instructionFor(kind, p.part, p.paragraphs.length);
  const q = (extra: Partial<ReadingQuestion> = {}) => blankReadingQuestion(n, para, skill, extra);
  let group: ReadingGroup;
  switch (kind) {
    case 'tfng':
    case 'ynng':
      group = { id, type: 'tfng', variant: kind, instruction, questions: [q({ prompt: '' })] };
      break;
    case 'mcq':
      group = { id, type: 'mcq', instruction, questions: [q({ prompt: '', options: blankOptions(4) })] };
      break;
    case 'mcq_multi':
      group = { id, type: 'mcq_multi', instruction, prompt: '', options: blankOptions(5), questions: [q(), blankReadingQuestion(n + 1, para, skill)] };
      break;
    case 'headings':
      group = {
        id,
        type: 'headings',
        instruction,
        headings: ROMAN.slice(0, Math.min(ROMAN.length, Math.max(p.paragraphs.length + 2, 5))).map((key) => ({ key, text: '' })),
        questions: [q()],
      };
      break;
    case 'matching_paragraph':
      group = {
        id,
        type: 'matching',
        target: 'paragraph',
        instruction,
        reuse: true,
        options: p.paragraphs.map((x) => ({ key: x.label, text: `Paragraph ${x.label}` })),
        questions: [q({ prompt: '' })],
      };
      break;
    case 'matching_feature':
      group = { id, type: 'matching', target: 'feature', instruction, optionsTitle: 'List of People', options: blankOptions(3), questions: [q({ prompt: '' })] };
      break;
    case 'matching_ending':
      group = { id, type: 'matching', target: 'ending', instruction, options: blankOptions(5), questions: [q({ prompt: '' })] };
      break;
    case 'completion':
    case 'flowchart':
      group = {
        id,
        type: 'completion',
        instruction,
        wordLimit: kind === 'flowchart' ? 1 : 2,
        numberAllowed: false,
        title: '',
        layout: kind === 'flowchart' ? 'flowchart' : 'lines',
        lines: [`{{${n}}}`],
        questions: [q()],
      };
      break;
    case 'summary_box':
      group = { id, type: 'completion', instruction, wordLimit: 1, numberAllowed: false, title: '', lines: [`{{${n}}}`], wordBox: blankOptions(6), questions: [q()] };
      break;
    case 'short_answer':
      group = { id, type: 'short_answer', instruction, wordLimit: 3, numberAllowed: false, questions: [q({ prompt: '' })] };
      break;
    case 'diagram':
      group = { id, type: 'diagram', instruction, wordLimit: 2, numberAllowed: false, diagram: { title: '', width: 420, height: 300, shapes: [] }, questions: [] };
      break;
  }
  return { ...p, groups: [...p.groups, group] };
}

export function removeReadingGroup(p: ReadingPassage, id: string): ReadingPassage {
  return { ...p, groups: p.groups.filter((g) => g.id !== id) };
}

export function moveReadingGroup(p: ReadingPassage, id: string, by: -1 | 1): ReadingPassage {
  const i = p.groups.findIndex((g) => g.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= p.groups.length) return p;
  const groups = [...p.groups];
  [groups[i], groups[j]] = [groups[j], groups[i]];
  return { ...p, groups };
}

export function updateReadingGroup(p: ReadingPassage, group: ReadingGroup): ReadingPassage {
  return { ...p, groups: p.groups.map((g) => (g.id === group.id ? group : g)) };
}

/** Whether the group's questions come from blanks in a template (added and removed there). */
export const blankDriven = (g: ReadingGroup) => g.type === 'completion' || g.type === 'diagram';

/** One more question at the end of a group (not for blank-driven groups). */
export function addReadingQuestion(g: ReadingGroup): ReadingGroup {
  const last = g.questions.at(-1);
  const n = (last?.number ?? 0) + 1;
  const base = blankReadingQuestion(n, last?.paragraph ?? 'A', last?.skill ?? 'detail');
  if (g.type === 'mcq') return { ...g, questions: [...g.questions, { ...base, prompt: '', options: blankOptions(4) }] };
  // "Choose TWO" becomes "Choose THREE": every question shares the answers.
  if (g.type === 'mcq_multi') return { ...g, questions: [...g.questions, { ...base, answers: last?.answers ?? [] }] };
  if (g.type === 'headings') {
    const asked = g.questions.map((q) => q.paragraph);
    const next = String.fromCharCode(Math.min(76, (last?.paragraph ?? '@').charCodeAt(0) + 1));
    return { ...g, questions: [...g.questions, { ...base, paragraph: asked.includes(next) ? base.paragraph : next }] };
  }
  return { ...g, questions: [...g.questions, { ...base, prompt: '' }] } as ReadingGroup;
}

export function removeReadingQuestion(g: ReadingGroup, number: number): ReadingGroup {
  if (g.questions.length <= 1) return g;
  return { ...g, questions: g.questions.filter((q) => q.number !== number) } as ReadingGroup;
}

export function updateReadingQuestion(g: ReadingGroup, number: number, patch: Partial<ReadingQuestion>): ReadingGroup {
  return { ...g, questions: g.questions.map((q) => (q.number === number ? { ...q, ...patch } : q)) } as ReadingGroup;
}

/** "Choose TWO": sets the shared answers. */
export function setReadingMultiAnswers(g: ReadingGroup, keys: string[]): ReadingGroup {
  const answers = [...new Set(keys)].sort();
  return { ...g, questions: g.questions.map((q) => ({ ...q, answers })) } as ReadingGroup;
}

const BLANK = /\{\{(\d+)\}\}/g;

/** Numbers every question 1, 2, … across the passages, and the blanks in templates with them. */
export function renumberReadingItem(item: ReadingLibraryItem): ReadingLibraryItem {
  let n = 1;
  const passages = item.passages.map((p) => ({
    ...p,
    groups: p.groups.map((g) => {
      const map = new Map<number, number>();
      const questions = g.questions.map((q) => {
        map.set(q.number, n);
        return { ...q, number: n++ };
      });
      const fix = (t: string) => t.replace(BLANK, (all, old) => (map.has(Number(old)) ? `{{${map.get(Number(old))}}}` : all));
      if (g.type === 'completion') {
        return {
          ...g,
          questions,
          ...(g.lines ? { lines: g.lines.map(fix) } : {}),
          ...(g.table ? { table: { header: g.table.header.map(fix), rows: g.table.rows.map((r) => r.map(fix)) } } : {}),
        };
      }
      if (g.type === 'diagram') {
        return { ...g, questions, diagram: { ...g.diagram, shapes: g.diagram.shapes.map((s) => (s.text ? { ...s, text: fix(s.text) } : s)) } };
      }
      return { ...g, questions };
    }) as ReadingGroup[],
  }));
  return { ...item, passages };
}

/** Replaces one passage and renumbers the test. */
export function setPassage(item: ReadingLibraryItem, index: number, passage: ReadingPassage): ReadingLibraryItem {
  return renumberReadingItem({ ...item, passages: item.passages.map((p, i) => (i === index ? passage : p)) });
}

// --- Templates: "___" in the editor, {{n}} in the data --------------------------------------------------

const UNDERSCORES = /_{3,}/g;
const show = (t: string) => t.replace(BLANK, '___');

/** Questions for `count` blanks: existing ones keep their notes, new ones are added, extra ones dropped. */
function fitQuestions(g: ReadingCompletionGroup | DiagramGroup, count: number, start: number, paragraph: string): ReadingQuestion[] {
  const last = g.questions.at(-1);
  return Array.from({ length: count }, (_, i) => g.questions[i] ?? blankReadingQuestion(start + i, last?.paragraph ?? paragraph, last?.skill ?? 'scan')).map((q, i) => ({
    ...q,
    number: start + i,
  }));
}

/** What the admin types: blanks as ___, a table as "a | b | c" rows with the header first. */
export function completionText(g: ReadingCompletionGroup): { mode: 'lines' | 'table'; text: string } {
  if (g.table) return { mode: 'table', text: [g.table.header, ...g.table.rows].map((r) => r.map(show).join(' | ')).join('\n') };
  return { mode: 'lines', text: (g.lines ?? []).map(show).join('\n') };
}

/** Reads the admin's template. Each ___ becomes the next question. */
export function applyCompletionText(g: ReadingCompletionGroup, mode: 'lines' | 'table', text: string, paragraph: string): ReadingCompletionGroup {
  const start = g.questions[0]?.number ?? 1;
  let k = 0;
  const fill = (t: string) => t.replace(UNDERSCORES, () => `{{${start + k++}}}`);
  const rows = text.split(/\r?\n/).filter((r) => r.trim());
  const { lines: _l, table: _t, ...rest } = g;
  const shape =
    mode === 'table'
      ? (() => {
          const cells = rows.map((r) => r.split('|').map((c) => fill(c.trim())));
          return { table: { header: cells[0] ?? [], rows: cells.slice(1) } };
        })()
      : { lines: rows.map((r) => fill(r.trim())) };
  return { ...rest, ...shape, questions: fitQuestions(g, k, start, paragraph) };
}

const SHAPE_KINDS: readonly DiagramShapeKind[] = ['box', 'circle', 'line', 'arrow'];

/** "box x y w h text" per line; " | " in the text starts a new line in the shape. */
export const shapesText = (shapes: readonly DiagramShape[]) =>
  shapes.map((s) => [s.kind, s.x, s.y, s.w, s.h, show(s.text ?? '').replace(/\n/g, ' | ')].join(' ').trim()).join('\n');

/** Reads the diagram shapes; each ___ becomes the next question. Returns the 1-based lines it could not read. */
export function applyShapesText(g: DiagramGroup, text: string, paragraph: string): { group: DiagramGroup; bad: number[] } {
  const start = g.questions[0]?.number ?? 1;
  let k = 0;
  const shapes: DiagramShape[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const row = raw.trim();
    if (!row) return;
    const m = /^(\w+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*(.*)$/.exec(row);
    const kind = m?.[1].toLowerCase() as DiagramShapeKind | undefined;
    if (!m || !kind || !SHAPE_KINDS.includes(kind)) {
      bad.push(i + 1);
      return;
    }
    const shape: DiagramShape = { kind, x: Number(m[2]), y: Number(m[3]), w: Number(m[4]), h: Number(m[5]) };
    const label = m[6].trim();
    if (label) shape.text = label.replace(UNDERSCORES, () => `{{${start + k++}}}`).split(/\s+\|\s+/).join('\n');
    shapes.push(shape);
  });
  return { group: { ...g, diagram: { ...g.diagram, shapes }, questions: fitQuestions(g, k, start, paragraph) }, bad };
}

/** Headings typed one per line; "iv. text" keeps only the text, keys are i, ii, iii … in order. */
export function parseHeadings(text: string): ChoiceOption[] {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean).slice(0, ROMAN.length);
  return rows.map((r, i) => ({ key: ROMAN[i], text: r.replace(/^[ivx]+\s*[.):-]\s*/i, '').trim() }));
}

export const headingsText = (headings: readonly ChoiceOption[]) => headings.map((h) => `${h.key}. ${h.text}`).join('\n');

/** The line a completion or diagram question sits in, its blank shown as ___. */
export function readingBlankContext(g: ReadingGroup, number: number): string {
  const token = `{{${number}}}`;
  const rows =
    g.type === 'completion'
      ? [...(g.lines ?? []), ...(g.table ? [g.table.header.join(' | '), ...g.table.rows.map((r) => r.join(' | '))] : [])]
      : g.type === 'diagram'
        ? g.diagram.shapes.map((s) => (s.text ?? '').replace(/\n/g, ' '))
        : [];
  return (rows.find((r) => r.includes(token)) ?? '').replace(token, '___').replace(BLANK, '…');
}

// --- Evidence picked in the passage -------------------------------------------------------------------

const flat = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The paragraph and words the admin selected, cleaned, as evidence for a
 * question. Null when the selection is not one paragraph's words.
 */
export function evidenceFrom(p: ReadingPassage, label: string, selected: string): { paragraph: string; evidence: string } | null {
  const text = p.paragraphs.find((x) => x.label === label)?.text;
  const evidence = selected.replace(/\s+/g, ' ').trim();
  if (!text || !evidence || !flat(text).includes(flat(evidence))) return null;
  return { paragraph: label, evidence };
}

// --- AI notes --------------------------------------------------------------------------------------------

export interface ReadingNotesOutcome {
  passage: ReadingPassage;
  /** Questions that got at least one field. */
  filled: number[];
  /** Questions whose suggested quote was not in the passage. */
  rejected: number[];
}

/** Groups whose question's paragraph is part of the answer, so the AI may not move it. */
const fixedParagraph = (g: ReadingGroup) => g.type === 'headings' || (g.type === 'matching' && g.target === 'paragraph');

/**
 * Fills the fields the admin left empty from the AI suggestions. A quote
 * (evidence, distractor) is used only when it really is in the passage.
 */
export function applyReadingNotes(p: ReadingPassage, notes: readonly ReadingQuestionNote[]): ReadingNotesOutcome {
  const textOf = new Map(p.paragraphs.map((x) => [x.label, flat(x.text)]));
  const all = [...textOf.values()].join(' ');
  const filled = new Set<number>();
  const rejected = new Set<number>();
  const groups = p.groups.map((g) => ({
    ...g,
    questions: g.questions.map((q) => {
      const note = notes.find((n) => n.number === q.number);
      if (!note) return q;
      const next = { ...q };
      if (!q.evidence.trim() && note.evidence) {
        // Keep the admin's paragraph when the quote is there, else take the AI's.
        const where = [q.paragraph, ...(fixedParagraph(g) ? [] : [note.paragraph])].find((l) => (textOf.get(l) ?? '').includes(flat(note.evidence)));
        if (where) Object.assign(next, { paragraph: where, evidence: note.evidence });
        else rejected.add(q.number);
      }
      if (!q.distractor && note.distractor) {
        if (all.includes(flat(note.distractor))) next.distractor = note.distractor;
        else rejected.add(q.number);
      }
      if (!q.paraphrase && note.paraphraseQuestion && note.paraphrasePassage) {
        next.paraphrase = { question: note.paraphraseQuestion, passage: note.paraphrasePassage };
      }
      if (!q.explanationVi.trim() && note.explanationVi) next.explanationVi = note.explanationVi;
      if (JSON.stringify(next) !== JSON.stringify(q)) filled.add(q.number);
      return next;
    }),
  })) as ReadingGroup[];
  return { passage: { ...p, groups }, filled: [...filled], rejected: [...rejected].filter((n) => !filled.has(n)) };
}

/** What the readingNotes op needs about a passage. */
export function readingNotesPayload(p: ReadingPassage) {
  const opts = (o: readonly ChoiceOption[] | undefined) => (o ?? []).map((x) => `${x.key}. ${x.text}`);
  return {
    title: p.title,
    paragraphs: p.paragraphs.filter((x) => x.text.trim()),
    questions: p.groups.flatMap((g) =>
      g.questions.map((q) => {
        const type = g.type === 'tfng' ? g.variant : g.type === 'matching' ? `matching_${g.target}` : g.type;
        const question =
          g.type === 'completion' || g.type === 'diagram'
            ? readingBlankContext(g, q.number)
            : g.type === 'mcq_multi'
              ? g.prompt
              : g.type === 'headings'
                ? `Heading for paragraph ${q.paragraph}`
                : (q.prompt ?? '');
        const options =
          g.type === 'mcq'
            ? opts(q.options)
            : g.type === 'mcq_multi' || g.type === 'matching'
              ? opts(g.options)
              : g.type === 'headings'
                ? opts(g.headings)
                : g.type === 'completion'
                  ? opts(g.wordBox)
                  : [];
        return { number: q.number, type, question, options, answers: q.answers };
      }),
    ),
  };
}

/** Questions still missing a note the review screen shows. */
export const readingQuestionsMissingNotes = (p: ReadingPassage) =>
  passageQuestions(p).filter((q) => !q.evidence.trim() || !q.explanationVi.trim()).map((q) => q.number);

// --- Checks before publishing --------------------------------------------------------------------------

export interface ReadingLibraryProblem {
  /** "Passage 2 · nhóm câu 3", "Câu 14", or "Đề". */
  where: string;
  message: string;
  /** The passage to open to fix it. */
  passageId?: string;
}

const MESSAGES: [RegExp, string][] = [
  [/^no paragraphs$/, 'chưa có bài đọc'],
  [/^paragraph (\d+) should be labelled ([A-Z])$/, 'đoạn $1 phải mang chữ $2'],
  [/^paragraph ([A-Z]) is empty$/, 'đoạn $1 trống'],
  [/^no questions$/, 'chưa có câu hỏi'],
  [/^numbers are not consecutive$/, 'số câu không liên tục'],
  [/^unknown paragraph (.*)$/, 'chưa chọn đoạn chứa đáp án (đoạn "$1" không có)'],
  [/^no answer$/, 'chưa có đáp án'],
  [/^evidence is not in paragraph ([A-Z])$/, 'câu chứa đáp án (evidence) chưa có hoặc không nằm trong đoạn $1'],
  [/^distractor is not in the passage$/, 'câu bẫy không có trong bài đọc'],
  [/^no explanation$/, 'chưa có giải thích'],
  [/^unknown skill (.*)$/, 'kỹ năng "$1" không hợp lệ'],
  [/^answer is not a letter in the word box$/, 'đáp án phải là một chữ cái trong hộp từ'],
  [/^answer "(.*)" breaks the word limit$/, 'đáp án "$1" vượt giới hạn số từ'],
  [/^answer is not in paragraph ([A-Z])$/, 'đáp án không xuất hiện nguyên văn trong đoạn $1'],
  [/^evidence does not contain the answer$/, 'evidence không chứa đáp án'],
  [/^no prompt$/, 'chưa có nội dung câu hỏi'],
  [/^no statement$/, 'chưa có nhận định'],
  [/^needs a prompt and at least 3 options$/, 'cần nội dung câu hỏi và ít nhất 3 lựa chọn'],
  [/^answer is not an option$/, 'đáp án chưa chọn hoặc không nằm trong các lựa chọn'],
  [/^questions in a multi-choice group must share answers$/, 'các câu trong nhóm "chọn nhiều" phải dùng chung đáp án'],
  [/^number of answers must match the number of questions$/, 'số đáp án đúng phải bằng số câu của nhóm'],
  [/^answer (\S+) is not an option$/, 'đáp án $1 không nằm trong các lựa chọn'],
  [/^answer must be one of (.*)$/, 'đáp án phải là một trong: $1'],
  [/^answer is not a heading$/, 'chưa chọn heading'],
  [/^blanks (.*) do not match questions (.*)$/, 'số ô trống không khớp với số câu'],
  [/^the word box needs more words than blanks$/, 'hộp từ cần nhiều từ hơn số ô trống'],
  [/^a paragraph is asked twice$/, 'một đoạn được hỏi hai lần'],
  [/^a heading is the answer twice$/, 'một heading là đáp án của hai đoạn'],
  [/^needs more headings than paragraphs$/, 'cần nhiều heading hơn số đoạn được hỏi'],
  [/^example paragraph is unknown or also asked$/, 'đoạn ví dụ không có hoặc cũng là câu hỏi'],
  [/^example heading is unknown or also an answer$/, 'heading ví dụ không có hoặc cũng là đáp án'],
  [/^options must be paragraph letters$/, 'các lựa chọn phải là chữ cái của đoạn'],
  [/^answer must be the paragraph that holds the evidence$/, 'đáp án phải là đoạn chứa evidence'],
  [/^needs at least 2 options$/, 'cần ít nhất 2 lựa chọn'],
  [/^needs more endings than sentences$/, 'cần nhiều đoạn kết hơn số câu'],
  [/^a letter is used twice without "reuse"$/, 'một chữ cái dùng hai lần: bật "dùng lại chữ cái" hoặc sửa đáp án'],
  [/^answers in this group must follow the passage order$/, 'nhóm này phải theo thứ tự bài đọc: evidence của câu này nằm trước câu trước'],
  [/^has (\d+) questions \((\d+)–(\d+)\)$/, 'có $1 câu, mỗi passage cần $2–$3 câu'],
  [/^questions must run 1–40$/, 'đề đầy đủ cần các câu 1–40'],
  [/^passages must be parts 1–3 in order$/, 'đề đầy đủ cần Passage 1–3 theo thứ tự'],
  [/^no passages$/, 'chưa có passage'],
];

function translate(message: string): string {
  for (const [re, vi] of MESSAGES) if (re.test(message)) return message.replace(re, vi);
  return message;
}

/** Everything that blocks publishing, in Vietnamese, with where to fix it. Empty when the test can go out. */
export function readingLibraryProblems(item: ReadingLibraryItem): ReadingLibraryProblem[] {
  const out: ReadingLibraryProblem[] = [];
  if (!item.title.trim()) out.push({ where: 'Đề', message: 'chưa có tên đề' });
  const expected = item.kind === 'full' ? 3 : 1;
  if (item.passages.length !== expected) out.push({ where: 'Đề', message: `cần ${expected} passage` });

  const places = new Map<string, { where: string; passageId: string }>();
  for (const p of item.passages) {
    const name = `Passage ${p.part}`;
    places.set(p.id, { where: name, passageId: p.id });
    p.groups.forEach((g, i) => places.set(g.id, { where: `${name} · nhóm câu ${i + 1}`, passageId: p.id }));
    const at = (message: string) => out.push({ where: name, message, passageId: p.id });
    if (!p.title.trim()) at('chưa có tiêu đề bài đọc');
    const words = passageWordCount(p);
    if (p.paragraphs.length && (words < PASSAGE_WORDS.min || words > PASSAGE_WORDS.max)) {
      at(`bài đọc có ${words} từ, chuẩn đề là ${PASSAGE_WORDS.min}–${PASSAGE_WORDS.max} từ`);
    }
    if (p.suggestedMinutes < 5 || p.suggestedMinutes > 40) at('thời gian gợi ý phải trong khoảng 5–40 phút');
  }

  const test = libraryReadingTest(item);
  for (const raw of validateReadingTest(test)) {
    const q = /^(\S+) Q(\d+): (.*)$/.exec(raw);
    if (q) {
      out.push({ where: `Câu ${q[2]}`, message: translate(q[3]), passageId: places.get(q[1])?.passageId });
      continue;
    }
    const grouped = /^(\S+) (\S+): (.*)$/.exec(raw);
    const plain = /^(\S+): (.*)$/.exec(raw);
    const [id, message] = grouped && places.has(grouped[2]) ? [grouped[2], grouped[3]] : plain ? [plain[1], plain[2]] : ['', raw];
    const place = places.get(id);
    out.push({ where: place?.where ?? 'Đề', message: translate(message), passageId: place?.passageId });
  }
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.where}|${p.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// --- The list on the admin page ---------------------------------------------------------------------

export function filterReadingLibrary(items: readonly ReadingLibraryItem[], query: string, status: 'all' | ReadingLibraryStatus): ReadingLibraryItem[] {
  const needle = foldText(query);
  return items
    .filter((i) => status === 'all' || i.status === status)
    .filter((i) => !needle || foldText([i.title, i.descriptionVi, ...i.passages.map((p) => `${p.title} ${p.topic}`)].join(' ')).includes(needle))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readingItemStats(item: ReadingLibraryItem) {
  return {
    questions: item.passages.reduce((n, p) => n + passageQuestions(p).length, 0),
    words: item.passages.reduce((n, p) => n + passageWordCount(p), 0),
    parts: item.passages.map((p) => p.part),
  };
}

/** A database error in words an admin can act on; unknown errors pass through. */
export function readingLibraryErrorText(message: string): string {
  if (isMissingTable(message)) return 'Chưa chạy migration 012 (docs/migrations/012_reading.sql) trong Supabase SQL Editor.';
  if (/row-level security|permission denied/i.test(message)) return 'Tài khoản này chưa có quyền quản trị (chưa có trong bảng app_admins).';
  return message;
}

// --- Rows ----------------------------------------------------------------------------------------------

export interface ReadingLibraryRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  description_vi: string | null;
  passages: unknown;
  created_at: string;
  updated_at: string;
}

const DIFFICULTIES: readonly ReadingDifficulty[] = ['easy', 'medium', 'hard'];

/** A stored row, or null when it is not a usable test shape. */
export function rowToReadingItem(row: ReadingLibraryRow): ReadingLibraryItem | null {
  if (!Array.isArray(row.passages) || row.passages.length === 0) return null;
  const passages = row.passages as ReadingPassage[];
  const usable = (p: ReadingPassage) =>
    !!p && typeof p === 'object' && typeof p.id === 'string' && [1, 2, 3].includes(p.part) && Array.isArray(p.paragraphs) && Array.isArray(p.groups) && DIFFICULTIES.includes(p.difficulty);
  if (!passages.every(usable)) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind === 'full' ? 'full' : 'practice',
    status: row.status === 'published' ? 'published' : 'draft',
    descriptionVi: row.description_vi ?? '',
    passages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const readingItemRow = (item: ReadingLibraryItem) => ({
  id: item.id,
  title: item.title.trim().slice(0, 200) || 'Đề chưa đặt tên',
  kind: item.kind,
  status: item.status,
  description_vi: item.descriptionVi.trim(),
  passages: item.passages,
});
