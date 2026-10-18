import { describe, expect, it } from 'vitest';
import { READING_FULL_TESTS, READING_PRACTICE_TESTS } from '../../data/ielts/reading';
import type { ReadingCompletionGroup, ReadingPassage } from '../../data/ielts/reading/types';
import { passageQuestions } from '../readingLogic';
import {
  addReadingGroup,
  applyCompletionText,
  applyReadingNotes,
  applyShapesText,
  completionText,
  duplicateReadingItem,
  emptyReadingItem,
  evidenceFrom,
  filterReadingLibrary,
  isReadingLibraryTestId,
  libraryReadingTest,
  parseGlossary,
  parseHeadings,
  readingItemRow,
  readingLibraryProblems,
  readingLibraryRowId,
  readingLibraryTestId,
  readingNotesPayload,
  renumberReadingItem,
  rowToReadingItem,
  setParagraphs,
  setPassage,
  setPracticePart,
  splitParagraphs,
  type ReadingLibraryItem,
} from '../readingLibraryLogic';
import { finalizeReadingNotes, parseReadingNotesRequest, readingNotes } from '../../supabase/functions/ai-proxy/ops/readingNotes.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';

const NOW = '2026-10-18T00:00:00.000Z';

/** A bundled test as a library item, so the checks run on known-good content. */
const asItem = (test: (typeof READING_PRACTICE_TESTS)[number], id = 'abc-123'): ReadingLibraryItem => ({
  id,
  title: test.title,
  kind: test.kind,
  status: 'draft',
  descriptionVi: test.descriptionVi,
  passages: structuredClone(test.passages),
  createdAt: NOW,
  updatedAt: NOW,
});

const passage = (paragraphs: string[]): ReadingPassage => ({
  ...emptyReadingItem('x', 'practice', 1, NOW).passages[0],
  title: 'T',
  paragraphs: paragraphs.map((text, i) => ({ label: String.fromCharCode(65 + i), text })),
});

describe('ids', () => {
  it('round-trips a row id through the test id', () => {
    const id = readingLibraryTestId('row-1');
    expect(isReadingLibraryTestId(id)).toBe(true);
    expect(readingLibraryRowId(id)).toBe('row-1');
    expect(isReadingLibraryTestId('reading-full-1')).toBe(false);
  });
});

describe('splitParagraphs', () => {
  it('splits at blank lines and joins lines inside a paragraph', () => {
    expect(splitParagraphs('One line\ncontinued.\n\n\nTwo.\r\n\r\nThree.')).toEqual([
      { label: 'A', text: 'One line continued.' },
      { label: 'B', text: 'Two.' },
      { label: 'C', text: 'Three.' },
    ]);
  });

  it('uses lines when there are no blank lines', () => {
    expect(splitParagraphs('First.\nSecond.').map((p) => p.text)).toEqual(['First.', 'Second.']);
  });

  it('drops printed letters only when every paragraph has them in order', () => {
    expect(splitParagraphs('A The start.\n\nB. The middle.').map((p) => p.text)).toEqual(['The start.', 'The middle.']);
    expect(splitParagraphs('A study found.\n\nIt grew.').map((p) => p.text)).toEqual(['A study found.', 'It grew.']);
  });

  it('returns nothing for empty text and at most 12 paragraphs', () => {
    expect(splitParagraphs('  \n ')).toEqual([]);
    expect(splitParagraphs(Array.from({ length: 15 }, (_, i) => `P${i}`).join('\n\n'))).toHaveLength(12);
  });

  it('keeps "which paragraph" options in step with the letters', () => {
    const p = addReadingGroup(passage(['a', 'b']), 'matching_paragraph');
    const next = setParagraphs(p, splitParagraphs('x\n\ny\n\nz'));
    const g = next.groups[0];
    expect(g.type === 'matching' && g.options.map((o) => o.key)).toEqual(['A', 'B', 'C']);
  });
});

describe('glossary and headings', () => {
  it('reads "term = meaning" lines once per term', () => {
    expect(parseGlossary('colony = thuộc địa\nbad line\nColony: lặp\nyield: sản lượng')).toEqual([
      { term: 'colony', meaningVi: 'thuộc địa' },
      { term: 'yield', meaningVi: 'sản lượng' },
    ]);
  });

  it('gives headings roman keys and drops typed numerals', () => {
    expect(parseHeadings('iv. A new start\n\nThe cost')).toEqual([
      { key: 'i', text: 'A new start' },
      { key: 'ii', text: 'The cost' },
    ]);
  });
});

describe('groups and numbering', () => {
  it('adds a group for each kind with questions after the last one', () => {
    let p = passage(['a', 'b', 'c']);
    p = addReadingGroup(p, 'tfng');
    p = addReadingGroup(p, 'mcq_multi');
    expect(passageQuestions(p).map((q) => q.number)).toEqual([1, 2, 3]);
    expect(p.groups[1].type).toBe('mcq_multi');
    expect(new Set(p.groups.map((g) => g.id)).size).toBe(2);
  });

  it('renumbers across passages and moves template blanks with the numbers', () => {
    const item = emptyReadingItem('x', 'full', 1, NOW);
    const withGroups = {
      ...item,
      passages: item.passages.map((p) => addReadingGroup(addReadingGroup(p, 'completion'), 'tfng')),
    };
    const out = renumberReadingItem(withGroups);
    const numbers = out.passages.flatMap((p) => passageQuestions(p).map((q) => q.number));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
    const g = out.passages[1].groups[0] as ReadingCompletionGroup;
    expect(g.lines).toEqual(['{{3}}']);
  });

  it('setPassage renumbers the whole test', () => {
    const item = emptyReadingItem('x', 'full', 1, NOW);
    const out = setPassage(item, 1, addReadingGroup(item.passages[1], 'tfng'));
    expect(passageQuestions(out.passages[1])[0].number).toBe(1);
  });

  it('moves a practice passage to another part with new ids', () => {
    const item = renumberReadingItem({ ...emptyReadingItem('x', 'practice', 1, NOW) });
    const withGroup = { ...item, passages: [addReadingGroup(item.passages[0], 'tfng')] };
    const moved = setPracticePart(withGroup, 3);
    expect(moved.passages[0].part).toBe(3);
    expect(moved.passages[0].suggestedMinutes).toBe(23);
    expect(moved.passages[0].id).not.toBe(withGroup.passages[0].id);
    expect(moved.passages[0].groups[0].id.startsWith(moved.passages[0].id)).toBe(true);
  });

  it('duplicates as a draft with its own ids', () => {
    const item = { ...asItem(READING_PRACTICE_TESTS[0]), status: 'published' as const };
    const copy = duplicateReadingItem(item, 'new-id', NOW);
    expect(copy.status).toBe('draft');
    expect(copy.title).toContain('(bản sao)');
    expect(copy.passages[0].id).not.toBe(item.passages[0].id);
    expect(copy.passages[0].groups.every((g) => g.id.startsWith(copy.passages[0].id))).toBe(true);
    expect(item.passages[0].groups[0].id).not.toBe(copy.passages[0].groups[0].id);
  });
});

describe('templates', () => {
  it('turns ___ into numbered blanks and keeps existing notes', () => {
    const p = addReadingGroup(passage(['a']), 'completion');
    const g0 = p.groups[0] as ReadingCompletionGroup;
    const g = { ...g0, questions: [{ ...g0.questions[0], evidence: 'kept' }] };
    const out = applyCompletionText(g, 'lines', 'The ___ grew.\n\nThen ___ and ___ fell.', 'A');
    expect(out.lines).toEqual(['The {{1}} grew.', 'Then {{2}} and {{3}} fell.']);
    expect(out.questions.map((q) => q.number)).toEqual([1, 2, 3]);
    expect(out.questions[0].evidence).toBe('kept');
    expect(completionText(out)).toEqual({ mode: 'lines', text: 'The ___ grew.\nThen ___ and ___ fell.' });
  });

  it('reads a table with the header first', () => {
    const g = addReadingGroup(passage(['a']), 'completion').groups[0] as ReadingCompletionGroup;
    const out = applyCompletionText(g, 'table', 'Year | Event\n1900 | ___', 'A');
    expect(out.table).toEqual({ header: ['Year', 'Event'], rows: [['1900', '{{1}}']] });
    expect(out.lines).toBeUndefined();
  });

  it('reads diagram shapes and reports bad lines', () => {
    const g = addReadingGroup(passage(['a']), 'diagram').groups[0];
    if (g.type !== 'diagram') throw new Error('not a diagram');
    const { group, bad } = applyShapesText(g, 'box 10 10 100 40 ___ | layer\nstar 1 2 3 4\narrow 0 0 50 0', 'A');
    expect(bad).toEqual([2]);
    expect(group.diagram.shapes).toHaveLength(2);
    expect(group.diagram.shapes[0].text).toBe('{{1}}\nlayer');
    expect(group.questions).toHaveLength(1);
  });
});

describe('evidenceFrom', () => {
  const p = passage(['Bees  pollinate\nmany crops.', 'Other text.']);
  it('accepts words from the paragraph, ignoring spacing and case', () => {
    expect(evidenceFrom(p, 'A', ' bees pollinate  many ')).toEqual({ paragraph: 'A', evidence: 'bees pollinate many' });
  });
  it('rejects words from another paragraph or an empty selection', () => {
    expect(evidenceFrom(p, 'B', 'bees')).toBeNull();
    expect(evidenceFrom(p, 'A', '  ')).toBeNull();
    expect(evidenceFrom(p, 'Z', 'bees')).toBeNull();
  });
});

describe('applyReadingNotes', () => {
  const base = () => {
    let p = passage(['Bees pollinate many crops.', 'Honey prices rose sharply last year.']);
    p = addReadingGroup(p, 'tfng');
    return p;
  };
  const note = (extra: object) => ({
    number: 1,
    paragraph: 'B',
    evidence: 'Honey prices rose sharply',
    distractor: '',
    paraphraseQuestion: '',
    paraphrasePassage: '',
    explanationVi: 'Vì bài nói giá tăng.',
    ...extra,
  });

  it('fills empty fields and takes the AI paragraph when the quote is there', () => {
    const out = applyReadingNotes(base(), [note({ paraphraseQuestion: 'went up', paraphrasePassage: 'rose' })]);
    const q = passageQuestions(out.passage)[0];
    expect(q.paragraph).toBe('B');
    expect(q.evidence).toBe('Honey prices rose sharply');
    expect(q.paraphrase).toEqual({ question: 'went up', passage: 'rose' });
    expect(out.filled).toEqual([1]);
    expect(out.rejected).toEqual([]);
  });

  it('never overwrites what the admin wrote', () => {
    const p = base();
    const g = p.groups[0];
    const written = { ...p, groups: [{ ...g, questions: [{ ...g.questions[0], evidence: 'Bees pollinate', explanationVi: 'Của tôi' }] }] } as ReadingPassage;
    const q = passageQuestions(applyReadingNotes(written, [note({})]).passage)[0];
    expect(q.evidence).toBe('Bees pollinate');
    expect(q.paragraph).toBe('A');
    expect(q.explanationVi).toBe('Của tôi');
  });

  it('rejects quotes that are not in the passage', () => {
    const out = applyReadingNotes(base(), [note({ evidence: 'made up words', explanationVi: '' })]);
    expect(passageQuestions(out.passage)[0].evidence).toBe('');
    expect(out.rejected).toEqual([1]);
  });

  it('keeps the paragraph fixed for headings', () => {
    const p = addReadingGroup(passage(['Bees pollinate many crops.', 'Honey prices rose sharply.']), 'headings');
    const out = applyReadingNotes(p, [note({ explanationVi: '' })]);
    expect(passageQuestions(out.passage)[0].evidence).toBe('');
    expect(out.rejected).toEqual([1]);
  });

  it('sends the question text the learner sees', () => {
    const p = addReadingGroup(passage(['a b c']), 'completion');
    const g = applyCompletionText(p.groups[0] as ReadingCompletionGroup, 'lines', 'Bees ___ crops.', 'A');
    const payload = readingNotesPayload({ ...p, groups: [g] });
    expect(payload.questions[0]).toMatchObject({ number: 1, type: 'completion', question: 'Bees ___ crops.' });
  });
});

describe('readingLibraryProblems', () => {
  it('finds nothing in the bundled tests', () => {
    for (const t of [...READING_PRACTICE_TESTS, ...READING_FULL_TESTS]) expect(readingLibraryProblems(asItem(t)), t.id).toEqual([]);
  });

  it('reports an empty draft in Vietnamese with where to fix it', () => {
    const problems = readingLibraryProblems(emptyReadingItem('x', 'practice', 2, NOW));
    expect(problems.some((p) => p.where === 'Đề' && p.message === 'chưa có tên đề')).toBe(true);
    const passageId = emptyReadingItem('x', 'practice', 2, NOW).passages[0].id;
    expect(problems.find((p) => p.message === 'chưa có bài đọc')?.passageId).toBe(passageId);
  });

  it('points a question problem at its number and passage', () => {
    const item = asItem(READING_PRACTICE_TESTS[0]);
    const g = item.passages[0].groups[0];
    item.passages[0].groups[0] = { ...g, questions: g.questions.map((q, i) => (i === 0 ? { ...q, explanationVi: '' } : q)) } as typeof g;
    const problem = readingLibraryProblems(item).find((p) => p.message === 'chưa có giải thích');
    expect(problem?.where).toBe(`Câu ${g.questions[0].number}`);
    expect(problem?.passageId).toBe(item.passages[0].id);
  });
});

describe('rows and list', () => {
  it('round-trips an item through a row', () => {
    const item = asItem(READING_PRACTICE_TESTS[0]);
    const row = { ...readingItemRow(item), description_vi: item.descriptionVi, created_at: NOW, updated_at: NOW };
    expect(rowToReadingItem(row)).toEqual(item);
  });

  it('drops rows that are not a test', () => {
    const row = { id: 'x', title: 't', kind: 'practice', status: 'draft', description_vi: null, created_at: NOW, updated_at: NOW };
    expect(rowToReadingItem({ ...row, passages: [] })).toBeNull();
    expect(rowToReadingItem({ ...row, passages: [{ id: 'p', part: 4, paragraphs: [], groups: [], difficulty: 'easy' }] })).toBeNull();
  });

  it('filters by status and folded text, newest first', () => {
    const a = { ...asItem(READING_PRACTICE_TESTS[0], 'a'), title: 'Ong mật', updatedAt: '2026-01-01' };
    const b = { ...asItem(READING_PRACTICE_TESTS[1], 'b'), status: 'published' as const, updatedAt: '2026-02-01' };
    expect(filterReadingLibrary([a, b], 'ong mat', 'all').map((i) => i.id)).toEqual(['a']);
    expect(filterReadingLibrary([a, b], '', 'published').map((i) => i.id)).toEqual(['b']);
    expect(filterReadingLibrary([a, b], '', 'all').map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('gives an untitled test a title and description', () => {
    const t = libraryReadingTest(emptyReadingItem('x', 'full', 1, NOW));
    expect(t.title).toBe('Đề chưa đặt tên');
    expect(t.descriptionVi).not.toBe('');
  });
});

describe('readingNotes op', () => {
  const payload = {
    title: 'Bees',
    paragraphs: [{ label: 'A', text: 'Bees pollinate crops.' }],
    questions: [{ number: 1, type: 'tfng', question: 'Bees help crops.', options: [], answers: ['TRUE'] }],
  };

  it('is registered, admin only', () => {
    expect(OPS.readingNotes).toBe(readingNotes);
    expect(readingNotes.adminOnly).toBe(true);
  });

  it('checks the request', () => {
    expect(parseReadingNotesRequest(payload).questions[0].number).toBe(1);
    expect(() => parseReadingNotesRequest({ ...payload, paragraphs: [] })).toThrow();
    expect(() => parseReadingNotesRequest({ ...payload, paragraphs: [{ label: 'a1', text: 'x' }] })).toThrow();
    expect(() => parseReadingNotesRequest({ ...payload, questions: [{ ...payload.questions[0], number: 41 }] })).toThrow();
    expect(() => parseReadingNotesRequest({ ...payload, paragraphs: [{ label: 'A', text: 'x'.repeat(3999) }, { label: 'B', text: 'x'.repeat(3999) }, { label: 'C', text: 'x'.repeat(3999) }, { label: 'D', text: 'x'.repeat(3999) }] })).toThrow();
  });

  it('keeps well-formed notes only', () => {
    const { notes } = finalizeReadingNotes({ notes: [{ number: 1, paragraph: 'b', evidence: ' x ', explanationVi: 'y' }, { number: 99 }, { number: 'a' }] });
    expect(notes).toEqual([{ number: 1, paragraph: 'B', evidence: 'x', distractor: '', paraphraseQuestion: '', paraphrasePassage: '', explanationVi: 'y' }]);
    expect(() => finalizeReadingNotes({ notes: [] })).toThrow();
    expect(() => finalizeReadingNotes({})).toThrow();
  });
});
