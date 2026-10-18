import { describe, expect, it } from 'vitest';
import {
  addGroup,
  addQuestion,
  addSegment,
  applyNotes,
  applyTemplate,
  blankContext,
  duplicateItem,
  emptyItem,
  filterLibrary,
  isLibraryTestId,
  libraryErrorText,
  libraryProblems,
  libraryRow,
  libraryRowId,
  libraryTest,
  libraryTestId,
  mapKeys,
  markBoundary,
  markEnd,
  moveGroup,
  notesPayload,
  nudgeTime,
  parseAnswers,
  parseOptions,
  parseShapes,
  parseTranscript,
  removeGroup,
  removeQuestion,
  removeSegment,
  renameSpeaker,
  renumberSection,
  rowToLibrary,
  sectionIdFor,
  setMultiAnswers,
  setPracticePart,
  setYouTube,
  shapesText,
  templateText,
  transcriptText,
  updateQuestion,
  type LibraryItem,
} from '../listeningLibraryLogic';
import { LISTENING_FULL_TESTS, LISTENING_PRACTICE_TESTS, type CompletionGroup, type ListeningSection } from '../../data/ielts/listening';
import { finalizeNotes, listeningNotes, parseNotesRequest } from '../../supabase/functions/ai-proxy/ops/listeningNotes.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';

const ID = '0f8e2c1a-1111-4222-8333-444455556666';
const NOW = '2026-10-18T05:00:00Z';

/** A bundled practice part moved into the library: a known-good test. */
function practiceItem(): LibraryItem {
  const src = structuredClone(LISTENING_PRACTICE_TESTS[0]);
  return { ...emptyItem(ID, 'practice', src.sections[0].part, NOW), title: src.title, sections: src.sections };
}

function fullItem(): LibraryItem {
  const src = structuredClone(LISTENING_FULL_TESTS[0]);
  return { ...emptyItem(ID, 'full', 1, NOW), title: src.title, sections: src.sections };
}

describe('library ids and new tests', () => {
  it('names tests and parts so they never clash', () => {
    expect(libraryTestId(ID)).toBe(`lib_${ID}`);
    expect(isLibraryTestId(`lib_${ID}`)).toBe(true);
    expect(isLibraryTestId('gen_x')).toBe(false);
    expect(libraryRowId(`lib_${ID}`)).toBe(ID);
    expect(sectionIdFor(ID, 3)).toBe('lib-0f8e2c1a11-p3');
  });

  it('starts a full test with four empty parts and a practice test with one', () => {
    const full = emptyItem(ID, 'full', 1, NOW);
    expect(full.sections.map((s) => s.part)).toEqual([1, 2, 3, 4]);
    expect(full.sections[3].style).toBe('lecture');
    expect(full.status).toBe('draft');
    const one = emptyItem(ID, 'practice', 3, NOW);
    expect(one.sections.map((s) => s.part)).toEqual([3]);
    expect(one.sections[0].speakers).toHaveLength(2);
  });

  it('copies a test as a draft with ids of its own', () => {
    const item = { ...practiceItem(), status: 'published' as const };
    const copy = duplicateItem(item, 'abcdef12-0000', NOW);
    expect(copy.status).toBe('draft');
    expect(copy.title).toMatch(/\(bản sao\)$/);
    const s = copy.sections[0];
    expect(s.id).toBe(sectionIdFor('abcdef12-0000', s.part));
    expect(s.segments.every((x) => x.id.startsWith(s.id))).toBe(true);
    expect(libraryProblems(copy)).toEqual([]);
    // The original is untouched.
    expect(item.sections[0].id).toBe(LISTENING_PRACTICE_TESTS[0].sections[0].id);
  });

  it('moves a practice test to another part and renumbers it', () => {
    const moved = setPracticePart(practiceItem(), 3);
    const s = moved.sections[0];
    expect(s.part).toBe(3);
    expect(s.groups[0].questions[0].number).toBe(21);
    expect(s.groups.flatMap((g) => g.questions).at(-1)?.number).toBe(30);
    expect(libraryProblems(moved)).toEqual([]);
  });

  it('turns into a normal test and a database row and back', () => {
    const item = practiceItem();
    const test = libraryTest(item);
    expect(test.id).toBe(`lib_${ID}`);
    expect(test.descriptionVi).toMatch(/^Luyện Part 1/);
    const row = { ...libraryRow(item), created_at: NOW, updated_at: NOW };
    expect(rowToLibrary(row)).toEqual(item);
    expect(rowToLibrary({ ...row, sections: {} })).toBeNull();
    expect(rowToLibrary({ ...row, sections: [] })).toBeNull();
    expect(rowToLibrary({ ...row, sections: [{ id: 'x' }] })).toBeNull();
  });
});

describe('YouTube timing marks', () => {
  const base = (): ListeningSection => setYouTube({ ...emptyItem(ID, 'practice', 1, NOW).sections[0] }, 'M7lc1UVf-VE');

  it('marks segments back to back while the video plays', () => {
    let s = base();
    let cursor = 0;
    ({ section: s, cursor } = markBoundary(s, cursor, 4.04));
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].start).toBe(4);
    ({ section: s, cursor } = markBoundary(s, cursor, 31.26));
    ({ section: s, cursor } = markBoundary(s, cursor, 60));
    expect(cursor).toBe(2);
    expect(s.segments.map((x) => [x.start, x.end])).toEqual([
      [4, 31.3],
      [31.3, 60],
      [60, undefined],
    ]);
    s = markEnd(s, cursor, 75);
    expect(s.segments[2].end).toBe(75);
    // A double press is ignored.
    expect(markBoundary(s, 1, 31.5).section).toBe(s);
  });

  it('nudges a boundary and keeps neighbours touching', () => {
    let s = base();
    let cursor = 0;
    for (const t of [0, 10, 20]) ({ section: s, cursor } = markBoundary(s, cursor, t));
    s = nudgeTime(s, 0, 'end', 0.5);
    expect([s.segments[0].end, s.segments[1].start]).toEqual([10.5, 10.5]);
    s = nudgeTime(s, 1, 'start', -1);
    expect([s.segments[0].end, s.segments[1].start]).toEqual([9.5, 9.5]);
    expect(nudgeTime(s, 0, 'start', -5).segments[0].start).toBe(0);
  });

  it('switches the audio source without losing timings', () => {
    const s = base();
    expect(s.youtube?.videoId).toBe('M7lc1UVf-VE');
    expect(setYouTube(s, null)).not.toHaveProperty('youtube');
  });
});

describe('script editing', () => {
  const speakers = [
    { name: 'Anna', voice: 'Kore' as const },
    { name: 'Tom', voice: 'Puck' as const },
  ];

  it('reads "Name: line" turns and joins wrapped lines', () => {
    const parsed = parseTranscript('anna: Good morning.\n  How can I help?\n\nTom: I would like a room.\nZed: Hi\nTom:', speakers);
    expect(parsed.lines).toEqual([
      { speaker: 'Anna', text: 'Good morning. How can I help?' },
      { speaker: 'Tom', text: 'I would like a room.' },
      { speaker: 'Zed', text: 'Hi' },
    ]);
    expect(parsed.unknown).toEqual(['Zed']);
    expect(parseTranscript('Welcome everyone.', [speakers[0]]).lines).toEqual([{ speaker: 'Anna', text: 'Welcome everyone.' }]);
    expect(transcriptText(parsed.lines.slice(0, 2))).toBe('Anna: Good morning. How can I help?\nTom: I would like a room.');
  });

  it('adds and removes segments, keeping questions attached', () => {
    const s = practiceItem().sections[0];
    const first = s.segments[0].id;
    const second = s.segments[1].id;
    const removed = removeSegment(s, second);
    expect(removed.segments.map((x) => x.id)).not.toContain(second);
    expect(removed.groups.flatMap((g) => g.questions).some((q) => q.segmentId === second)).toBe(false);
    expect(removed.groups.flatMap((g) => g.questions).filter((q) => q.segmentId === first).length).toBeGreaterThan(0);
    const added = addSegment(s);
    expect(added.segments).toHaveLength(s.segments.length + 1);
    expect(new Set(added.segments.map((x) => x.id)).size).toBe(added.segments.length);
  });

  it('renames a speaker in every line', () => {
    const s = renameSpeaker(practiceItem().sections[0], 'Lucy', 'Laura');
    expect(s.speakers.map((p) => p.name)).toContain('Laura');
    expect(s.segments.flatMap((x) => x.lines).some((l) => l.speaker === 'Lucy')).toBe(false);
  });
});

describe('question groups', () => {
  const blank = () => {
    const s = addSegment(emptyItem(ID, 'practice', 2, NOW).sections[0]);
    return s;
  };

  it('adds every group type numbered from the part start', () => {
    let s = blank();
    for (const t of ['completion', 'short_answer', 'mcq', 'mcq_multi', 'matching', 'map'] as const) s = addGroup(s, t);
    expect(s.groups.map((g) => g.type)).toEqual(['completion', 'short_answer', 'mcq', 'mcq_multi', 'matching', 'map']);
    expect(s.groups.flatMap((g) => g.questions.map((q) => q.number))).toEqual([11, 12, 13, 14, 15, 16, 17]);
    expect((s.groups[0] as CompletionGroup).lines).toEqual(['{{11}}']);
    expect(s.groups.every((g) => g.questions.every((q) => q.segmentId === s.segments[0].id))).toBe(true);
  });

  it('renumbers questions and blanks after moving and removing', () => {
    let s = blank();
    s = addGroup(s, 'mcq');
    s = addGroup(s, 'completion');
    s = moveGroup(s, s.groups[1].id, -1);
    expect(s.groups[0].type).toBe('completion');
    expect((s.groups[0] as CompletionGroup).lines).toEqual(['{{11}}']);
    expect(s.groups[1].questions[0].number).toBe(12);
    s = removeGroup(s, s.groups[0].id);
    expect(s.groups[0].questions[0].number).toBe(11);
    // Swapped numbers in one template are rewritten in one pass.
    const swapped = renumberSection({
      ...s,
      groups: [{ ...(addGroup(blank(), 'completion').groups[0] as CompletionGroup), lines: ['{{12}} and {{11}}'], questions: [
        { number: 12, answers: [], segmentId: '', evidence: '', explanationVi: '' },
        { number: 11, answers: [], segmentId: '', evidence: '', explanationVi: '' },
      ] }],
    });
    expect((swapped.groups[0] as CompletionGroup).lines).toEqual(['{{11}} and {{12}}']);
  });

  it('edits completion templates with ___ blanks', () => {
    const s = addGroup(blank(), 'completion');
    const g = s.groups[0] as CompletionGroup;
    const two = applyTemplate(g, 'lines', 'Name: ___\nPhone: ___ (mobile)\n\n', 'seg');
    expect(two.lines).toEqual(['Name: {{11}}', 'Phone: {{12}} (mobile)']);
    expect(two.questions.map((q) => q.number)).toEqual([11, 12]);
    expect(templateText(two)).toEqual({ mode: 'lines', text: 'Name: ___\nPhone: ___ (mobile)' });
    expect(blankContext(two, 12)).toBe('Phone: ___ (mobile)');

    const table = applyTemplate(two, 'table', 'Room | Price\nSingle | ___\nDouble | £80', 'seg');
    expect(table.table).toEqual({ header: ['Room', 'Price'], rows: [['Single', '{{11}}'], ['Double', '£80']] });
    expect(table).not.toHaveProperty('lines');
    expect(table.questions).toHaveLength(1);
    expect(templateText(table).mode).toBe('table');
  });

  it('adds, edits and removes questions, sharing answers in "Choose TWO"', () => {
    let s = addGroup(blank(), 'mcq_multi');
    let g = setMultiAnswers(s.groups[0], ['D', 'B', 'D']);
    expect(g.questions.map((q) => q.answers)).toEqual([['B', 'D'], ['B', 'D']]);
    g = addQuestion(g, 'seg');
    expect(g.questions).toHaveLength(3);
    expect(g.questions[2].answers).toEqual(['B', 'D']);
    g = removeQuestion(g, g.questions[2].number);
    expect(g.questions).toHaveLength(2);
    s = addGroup(blank(), 'mcq');
    const mcq = updateQuestion(addQuestion(s.groups[0], 'seg'), 12, { prompt: 'Why?' });
    expect(mcq.questions[1]).toMatchObject({ number: 12, prompt: 'Why?', options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }] });
    expect(removeQuestion(s.groups[0], 11).questions).toHaveLength(1);
  });

  it('reads options and accepted answers as typed', () => {
    expect(parseOptions('A. a museum\nB) a park\n  \nthe beach')).toEqual([
      { key: 'A', text: 'a museum' },
      { key: 'B', text: 'a park' },
      { key: 'C', text: 'the beach' },
    ]);
    expect(parseAnswers('15 / fifteen\n15 ')).toEqual(['15', 'fifteen']);
    expect(parseAnswers('24/7')).toEqual(['24/7']);
  });
});

describe('checks before publishing', () => {
  it('passes the bundled parts', () => {
    expect(libraryProblems(practiceItem())).toEqual([]);
    expect(libraryProblems(fullItem())).toEqual([]);
  });

  it('says in Vietnamese what to fix and where', () => {
    const item = practiceItem();
    item.title = ' ';
    const s = item.sections[0];
    s.contextVi = '';
    s.speakers[0].name = 'lucy smith';
    s.groups[0].questions[0].evidence = 'not in the script';
    s.groups[0].questions[1].answers = [];
    s.segments[1].lines = [];
    const problems = libraryProblems(item);
    expect(problems).toEqual(
      expect.arrayContaining([
        { where: 'Đề', message: 'chưa có tên đề' },
        { where: 'Part 1', message: 'chưa có bối cảnh (ai nói, nói về gì)', sectionId: s.id },
        expect.objectContaining({ where: 'Part 1', message: expect.stringContaining('lucy smith') }),
        { where: `Câu ${s.groups[0].questions[0].number}`, message: expect.stringContaining('evidence'), sectionId: s.id },
        { where: `Câu ${s.groups[0].questions[1].number}`, message: 'chưa có đáp án', sectionId: s.id },
        { where: 'Part 1 · đoạn 2', message: 'chưa có lời thoại', sectionId: s.id },
      ]),
    );
    expect(problems.every((p) => !/[A-Za-z]+ is not|no answer/.test(p.message))).toBe(true);
  });

  it('checks recorded timings and the 10-question rule', () => {
    const item = practiceItem();
    const s = setYouTube(item.sections[0], 'M7lc1UVf-VE');
    item.sections[0] = { ...s, groups: s.groups.slice(0, 1) };
    const where = libraryProblems(item).map((p) => `${p.where}: ${p.message}`);
    expect(where).toContain('Part 1 · đoạn 1: cần thời điểm bắt đầu và kết thúc');
    expect(where).toContain('Part 1: mỗi part cần đúng 10 câu');
    const empty = emptyItem(ID, 'full', 1, NOW);
    expect(libraryProblems(empty).map((p) => p.message)).toEqual(expect.arrayContaining(['chưa có đoạn audio nào', 'chưa có câu hỏi']));
  });
});

describe('AI notes', () => {
  it('builds the op payload from a part', () => {
    const s = practiceItem().sections[0];
    const p = notesPayload(s);
    expect(p.part).toBe(1);
    expect(p.segments[0].text).toMatch(/^\w+: /);
    expect(p.questions).toHaveLength(10);
    expect(p.questions[0].question).toContain('___');
    expect(() => parseNotesRequest(p)).not.toThrow();
    expect(OPS.listeningNotes).toBe(listeningNotes);
    expect(listeningNotes.adminOnly).toBe(true);
    const req = listeningNotes.build(p);
    expect(JSON.stringify(req.contents)).toContain(s.segments[0].id);
    expect(() => listeningNotes.build({ part: 5, segments: [], questions: [] })).toThrow();
  });

  it('fills only empty fields and only with quotes from the script', () => {
    const s = practiceItem().sections[0];
    const [q1, q2, q3] = s.groups[0].questions;
    q1.evidence = '';
    q1.explanationVi = '';
    q2.evidence = '';
    q3.distractor = undefined;
    const keep = q3.explanationVi;
    const seg = s.segments.find((x) => x.id === q1.segmentId)!;
    const quote = seg.lines[0].text.split(' ').slice(0, 4).join(' ');
    const note = (number: number, extra: Record<string, string>) => ({
      number,
      segmentId: '',
      evidence: '',
      distractor: '',
      paraphraseQuestion: '',
      paraphraseAudio: '',
      explanationVi: '',
      ...extra,
    });
    const out = applyNotes(s, [
      note(q1.number, { evidence: quote.toUpperCase(), explanationVi: 'Vì người nói nói rõ.' }),
      note(q2.number, { evidence: 'words that were never said' }),
      note(q3.number, { explanationVi: 'replaced?', distractor: quote }),
    ]);
    const [a, b, c] = out.section.groups[0].questions;
    expect(a.evidence).toBe(quote.toUpperCase());
    expect(a.explanationVi).toBe('Vì người nói nói rõ.');
    expect(b.evidence).toBe('');
    expect(c.explanationVi).toBe(keep);
    expect(c.distractor).toBe(quote);
    expect(out.filled.sort()).toEqual([q1.number, q3.number].sort());
    expect(out.rejected).toEqual([q2.number]);
  });

  it('keeps well-formed notes from the model', () => {
    expect(finalizeNotes({ notes: [{ number: 3, evidence: ' x ' }, { number: 99 }] }).notes).toEqual([
      { number: 3, segmentId: '', evidence: 'x', distractor: '', paraphraseQuestion: '', paraphraseAudio: '', explanationVi: '' },
    ]);
    expect(() => finalizeNotes({ notes: [] })).toThrow();
    expect(() => finalizeNotes(null)).toThrow();
  });
});

describe('the admin list', () => {
  it('searches without accents and filters by status, newest first', () => {
    const a = { ...practiceItem(), id: 'a', title: 'Đặt phòng khách sạn', updatedAt: '2026-10-01' };
    const b = { ...practiceItem(), id: 'b', title: 'Bảo tàng', status: 'published' as const, updatedAt: '2026-10-05' };
    expect(filterLibrary([a, b], '', 'all').map((i) => i.id)).toEqual(['b', 'a']);
    expect(filterLibrary([a, b], 'dat phong', 'all').map((i) => i.id)).toEqual(['a']);
    expect(filterLibrary([a, b], '', 'published').map((i) => i.id)).toEqual(['b']);
    expect(filterLibrary([a, b], '', 'draft').map((i) => i.id)).toEqual(['a']);
  });
});

describe('database errors', () => {
  it('names the missing migration and the missing grant', () => {
    expect(libraryErrorText('relation "public.listening_library" does not exist')).toMatch(/migration 011/);
    expect(libraryErrorText("Could not find the table 'public.listening_library' in the schema cache")).toMatch(/migration 011/);
    expect(libraryErrorText('new row violates row-level security policy for table "listening_library"')).toMatch(/app_admins/);
    expect(libraryErrorText('column listening_library.title does not exist')).toBe('column listening_library.title does not exist');
    expect(libraryErrorText('network down')).toBe('network down');
  });
});

describe('map shapes as typed', () => {
  it('reads shapes, labels and letters, and reports unreadable lines', () => {
    const { shapes, bad } = parseShapes('path 0 140 400 20\nbuilding 20 20 120 80 Café Nero\n\nBuilding 260 20 120 80 [B]\ntower 1 2 3 4\ngreen 20 190 160 90 [A]');
    expect(bad).toEqual([5]);
    expect(shapes).toEqual([
      { kind: 'path', x: 0, y: 140, w: 400, h: 20 },
      { kind: 'building', x: 20, y: 20, w: 120, h: 80, label: 'Café Nero' },
      { kind: 'building', x: 260, y: 20, w: 120, h: 80, key: 'B' },
      { kind: 'green', x: 20, y: 190, w: 160, h: 90, key: 'A' },
    ]);
    expect(mapKeys(shapes)).toEqual(['A', 'B']);
    expect(parseShapes(shapesText(shapes)).shapes).toEqual(shapes);
  });
});
