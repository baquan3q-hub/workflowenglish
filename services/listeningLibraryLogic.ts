/**
 * Listening library (IELTS phase I13): tests written on the admin page and
 * kept in `listening_library` (migration 011). Pure: building and editing a
 * test, YouTube timing marks, the transcript format, checks before
 * publishing, and the AI notes merge.
 *
 * A library test opens like a bundled one, with the id `lib_<row id>`.
 */
import type {
  ChoiceOption,
  CompletionGroup,
  ListeningGroup,
  ListeningQuestion,
  ListeningSection,
  ListeningSegment,
  ListeningSpeaker,
  ListeningTest,
  MapShape,
  MapShapeKind,
  ScriptLine,
} from '../data/ielts/listening/types';
import { LISTENING_VOICES, type ListeningStyle } from './listeningAudioService';
import { rekeySection, validateTest } from './listeningLogic';
import { foldText } from './vocabLibraryLogic';
import { SPEAKER_NAME } from '../supabase/functions/ai-proxy/ops/listening.ts';
import type { QuestionNote } from '../supabase/functions/ai-proxy/ops/listeningNotes.ts';

export type LibraryKind = 'full' | 'practice';
export type LibraryStatus = 'draft' | 'published';
export type GroupType = ListeningGroup['type'];
export type Part = ListeningSection['part'];

export interface LibraryItem {
  id: string;
  title: string;
  kind: LibraryKind;
  status: LibraryStatus;
  descriptionVi: string;
  sections: ListeningSection[];
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS_VI: Record<LibraryStatus, string> = { draft: 'Bản nháp', published: 'Đã xuất bản' };
export const KIND_LABELS_VI: Record<LibraryKind, string> = { full: 'Đề đầy đủ (4 part)', practice: 'Luyện 1 part' };
export const STYLE_LABELS_VI: Record<ListeningStyle, string> = {
  uk: 'Anh – Anh',
  us: 'Anh – Mỹ',
  au: 'Anh – Úc (gần đúng)',
  lecture: 'Giảng viên (Anh – Anh)',
};

// --- Ids ---------------------------------------------------------------------------

const TEST_PREFIX = 'lib_';
export const libraryTestId = (id: string) => `${TEST_PREFIX}${id}`;
export const isLibraryTestId = (testId: string) => testId.startsWith(TEST_PREFIX);
export const libraryRowId = (testId: string) => testId.slice(TEST_PREFIX.length);

/** Section ids are unique across the library, since drafts and audio progress are keyed by them. */
export const sectionIdFor = (itemId: string, part: Part) => `lib-${itemId.replace(/-/g, '').slice(0, 10)}-p${part}`;

/** The first unused `<prefix>-<letter><n>` id. */
function freshId(prefix: string, letter: 's' | 'g', taken: readonly string[]): string {
  for (let n = taken.length + 1; ; n++) {
    const id = `${prefix}-${letter}${n}`;
    if (!taken.includes(id)) return id;
  }
}

/** Question numbers a part uses in the real test: Part 2 is 11–20. */
export const firstNumber = (part: Part) => (part - 1) * 10 + 1;

// --- New tests ------------------------------------------------------------------------

const DEFAULT_SPEAKERS: Record<Part, ListeningSpeaker[]> = {
  1: [
    { name: 'Anna', voice: 'Kore', roleVi: 'Nhân viên' },
    { name: 'Tom', voice: 'Puck', roleVi: 'Khách hàng' },
  ],
  2: [{ name: 'Guide', voice: 'Charon', roleVi: 'Người giới thiệu' }],
  3: [
    { name: 'Mia', voice: 'Aoede', roleVi: 'Sinh viên' },
    { name: 'Jack', voice: 'Orus', roleVi: 'Sinh viên' },
  ],
  4: [{ name: 'Lecturer', voice: 'Leda', roleVi: 'Giảng viên' }],
};

export function emptySection(itemId: string, part: Part): ListeningSection {
  return {
    id: sectionIdFor(itemId, part),
    part,
    title: '',
    contextVi: '',
    style: part === 4 ? 'lecture' : 'uk',
    speakers: structuredClone(DEFAULT_SPEAKERS[part]),
    segments: [],
    groups: [],
    prepSeconds: 30,
  };
}

export function emptyItem(id: string, kind: LibraryKind, part: Part = 1, now = new Date().toISOString()): LibraryItem {
  const parts: Part[] = kind === 'full' ? [1, 2, 3, 4] : [part];
  return { id, title: '', kind, status: 'draft', descriptionVi: '', sections: parts.map((p) => emptySection(id, p)), createdAt: now, updatedAt: now };
}

/** A draft copy with its own ids, so its drafts and progress never mix with the original's. */
export function duplicateItem(item: LibraryItem, newId: string, now = new Date().toISOString()): LibraryItem {
  return {
    ...structuredClone(item),
    id: newId,
    title: `${item.title} (bản sao)`.slice(0, 200),
    status: 'draft',
    sections: item.sections.map((s) => rekeySection(structuredClone(s), sectionIdFor(newId, s.part))),
    createdAt: now,
    updatedAt: now,
  };
}

/** A practice test with its part changed: new id, renumbered questions. */
export function setPracticePart(item: LibraryItem, part: Part): LibraryItem {
  if (item.kind !== 'practice') return item;
  const sections = item.sections.map((s) => renumberSection(rekeySection({ ...s, part }, sectionIdFor(item.id, part))));
  return { ...item, sections };
}

export function libraryTest(item: LibraryItem): ListeningTest {
  const fallback =
    item.kind === 'full'
      ? 'Đề Listening 4 part do giáo viên soạn.'
      : `Luyện Part ${item.sections[0]?.part ?? 1}. ${item.sections[0]?.contextVi ?? ''}`.trim();
  return { id: libraryTestId(item.id), title: item.title || 'Đề chưa đặt tên', kind: item.kind, descriptionVi: item.descriptionVi || fallback, sections: item.sections };
}

// --- Audio source and timings -------------------------------------------------------

export const isRecorded = (s: ListeningSection) => !!s.youtube;

/** Switches a part between its own YouTube recording and AI voices. Timings stay, unused, for switching back. */
export function setYouTube(s: ListeningSection, videoId: string | null): ListeningSection {
  if (!videoId) {
    const { youtube: _y, ...rest } = s;
    return rest;
  }
  return { ...s, youtube: { videoId } };
}

const round = (t: number) => Math.max(0, Math.round(t * 10) / 10);

/**
 * One press of the "mark" key while the video plays. The current segment
 * gets a start, or else ends here and the next one starts here (a new
 * segment is added at the end). Returns the segment to mark next.
 */
export function markBoundary(s: ListeningSection, cursor: number, time: number): { section: ListeningSection; cursor: number } {
  const t = round(time);
  const segments = s.segments.map((x) => ({ ...x }));
  const add = () => segments.push({ id: freshId(s.id, 's', segments.map((x) => x.id)), lines: [] });
  if (cursor >= segments.length) {
    add();
    cursor = segments.length - 1;
  }
  const seg = segments[cursor];
  if (typeof seg.start !== 'number') {
    seg.start = t;
    return { section: { ...s, segments }, cursor };
  }
  // Pressed again right away, or before its start: ignore.
  if (t - seg.start < 0.5) return { section: s, cursor };
  seg.end = t;
  if (cursor + 1 >= segments.length) add();
  segments[cursor + 1].start = t;
  return { section: { ...s, segments }, cursor: cursor + 1 };
}

/** Ends the current segment here without starting another. */
export function markEnd(s: ListeningSection, cursor: number, time: number): ListeningSection {
  const seg = s.segments[cursor];
  const t = round(time);
  if (!seg || typeof seg.start !== 'number' || t - seg.start < 0.5) return s;
  return { ...s, segments: s.segments.map((x, i) => (i === cursor ? { ...x, end: t } : x)) };
}

/**
 * Moves one time by `delta` seconds. A neighbouring segment that touched the
 * old time moves with it, so back-to-back segments stay back to back.
 */
export function nudgeTime(s: ListeningSection, index: number, field: 'start' | 'end', delta: number): ListeningSection {
  const seg = s.segments[index];
  const old = seg?.[field];
  if (typeof old !== 'number') return s;
  const t = round(old + delta);
  const touching = (v: number | undefined) => typeof v === 'number' && Math.abs(v - old) < 0.05;
  return {
    ...s,
    segments: s.segments.map((x, i) => {
      if (i === index) return { ...x, [field]: t };
      if (field === 'end' && i === index + 1 && touching(x.start)) return { ...x, start: t };
      if (field === 'start' && i === index - 1 && touching(x.end)) return { ...x, end: t };
      return x;
    }),
  };
}

export function setTime(s: ListeningSection, index: number, field: 'start' | 'end', value: number | undefined): ListeningSection {
  return { ...s, segments: s.segments.map((x, i) => (i === index ? { ...x, [field]: value === undefined ? undefined : round(value) } : x)) };
}

export function clearTimes(s: ListeningSection): ListeningSection {
  return { ...s, segments: s.segments.map(({ start: _s, end: _e, ...x }) => x) };
}

export const segmentSeconds = (seg: ListeningSegment) =>
  typeof seg.start === 'number' && typeof seg.end === 'number' ? Math.max(0, seg.end - seg.start) : 0;

// --- Segments and transcript ------------------------------------------------------------

export function addSegment(s: ListeningSection): ListeningSection {
  const last = s.segments.at(-1);
  const seg: ListeningSegment = { id: freshId(s.id, 's', s.segments.map((x) => x.id)), lines: [] };
  if (s.youtube && typeof last?.end === 'number') seg.start = last.end;
  return { ...s, segments: [...s.segments, seg] };
}

/** Removes a segment; questions that pointed at it move to the one before (or after). */
export function removeSegment(s: ListeningSection, id: string): ListeningSection {
  const index = s.segments.findIndex((x) => x.id === id);
  if (index < 0) return s;
  const segments = s.segments.filter((x) => x.id !== id);
  const fallback = segments[Math.max(0, index - 1)]?.id ?? '';
  return {
    ...s,
    segments,
    groups: s.groups.map((g) => ({ ...g, questions: g.questions.map((q) => (q.segmentId === id ? { ...q, segmentId: fallback } : q)) })) as ListeningGroup[],
  };
}

const NAMED_LINE = /^([A-Za-z][A-Za-z]{0,19})\s*:\s*(.*)$/;

export interface ParsedTranscript {
  lines: ScriptLine[];
  /** Names used in the text that are not speakers of the part. */
  unknown: string[];
}

/**
 * "Name: line" per line. A line without a name continues the line before,
 * or belongs to the only speaker when there is one. Names match speakers
 * regardless of case.
 */
export function parseTranscript(text: string, speakers: readonly ListeningSpeaker[]): ParsedTranscript {
  const lines: ScriptLine[] = [];
  const unknown = new Set<string>();
  const canonical = (name: string) => speakers.find((s) => s.name.toLowerCase() === name.toLowerCase())?.name;
  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const m = NAMED_LINE.exec(row);
    if (m && m[2].trim()) {
      const name = canonical(m[1]) ?? m[1];
      if (!canonical(m[1])) unknown.add(m[1]);
      lines.push({ speaker: name, text: m[2].trim() });
    } else if (m) {
      // "Anna:" with nothing after it: nothing to say yet.
      continue;
    } else if (lines.length) {
      const prev = lines[lines.length - 1];
      lines[lines.length - 1] = { ...prev, text: `${prev.text} ${row}` };
    } else {
      lines.push({ speaker: speakers[0]?.name ?? 'Speaker', text: row });
    }
  }
  return { lines, unknown: [...unknown] };
}

export const transcriptText = (lines: readonly ScriptLine[]) => lines.map((l) => `${l.speaker}: ${l.text}`).join('\n');

export function setSegmentLines(s: ListeningSection, id: string, lines: ScriptLine[]): ListeningSection {
  return { ...s, segments: s.segments.map((x) => (x.id === id ? { ...x, lines } : x)) };
}

/** Renames a speaker everywhere in the script. */
export function renameSpeaker(s: ListeningSection, from: string, to: string): ListeningSection {
  return {
    ...s,
    speakers: s.speakers.map((p) => (p.name === from ? { ...p, name: to } : p)),
    segments: s.segments.map((seg) => ({ ...seg, lines: seg.lines.map((l) => (l.speaker === from ? { ...l, speaker: to } : l)) })),
  };
}

// --- Questions ------------------------------------------------------------------------------

export const GROUP_INSTRUCTIONS: Record<GroupType, string> = {
  completion: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
  short_answer: 'Answer the questions below. Write NO MORE THAN THREE WORDS for each answer.',
  mcq: 'Choose the correct letter, A, B or C.',
  mcq_multi: 'Choose TWO letters, A–E.',
  matching: 'Choose your answers from the box and write the correct letter next to each question.',
  map: 'Label the map below. Choose the correct letter for each place.',
};

const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
const blankOptions = (n: number): ChoiceOption[] => letters(n).map((key) => ({ key, text: '' }));

export function blankQuestion(number: number, segmentId: string, extra: Partial<ListeningQuestion> = {}): ListeningQuestion {
  return { number, answers: [], segmentId, evidence: '', explanationVi: '', ...extra };
}

const nextNumber = (s: ListeningSection) => {
  const last = s.groups.flatMap((g) => g.questions).at(-1);
  return last ? last.number + 1 : firstNumber(s.part);
};

/** Adds a group of `type` with one question (two for "Choose TWO"), answered in the last segment by default. */
export function addGroup(s: ListeningSection, type: GroupType): ListeningSection {
  const id = freshId(s.id, 'g', s.groups.map((g) => g.id));
  const n = nextNumber(s);
  const seg = s.segments.at(-1)?.id ?? '';
  const instruction = GROUP_INSTRUCTIONS[type];
  let group: ListeningGroup;
  switch (type) {
    case 'completion':
      group = { id, type, instruction, wordLimit: 1, numberAllowed: true, title: '', lines: [`{{${n}}}`], questions: [blankQuestion(n, seg)] };
      break;
    case 'short_answer':
      group = { id, type, instruction, wordLimit: 3, numberAllowed: false, questions: [blankQuestion(n, seg, { prompt: '' })] };
      break;
    case 'mcq':
      group = { id, type, instruction, questions: [blankQuestion(n, seg, { prompt: '', options: blankOptions(3) })] };
      break;
    case 'mcq_multi':
      group = { id, type, instruction, prompt: '', options: blankOptions(5), questions: [blankQuestion(n, seg), blankQuestion(n + 1, seg)] };
      break;
    case 'matching':
      group = { id, type, instruction, optionsTitle: '', options: blankOptions(5), questions: [blankQuestion(n, seg, { prompt: '' })] };
      break;
    case 'map':
      group = { id, type, instruction, map: { title: '', width: 400, height: 300, shapes: [] }, questions: [blankQuestion(n, seg, { prompt: '' })] };
      break;
  }
  return renumberSection({ ...s, groups: [...s.groups, group] });
}

export function removeGroup(s: ListeningSection, id: string): ListeningSection {
  return renumberSection({ ...s, groups: s.groups.filter((g) => g.id !== id) });
}

export function moveGroup(s: ListeningSection, id: string, by: -1 | 1): ListeningSection {
  const i = s.groups.findIndex((g) => g.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= s.groups.length) return s;
  const groups = [...s.groups];
  [groups[i], groups[j]] = [groups[j], groups[i]];
  return renumberSection({ ...s, groups });
}

export function updateGroup(s: ListeningSection, group: ListeningGroup): ListeningSection {
  return renumberSection({ ...s, groups: s.groups.map((g) => (g.id === group.id ? group : g)) });
}

/** Adds a question at the end of a group (not for completion: blanks drive those). */
export function addQuestion(group: ListeningGroup, segmentId: string): ListeningGroup {
  const n = (group.questions.at(-1)?.number ?? 0) + 1;
  const last = group.questions.at(-1);
  if (group.type === 'mcq') return { ...group, questions: [...group.questions, blankQuestion(n, segmentId, { prompt: '', options: blankOptions(3) })] };
  if (group.type === 'mcq_multi') {
    // One more letter to choose: every question shares the answers.
    return { ...group, questions: [...group.questions, blankQuestion(n, segmentId, { answers: last?.answers ?? [] })] };
  }
  return { ...group, questions: [...group.questions, blankQuestion(n, segmentId, { prompt: '' })] } as ListeningGroup;
}

export function removeQuestion(group: ListeningGroup, number: number): ListeningGroup {
  if (group.questions.length <= 1) return group;
  return { ...group, questions: group.questions.filter((q) => q.number !== number) } as ListeningGroup;
}

export function updateQuestion(group: ListeningGroup, number: number, patch: Partial<ListeningQuestion>): ListeningGroup {
  return { ...group, questions: group.questions.map((q) => (q.number === number ? { ...q, ...patch } : q)) } as ListeningGroup;
}

/** "Choose TWO": sets the shared answers. */
export function setMultiAnswers(group: ListeningGroup, keys: string[]): ListeningGroup {
  const answers = [...new Set(keys)].sort();
  return { ...group, questions: group.questions.map((q) => ({ ...q, answers })) } as ListeningGroup;
}

const BLANK = /\{\{(\d+)\}\}/g;

/** Numbers every question in order from the part's first number, and the blanks in templates with them. */
export function renumberSection(s: ListeningSection): ListeningSection {
  let n = firstNumber(s.part);
  const groups = s.groups.map((g) => {
    const map = new Map<number, number>();
    const questions = g.questions.map((q) => {
      map.set(q.number, n);
      return { ...q, number: n++ };
    });
    if (g.type !== 'completion') return { ...g, questions };
    const fix = (t: string) => t.replace(BLANK, (all, old) => (map.has(Number(old)) ? `{{${map.get(Number(old))}}}` : all));
    return {
      ...g,
      questions,
      lines: g.lines?.map(fix),
      table: g.table ? { header: g.table.header.map(fix), rows: g.table.rows.map((r) => r.map(fix)) } : undefined,
    };
  }) as ListeningGroup[];
  return { ...s, groups };
}

// --- Completion templates: "___" in the editor, {{n}} in the data -------------------------------------

/** What the admin types: blanks as ___, a table as "a | b | c" rows with the header first. */
export function templateText(g: CompletionGroup): { mode: 'lines' | 'table'; text: string } {
  const show = (t: string) => t.replace(BLANK, '___');
  if (g.table) return { mode: 'table', text: [g.table.header, ...g.table.rows].map((r) => r.map(show).join(' | ')).join('\n') };
  return { mode: 'lines', text: (g.lines ?? []).map(show).join('\n') };
}

const UNDERSCORES = /_{3,}/g;

/**
 * Reads the admin's template. Each ___ becomes the next question; questions
 * keep their order, new ones are added and extra ones dropped.
 */
export function applyTemplate(g: CompletionGroup, mode: 'lines' | 'table', text: string, segmentId: string): CompletionGroup {
  const start = g.questions[0]?.number ?? 1;
  let k = 0;
  const fill = (t: string) => t.replace(UNDERSCORES, () => `{{${start + k++}}}`);
  const rows = text.split(/\r?\n/).filter((r) => r.trim());
  let lines: string[] | undefined;
  let table: CompletionGroup['table'];
  if (mode === 'table') {
    const cells = rows.map((r) => r.split('|').map((c) => fill(c.trim())));
    table = { header: cells[0] ?? [], rows: cells.slice(1) };
  } else {
    lines = rows.map((r) => fill(r.trim()));
  }
  const questions = Array.from({ length: k }, (_, i) => g.questions[i] ?? blankQuestion(start + i, g.questions.at(-1)?.segmentId ?? segmentId));
  const { lines: _l, table: _t, ...rest } = g;
  return { ...rest, ...(table ? { table } : { lines }), questions: questions.map((q, i) => ({ ...q, number: start + i })) };
}

/** The line a completion question sits in, with its blank shown as ___. For the AI notes and the editor. */
export function blankContext(g: CompletionGroup, number: number): string {
  const token = `{{${number}}}`;
  const rows = [...(g.lines ?? []), ...(g.table ? [g.table.header.join(' | '), ...g.table.rows.map((r) => r.join(' | '))] : [])];
  return (rows.find((r) => r.includes(token)) ?? '').replace(token, '___').replace(BLANK, '…');
}

// --- Options and answers as typed ------------------------------------------------------------

/** "A. text" per line; lines without a letter get the next one. */
export function parseOptions(text: string): ChoiceOption[] {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  return rows.slice(0, 10).map((r, i) => {
    const m = /^([A-Z])\s*[.):-]\s*(.*)$/.exec(r);
    return { key: letters(i + 1)[i], text: (m ? m[2] : r).trim() };
  });
}

export const optionsText = (options: readonly ChoiceOption[]) => options.map((o) => `${o.key}. ${o.text}`).join('\n');

/** Accepted spellings, separated by " / " or new lines: "15 / fifteen". */
export const parseAnswers = (text: string) =>
  [...new Set(text.split(/\s+\/\s+|\r?\n/).map((a) => a.trim()).filter(Boolean))].slice(0, 6);

export const answersText = (answers: readonly string[]) => answers.join(' / ');

// --- Map shapes as typed: "building 20 30 120 60 Café" or "... [A]" for a lettered place ---------------

const SHAPE_KINDS: readonly MapShapeKind[] = ['building', 'path', 'green', 'water', 'entrance'];

export interface ParsedShapes {
  shapes: MapShape[];
  /** 1-based lines that could not be read. */
  bad: number[];
}

export function parseShapes(text: string): ParsedShapes {
  const shapes: MapShape[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const row = raw.trim();
    if (!row) return;
    const m = /^(\w+)\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)\s*(.*)$/.exec(row);
    const kind = m?.[1].toLowerCase() as MapShapeKind | undefined;
    if (!m || !kind || !SHAPE_KINDS.includes(kind)) {
      bad.push(i + 1);
      return;
    }
    const shape: MapShape = { kind, x: Number(m[2]), y: Number(m[3]), w: Number(m[4]), h: Number(m[5]) };
    const rest = m[6].trim();
    const key = /^\[([A-Z])\]$/.exec(rest);
    if (key) shape.key = key[1];
    else if (rest) shape.label = rest;
    shapes.push(shape);
  });
  return { shapes, bad };
}

export const shapesText = (shapes: readonly MapShape[]) =>
  shapes.map((s) => [s.kind, s.x, s.y, s.w, s.h, s.key ? `[${s.key}]` : (s.label ?? '')].join(' ').trim()).join('\n');

/** Letters on a map, in order. */
export const mapKeys = (shapes: readonly MapShape[]) => shapes.flatMap((s) => (s.key ? [s.key] : [])).sort();

// --- AI notes ----------------------------------------------------------------------------------

const flat = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

export interface NotesOutcome {
  section: ListeningSection;
  /** Questions that got at least one field. */
  filled: number[];
  /** Questions whose suggested quote was not in the script. */
  rejected: number[];
}

/**
 * Fills the fields the admin left empty from the AI suggestions. A quote
 * (evidence, distractor) is used only when it really is in the script.
 */
export function applyNotes(s: ListeningSection, notes: readonly QuestionNote[]): NotesOutcome {
  const segText = new Map(s.segments.map((x) => [x.id, flat(x.lines.map((l) => l.text).join(' '))]));
  const all = [...segText.values()].join(' ');
  const filled = new Set<number>();
  const rejected = new Set<number>();
  const groups = s.groups.map((g) => ({
    ...g,
    questions: g.questions.map((q) => {
      const note = notes.find((n) => n.number === q.number);
      if (!note) return q;
      const next = { ...q };
      const segmentId = segText.has(q.segmentId) ? q.segmentId : segText.has(note.segmentId) ? note.segmentId : q.segmentId;
      if (segmentId !== q.segmentId) next.segmentId = segmentId;
      const inSegment = (t: string) => !!t && (segText.get(segmentId) ?? '').includes(flat(t));
      if (!q.evidence.trim() && note.evidence) {
        if (inSegment(note.evidence)) next.evidence = note.evidence;
        else rejected.add(q.number);
      }
      if (!q.distractor && note.distractor) {
        if (all.includes(flat(note.distractor))) next.distractor = note.distractor;
        else rejected.add(q.number);
      }
      if (!q.paraphrase && note.paraphraseQuestion && note.paraphraseAudio) {
        next.paraphrase = { question: note.paraphraseQuestion, audio: note.paraphraseAudio };
      }
      if (!q.explanationVi.trim() && note.explanationVi) next.explanationVi = note.explanationVi;
      if (JSON.stringify(next) !== JSON.stringify(q)) filled.add(q.number);
      return next;
    }),
  })) as ListeningGroup[];
  return { section: { ...s, groups }, filled: [...filled], rejected: [...rejected].filter((n) => !filled.has(n)) };
}

/** What the listeningNotes op needs about a part. */
export function notesPayload(s: ListeningSection) {
  return {
    part: s.part,
    segments: s.segments.filter((x) => x.lines.length).map((x) => ({ id: x.id, text: transcriptText(x.lines) })),
    questions: s.groups.flatMap((g) =>
      g.questions.map((q) => {
        const options = g.type === 'mcq' ? (q.options ?? []) : 'options' in g ? g.options : [];
        const question =
          g.type === 'completion' ? blankContext(g, q.number) : g.type === 'mcq_multi' ? g.prompt : (q.prompt ?? '');
        return { number: q.number, type: g.type, question, options: options.map((o) => `${o.key}. ${o.text}`), answers: q.answers };
      }),
    ),
  };
}

/** Questions still missing a note the review screen shows. */
export const questionsMissingNotes = (s: ListeningSection) =>
  s.groups.flatMap((g) => g.questions).filter((q) => !q.evidence.trim() || !q.explanationVi.trim()).map((q) => q.number);

// --- Checks before publishing ------------------------------------------------------------------------

export interface LibraryProblem {
  /** "Part 2 · đoạn 3", "Câu 14", or "Đề". */
  where: string;
  message: string;
  /** The section to open to fix it. */
  sectionId?: string;
}

const MESSAGES: [RegExp, string][] = [
  [/^no answer$/, 'chưa có đáp án'],
  [/^evidence is not in its segment$/, 'câu chứa đáp án (evidence) chưa có hoặc không nằm trong đoạn đã chọn'],
  [/^distractor is not in the script$/, 'câu bẫy không có trong lời thoại'],
  [/^no explanation$/, 'chưa có giải thích'],
  [/^answer "(.*)" breaks the word limit$/, 'đáp án "$1" vượt giới hạn số từ'],
  [/^answer is not in its segment$/, 'đáp án không xuất hiện trong đoạn đã chọn'],
  [/^evidence does not contain the answer$/, 'evidence không chứa đáp án'],
  [/^no prompt$/, 'chưa có nội dung câu hỏi'],
  [/^needs a prompt and at least 3 options$/, 'cần nội dung câu hỏi và ít nhất 3 lựa chọn'],
  [/^answer is not an option$/, 'đáp án chưa chọn hoặc không nằm trong các lựa chọn'],
  [/^questions in a multi-choice group must share answers$/, 'các câu trong nhóm "chọn 2" phải dùng chung đáp án'],
  [/^number of answers must match the number of questions$/, 'số đáp án đúng phải bằng số câu của nhóm'],
  [/^answer (\S+) is not an option$/, 'đáp án $1 không nằm trong các lựa chọn'],
  [/^answer is not a letter on the map$/, 'đáp án không phải chữ cái trên bản đồ'],
  [/^unknown segment (.*)$/, 'chưa chọn đoạn chứa đáp án'],
  [/^numbers are not consecutive$/, 'số câu không liên tục'],
  [/^no lines$/, 'chưa có lời thoại'],
  [/^unknown speaker (.*)$/, 'người nói "$1" chưa được khai báo'],
  [/^more than two speakers$/, 'quá 2 người nói trong một đoạn (giọng AI chỉ đọc được 2 người)'],
  [/^audio text is (\d+) characters \(max (\d+)\)$/, 'dài $1 ký tự, giọng AI đọc tối đa $2: hãy tách thành 2 đoạn'],
  [/^needs a start and an end time$/, 'cần thời điểm bắt đầu và kết thúc'],
  [/^start is before 0:00$/, 'bắt đầu trước 0:00'],
  [/^must be at least (\d+) second long$/, 'ngắn hơn $1 giây'],
  [/^ends after 3 hours$/, 'kết thúc sau mốc 3 giờ'],
  [/^starts before the previous segment ends$/, 'bắt đầu trước khi đoạn trước kết thúc'],
  [/^invalid YouTube video id$/, 'link YouTube không hợp lệ'],
  [/^blanks (.*) do not match questions (.*)$/, 'số ô trống không khớp với số câu'],
  [/^a part has 10 questions$/, 'mỗi part cần đúng 10 câu'],
  [/^questions must run 1–40$/, 'đề đầy đủ cần các câu 1–40'],
  [/^parts must be 1–4 in order$/, 'đề đầy đủ cần Part 1–4 theo thứ tự'],
];

function translate(message: string): string {
  for (const [re, vi] of MESSAGES) if (re.test(message)) return message.replace(re, vi);
  return message;
}

/** Everything that blocks publishing, in Vietnamese, with where to fix it. Empty when the test can go out. */
export function libraryProblems(item: LibraryItem): LibraryProblem[] {
  const out: LibraryProblem[] = [];
  if (!item.title.trim()) out.push({ where: 'Đề', message: 'chưa có tên đề' });
  const expected = item.kind === 'full' ? 4 : 1;
  if (item.sections.length !== expected) out.push({ where: 'Đề', message: `cần ${expected} part` });

  const places = new Map<string, { where: string; sectionId: string }>();
  for (const s of item.sections) {
    const part = `Part ${s.part}`;
    places.set(s.id, { where: part, sectionId: s.id });
    s.segments.forEach((x, i) => places.set(x.id, { where: `${part} · đoạn ${i + 1}`, sectionId: s.id }));
    s.groups.forEach((g, i) => places.set(g.id, { where: `${part} · nhóm câu ${i + 1}`, sectionId: s.id }));

    const at = (message: string) => out.push({ where: part, message, sectionId: s.id });
    if (!s.title.trim()) at('chưa có tiêu đề part');
    if (!s.contextVi.trim()) at('chưa có bối cảnh (ai nói, nói về gì)');
    if (!s.segments.length) at('chưa có đoạn audio nào');
    if (!s.groups.length) at('chưa có câu hỏi');
    const names = s.speakers.map((p) => p.name);
    if (!names.length) at('chưa có người nói');
    for (const p of s.speakers) {
      if (!SPEAKER_NAME.test(p.name)) at(`tên người nói "${p.name}" phải là một từ tiếng Anh viết hoa chữ đầu, không dấu`);
      if (!(LISTENING_VOICES as readonly string[]).includes(p.voice)) at(`giọng của ${p.name} không hợp lệ`);
    }
    if (new Set(names).size !== names.length) at('hai người nói trùng tên');
  }

  for (const raw of validateTest(libraryTest(item))) {
    const q = /^(\S+) Q(\d+): (.*)$/.exec(raw);
    if (q) {
      out.push({ where: `Câu ${q[2]}`, message: translate(q[3]), sectionId: places.get(q[1])?.sectionId });
      continue;
    }
    const grouped = /^(\S+) (\S+): (.*)$/.exec(raw);
    const plain = /^(\S+): (.*)$/.exec(raw);
    const [id, message] = grouped && places.has(grouped[2]) ? [grouped[2], grouped[3]] : plain ? [plain[1], plain[2]] : ['', raw];
    const place = places.get(id);
    out.push({ where: place?.where ?? 'Đề', message: translate(message), sectionId: place?.sectionId });
  }
  // The same message for the same place once.
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.where}|${p.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// --- The list on the admin page -------------------------------------------------------------------

export type StatusFilter = 'all' | LibraryStatus;

export function filterLibrary(items: readonly LibraryItem[], query: string, status: StatusFilter): LibraryItem[] {
  const needle = foldText(query);
  return items
    .filter((i) => status === 'all' || i.status === status)
    .filter((i) => !needle || foldText([i.title, i.descriptionVi, ...i.sections.map((s) => `${s.title} ${s.contextVi}`)].join(' ')).includes(needle))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function itemStats(item: LibraryItem) {
  const questions = item.sections.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.questions.length, 0), 0);
  const recorded = item.sections.some(isRecorded);
  const seconds = item.sections.reduce((n, s) => n + s.segments.reduce((m, x) => m + segmentSeconds(x), 0), 0);
  return { questions, recorded, seconds, parts: item.sections.map((s) => s.part) };
}

// --- Rows ---------------------------------------------------------------------------------------------

export interface LibraryRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  description_vi: string | null;
  sections: unknown;
  created_at: string;
  updated_at: string;
}

/** A stored row, or null when it is not a usable test shape. */
export function rowToLibrary(row: LibraryRow): LibraryItem | null {
  if (!Array.isArray(row.sections)) return null;
  const sections = row.sections as ListeningSection[];
  if (sections.some((s) => !s || typeof s !== 'object' || !Array.isArray(s.segments) || !Array.isArray(s.groups) || !Array.isArray(s.speakers))) return null;
  return {
    id: row.id,
    title: row.title,
    kind: row.kind === 'full' ? 'full' : 'practice',
    status: row.status === 'published' ? 'published' : 'draft',
    descriptionVi: row.description_vi ?? '',
    sections,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const libraryRow = (item: LibraryItem) => ({
  id: item.id,
  title: item.title.trim().slice(0, 200) || 'Đề chưa đặt tên',
  kind: item.kind,
  status: item.status,
  description_vi: item.descriptionVi.trim(),
  sections: item.sections,
});
