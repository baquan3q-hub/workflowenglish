import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lessonIds, loadLessons, stageLessons } from '../../data/grammar/meta';
import type { Lesson } from '../../data/grammar/types';
import { isDone, lessonStats, nextInPath, placementOf, recommend, snapshot, toAttempt, topErrorTags, type Attempt } from '../grammar/progress';
import { advance, aiDrillSession, clampQuestionCount, errorSession, learnSession, placementSession, reviewSession } from '../grammar/session';
import {
  dropOldDraft,
  getAiItemMap,
  getAiItems,
  getAttempts,
  getDraft,
  getOldLibrary,
  getState,
  record,
  recordAiItemOutcome,
  saveAiItems,
  saveDraft,
  syncGrammar,
} from '../grammar/store';
import { explainGrammar, generateGrammarDrills, parseGeneratedDrills, parseGrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';

const from = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { from } }));

const all = await loadLessons(lessonIds);
const byId = new Map<string, Lesson>(all.map((l) => [l.id, l]));
const DAY = 86_400_000;

let n = 0;
const at = (day: number) => new Date(Date.UTC(2026, 10, 1) + day * DAY).toISOString();
function attempt(over: Partial<Attempt> & Pick<Attempt, 'lesson'>): Attempt {
  const lesson = byId.get(over.lesson)!;
  const item = over.itemId ? lesson.items.find((i) => i.id === over.itemId)! : lesson.items[0];
  return {
    version: 2,
    id: 'a' + n++,
    session: 's1',
    at: at(0),
    mode: 'learn',
    itemId: item.id,
    kind: item.kind,
    level: item.level,
    answer: 'x',
    result: 'correct',
    assisted: false,
    typedFallback: false,
    ...over,
  };
}
const finished = (lesson: string, session: string, mode: Attempt['mode'] = 'learn', day = 0) =>
  attempt({ lesson, session, mode, result: 'finished', itemId: '', at: at(day) });

beforeEach(() => {
  const values: Record<string, string> = {};
  vi.stubGlobal(
    'localStorage',
    Object.assign(values, {
      getItem: (k: string) => values[k] ?? null,
      setItem: (k: string, v: string) => {
        values[k] = v;
      },
      removeItem: (k: string) => {
        delete values[k];
      },
    })
  );
  from.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('saved data from the first version', () => {
  const v1 = {
    version: 1,
    id: 'old-1',
    session: 'old-run',
    skill: 'past',
    item: 3,
    kind: 'fill',
    mode: 'lesson',
    answer: 'goed',
    expected: 'went',
    at: '2026-10-01T10:00:00Z',
    result: 'incorrect',
    assisted: false,
    typedFallback: false,
  };

  it('reads version-1 events as attempts on the new lesson without rewriting them', () => {
    localStorage.setItem('workflow:grammar:v1:alice:event:old-1', JSON.stringify(v1));
    const [a] = getAttempts('alice');
    expect(a).toMatchObject({ lesson: 'past-simple', mode: 'learn', level: 2, result: 'incorrect', legacy: true });
    expect(JSON.parse(localStorage.getItem('workflow:grammar:v1:alice:event:old-1')!).version).toBe(1);
    expect(lessonStats([a], 'past-simple').openErrors).toHaveLength(1);
  });

  it('ignores unknown skills and broken records', () => {
    expect(toAttempt({ ...v1, skill: 'nope' })).toBeNull();
    expect(toAttempt({ ...v1, at: 'not a date' })).toBeNull();
    expect(toAttempt(null)).toBeNull();
  });

  it('counts lessons passed in the old topic library as understood', () => {
    localStorage.setItem('workflow:grammar:library:v1:alice', JSON.stringify({ completed: ['present-perfect', 'gone'], recent: 'passive' }));
    const old = getOldLibrary('alice');
    expect([...old.completed]).toEqual(['present-perfect']);
    expect(getState('alice').current).toEqual({ lesson: 'passive', step: 0 });
    expect(snapshot([], old.completed).stats.get('present-perfect')!.status).toBe('understood');
  });

  it('drops the old draft once', () => {
    localStorage.setItem('workflow:grammar:v1:alice:draft', '{}');
    expect(dropOldDraft('alice')).toBe(true);
    expect(dropOldDraft('alice')).toBe(false);
  });
});

describe('progress', () => {
  const l1 = (lesson: string) => byId.get(lesson)!.items.filter((i) => i.level <= 2 && !i.review);

  it('moves from learning to understood to applied to solid', () => {
    const items = l1('be').slice(0, 4);
    const list = items.map((i) => attempt({ lesson: 'be', itemId: i.id }));
    expect(lessonStats(list.slice(0, 1), 'be').status).toBe('learning');
    expect(lessonStats(list, 'be').status).toBe('understood');
    const write = byId.get('be')!.items.find((i) => i.kind === 'write')!;
    list.push(attempt({ lesson: 'be', itemId: write.id }), finished('be', 's1'));
    expect(lessonStats(list, 'be').status).toBe('applied');
    const review = byId.get('be')!.items.find((i) => i.review)!;
    list.push(attempt({ lesson: 'be', itemId: review.id, session: 's2', mode: 'review', delayedReview: true, at: at(2) }));
    expect(lessonStats(list, 'be').status).toBe('solid');
  });

  it('assisted answers do not count as independent', () => {
    const list = l1('be')
      .slice(0, 4)
      .map((i) => attempt({ lesson: 'be', itemId: i.id, assisted: true }));
    expect(lessonStats(list, 'be').status).toBe('learning');
  });

  it('an error leaves the book once the same item is answered correctly', () => {
    const item = l1('articles')[0];
    const wrong = attempt({ lesson: 'articles', itemId: item.id, result: 'incorrect', at: at(0) });
    expect(lessonStats([wrong], 'articles').openErrors).toHaveLength(1);
    const right = attempt({ lesson: 'articles', itemId: item.id, at: at(1) });
    expect(lessonStats([wrong, right], 'articles').openErrors).toHaveLength(0);
  });

  it('schedules a review one day after studying, and recommends it first', () => {
    const list = [attempt({ lesson: 'be', at: at(0) }), finished('be', 's1')];
    const s = lessonStats(list, 'be');
    expect(s.due).toBe(Date.parse(at(0)) + DAY);
    const snap = snapshot(list);
    expect(recommend(snap, undefined, Date.parse(at(0)) + 2 * DAY)).toMatchObject({ lesson: 'be', mode: 'review' });
    expect(recommend(snap, undefined, Date.parse(at(0)) + 1000).mode).toBe('learn');
  });

  it('recommends fixing two misses in a row before new lessons', () => {
    const [a, b] = l1('articles');
    const list = [a, b].map((i) => attempt({ lesson: 'articles', itemId: i.id, result: 'incorrect' }));
    expect(recommend(snapshot(list), undefined, Date.parse(at(0)))).toMatchObject({ lesson: 'articles', mode: 'errors' });
  });

  it('starts a new learner at the first lesson', () => {
    expect(recommend(snapshot([]))).toMatchObject({ lesson: lessonIds[0], mode: 'learn' });
  });
});

describe('placement', () => {
  it('stops at the first stage with a miss and places the learner there', () => {
    let s = placementSession(byId);
    expect(s.tasks).toHaveLength(14);
    const answers: Attempt[] = [];
    const answer = (correct: boolean) => {
      const t = s.tasks[s.index];
      answers.push(attempt({ lesson: t.lesson, itemId: t.itemId, session: s.id, mode: 'diagnostic', result: correct ? 'correct' : 'incorrect' }));
    };
    // Stage 0 right, stage 1 one miss.
    for (const ok of [true, true, true, false]) {
      answer(ok);
      const next = advance(s, answers, byId);
      if (!next) break;
      s = next;
    }
    expect(advance(s, answers, byId)).toBeNull();
    answers.push(finished(s.lesson, s.id, 'diagnostic'));
    const p = placementOf(answers)!;
    expect(p.stage).toBe(1);
    expect(p.passedStages).toEqual([0]);
    const snap = snapshot(answers);
    for (const l of stageLessons(0)) expect(isDone(snap, l.id)).toBe(true);
    expect(nextInPath(snap)!.stage).toBe(1);
  });

  it('places a learner who gets everything right at the last stage', () => {
    const s = placementSession(byId);
    const answers = s.tasks.map((t) => attempt({ lesson: t.lesson, itemId: t.itemId, session: s.id, mode: 'diagnostic' }));
    answers.push(finished(s.lesson, s.id, 'diagnostic'));
    expect(placementOf(answers)!.stage).toBe(6);
  });
});

describe('sessions', () => {
  it('climbs from recognition to speaking and drops speaking when time is short', () => {
    const lesson = byId.get('present-perfect')!;
    const levels = (minutes: number) =>
      learnSession(lesson, [], minutes).tasks.map((t) => lesson.items.find((i) => i.id === t.itemId)!.level);
    const normal = levels(15);
    expect(normal).toEqual([...normal].sort());
    expect(normal).toContain(5);
    expect(levels(10)).not.toContain(5);
  });

  it('inserts an easier item after two misses', () => {
    const lesson = byId.get('passive')!;
    let s = learnSession(lesson, [], 15);
    const answers: Attempt[] = [];
    while (lesson.items.find((i) => i.id === s.tasks[s.index].itemId)!.level === 1) {
      answers.push(attempt({ lesson: 'passive', itemId: s.tasks[s.index].itemId, session: s.id }));
      s = advance(s, answers, byId)!;
    }
    // Two misses at level 2.
    for (let k = 0; k < 2; k++) {
      answers.push(attempt({ lesson: 'passive', itemId: s.tasks[s.index].itemId, session: s.id, result: 'incorrect' }));
      s = advance(s, answers, byId)!;
    }
    expect(s.scaffold).toBe(true);
    expect(lesson.items.find((i) => i.id === s.tasks[s.index].itemId)!.level).toBe(1);
  });

  it('review sessions use held-back items and past misses', () => {
    const lesson = byId.get('be')!;
    const miss = lesson.items.find((i) => i.level === 2 && !i.review)!;
    const list = [attempt({ lesson: 'be', itemId: miss.id, result: 'incorrect' }), finished('be', 's1')];
    const s = reviewSession(lesson, list, lessonStats(list, 'be'), Date.parse(at(5)));
    const ids = s.tasks.map((t) => t.itemId);
    expect(ids).toContain(miss.id);
    expect(ids.some((id) => lesson.items.find((i) => i.id === id)!.review)).toBe(true);
    expect(s.delayedReview).toBe(true);
  });

  it('error sessions start with the items answered wrongly', () => {
    const miss = byId.get('articles')!.items.find((i) => i.level === 2)!;
    const errors = [attempt({ lesson: 'articles', itemId: miss.id, result: 'incorrect' })];
    const s = errorSession(byId, errors, errors);
    expect(s.tasks[0].itemId).toBe(miss.id);
    expect(s.tasks.length).toBeGreaterThan(1);
  });
});

describe('store', () => {
  it('keeps drafts per account and drops a finished draft', () => {
    const s = learnSession(byId.get('be')!, [], 15);
    saveDraft('alice', s);
    expect(getDraft('bob')).toBeNull();
    expect(getDraft('alice')?.id).toBe(s.id);
    record('alice', finished('be', s.id));
    expect(getDraft('alice')).toBeNull();
  });

  it('sends a pending answer, then its final grade once, under the same id', async () => {
    const upsert = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error('offline') })
      .mockResolvedValue({ error: null });
    from.mockReturnValue({ upsert });
    const a = attempt({ lesson: 'be', result: 'pending' });
    record('alice', a);
    await expect(syncGrammar('alice', false)).rejects.toThrow('offline');
    await syncGrammar('alice', false);
    record('alice', { ...a, result: 'correct' });
    await syncGrammar('alice', false);
    await syncGrammar('alice', false);
    expect(upsert.mock.calls.map(([rows]) => [rows[0].event_id, rows[0].revision, rows[0].skill_id])).toEqual([
      [a.id, 0, 'be'],
      [a.id, 0, 'be'],
      [a.id, 1, 'be'],
    ]);
  });
});

describe('AI grade parser', () => {
  const base = { meaningKept: true, targetMet: false, original: 'She go.', corrected: 'She goes.', explanationVi: 'Thiếu -es.', retryVi: 'Thử lại.' };
  it('accepts the old shape without the new fields', () => {
    expect(parseGrammarGrade(base)).toEqual(base);
  });
  it('keeps a known error tag and a natural version, drops unknown tags', () => {
    expect(parseGrammarGrade({ ...base, errorTag: 'agreement', natural: ' She goes to work. ' })).toMatchObject({ errorTag: 'agreement', natural: 'She goes to work.' });
    expect(parseGrammarGrade({ ...base, errorTag: 'made-up' }).errorTag).toBeUndefined();
  });
  it('rejects feedback without an explanation', () => {
    expect(() => parseGrammarGrade({ ...base, explanationVi: ' ' })).toThrow();
  });
  it('trims and caps tutor hints and rejects blank hints', () => {
    expect(explainGrammar.finalize!({ hint: '  Dùng is với chủ ngữ số ít.  ' })).toEqual({ hint: 'Dùng is với chủ ngữ số ít.' });
    expect(() => explainGrammar.finalize!({ hint: '   ' })).toThrow();
    expect((explainGrammar.finalize!({ hint: 'a'.repeat(2000) }) as { hint: string }).hint).toHaveLength(1800);
  });

  it('includes history and feedback in explainGrammar prompts', () => {
    const req = explainGrammar.build({
      goal: 'Be',
      rule: 'am/is/are',
      prompt: 'Cô ấy là bác sĩ',
      answer: 'She a doctor',
      feedback: 'Lỗi: missing_word · Thiếu is',
      history: [{ q: 'Vì sao thiếu?', a: 'Cần động từ be.' }],
      question: 'Thế còn số nhiều?',
    });
    const text = (req.contents[0].parts[0] as { text: string }).text;
    expect(text).toContain('Nhận xét vừa nhận');
    expect(text).toContain('Hội thoại trước đó');
    expect(text).toContain('Thế còn số nhiều?');
  });
});

describe('AI drill generator & error insights', () => {
  it('parses valid drills, drops broken or duplicate ones, and requires at least 3', () => {
    const parsed = parseGeneratedDrills(
      {
        items: [
          { kind: 'fill', prompt: 'She ___ a nurse.', cue: 'be', answer: 'is', accept: ["'s", 'is'], why: 'Chủ ngữ số ít dùng is.' },
          { kind: 'fill', prompt: 'Missing blank', answer: 'is', why: 'Bad' },
          { kind: 'fix', wrong: 'They is happy.', answer: 'They are happy.', accept: [], why: 'They đi với are.' },
          { kind: 'fix', wrong: 'Same.', answer: 'Same.', why: 'No change' },
          { kind: 'translate', task: 'Tôi là sinh viên.', model: 'I am a student.', why: 'Dùng I am.' },
          { kind: 'write', task: 'Viết 1 câu về nghề nghiệp của bạn.', model: 'I am an engineer.', why: 'Dùng be + a/an.' },
        ],
      },
      'ai:be:1'
    );
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toMatchObject({ id: 'ai:be:1-1', kind: 'fill', level: 2, cue: 'be', accept: ["'s"] });
    expect(parsed[1]).toMatchObject({ id: 'ai:be:1-2', kind: 'fix', level: 2 });
    expect(parsed[2]).toMatchObject({ id: 'ai:be:1-3', kind: 'translate', level: 3 });
    expect(parsed[3]).toMatchObject({ id: 'ai:be:1-4', kind: 'write', level: 4 });
    expect(() => parseGeneratedDrills({ items: [{ kind: 'fill', prompt: 'A ___ B', answer: 'x', why: 'y' }] })).toThrow();

    const req = generateGrammarDrills.build({ goal: 'Be', rule: 'am/is/are', focusTag: 'agreement', theme: 'Bóng đá', avoidPrompts: ['She is tall'] });
    const text = (req.contents[0].parts[0] as { text: string }).text;
    expect(text).toContain('agreement');
    expect(text).toContain('Bóng đá');
    expect(text).toContain('She is tall');
  });

  it('keeps extraItems across aiDrillSession advance and clears orderPicked', () => {
    const lesson = byId.get('be')!;
    const drills = parseGeneratedDrills(
      {
        items: [
          { kind: 'fill', prompt: 'He ___ here.', answer: 'is', why: 'He dùng is.' },
          { kind: 'fix', wrong: 'We am ready.', answer: 'We are ready.', why: 'We dùng are.' },
          { kind: 'translate', task: 'Họ ở nhà.', model: 'They are at home.', why: 'Dùng are.' },
        ],
      },
      'ai:be:2'
    );
    const s = { ...aiDrillSession(lesson, drills as unknown as Lesson['items']), orderPicked: [1, 0] };
    expect(s.tasks).toHaveLength(3);
    expect(s.extraItems?.['ai:be:2-1']).toBeDefined();
    const next = advance(s, [], byId)!;
    expect(next.index).toBe(1);
    expect(next.orderPicked).toBeUndefined();
    expect(next.extraItems?.['ai:be:2-2']).toBeDefined();
  });

  it('summarizes top open error tags excluding other and resolved mistakes', () => {
    const items = byId.get('be')!.items;
    const fb = (errorTag: 'tense' | 'agreement' | 'article' | 'other') => ({
      meaningKept: true,
      targetMet: false,
      original: 'x',
      corrected: 'y',
      explanationVi: 'z',
      retryVi: 'r',
      errorTag,
    });
    const list = [
      attempt({ lesson: 'be', itemId: items[0].id, result: 'incorrect', at: at(1), feedback: fb('agreement') }),
      attempt({ lesson: 'be', itemId: items[1].id, result: 'incorrect', at: at(2), feedback: fb('agreement') }),
      attempt({ lesson: 'be', itemId: items[2].id, result: 'incorrect', at: at(3), feedback: fb('tense') }),
      attempt({ lesson: 'be', itemId: items[3].id, result: 'incorrect', at: at(4), feedback: fb('other') }),
      attempt({ lesson: 'be', itemId: items[4].id, result: 'incorrect', at: at(5), feedback: fb('article') }),
      attempt({ lesson: 'be', itemId: items[4].id, result: 'correct', at: at(6) }),
    ];
    expect(topErrorTags(snapshot(list))).toEqual([
      { tag: 'agreement', count: 2 },
      { tag: 'tense', count: 1 },
    ]);
  });

  it('caps learner-chosen session counts at 10 and supports up to 10 AI drills', () => {
    expect(clampQuestionCount(25)).toBe(10);
    expect(clampQuestionCount(0)).toBe(1);
    const lesson = byId.get('present-perfect')!;
    expect(learnSession(lesson, [], 15, undefined, 6).tasks).toHaveLength(6);
    expect(learnSession(lesson, [], 15, undefined, 99).tasks).toHaveLength(10);

    const many = Array.from({ length: 10 }, (_, idx) => ({
      kind: 'fill' as const,
      prompt: `She ___ item ${idx + 1}.`,
      answer: 'has',
      why: `Lý do ${idx + 1}.`,
    }));
    const parsed = parseGeneratedDrills({ items: many }, 'ai:present-perfect:10');
    expect(parsed).toHaveLength(10);
    expect(aiDrillSession(lesson, parsed as unknown as Lesson['items'], 'learn', 8).tasks).toHaveLength(8);

    const req = generateGrammarDrills.build({
      goal: 'Present Perfect',
      rule: 'have/has + V3',
      count: 10,
      weakTags: ['tense', 'agreement'],
      recentMistakes: ['I have see -> I have seen'],
      avoidPrompts: ['Q1', 'Q2'],
    });
    const text = (req.contents[0].parts[0] as { text: string }).text;
    expect(text).toContain('Create exactly 10 items');
    expect(text).toContain('I have see -> I have seen');
    expect(text).toContain('Q1');
  });

  it('persists AI drills locally, tracks outcomes, feeds errorSession, and skips gracefully if remote table is missing', async () => {
    const lesson = byId.get('be')!;
    const drills = parseGeneratedDrills(
      {
        items: [
          { kind: 'fill', prompt: 'My coffee ___ hot.', answer: 'is', why: 'Chủ ngữ số ít dùng is.' },
          { kind: 'fix', wrong: 'The servers is busy.', answer: 'The servers are busy.', why: 'Số nhiều dùng are.' },
          { kind: 'translate', task: 'Tôi đang ở văn phòng.', model: 'I am at the office.', why: 'Dùng am.' },
        ],
      },
      'ai:be:persist'
    ) as unknown as Lesson['items'];

    saveAiItems('alice', drills, { lessonId: 'be', focusTag: 'agreement', theme: 'Công việc', sourceMode: 'learn' });
    expect(getAiItems('alice', 'be')).toHaveLength(3);

    recordAiItemOutcome('alice', drills[0].id, 'incorrect');
    expect(getAiItems('alice', 'be').find((x) => x.id === drills[0].id)).toMatchObject({
      timesSeen: 1,
      timesCorrect: 0,
      lastResult: 'incorrect',
    });

    const errAttempt: Attempt = {
      ...attempt({ lesson: 'be' }),
      itemId: drills[0].id,
      kind: drills[0].kind,
      level: drills[0].level,
      result: 'incorrect',
    };
    const errSess = errorSession(byId, [errAttempt], [errAttempt], 'be', 5, getAiItemMap('alice'));
    expect(errSess.tasks[0].itemId).toBe(drills[0].id);
    expect(errSess.extraItems?.[drills[0].id]).toBeDefined();

    // Missing remote table (PGRST205) should not crash syncGrammar.
    from.mockImplementation((tbl: string) =>
      tbl === 'grammar_attempts'
        ? { upsert: vi.fn().mockResolvedValue({ error: null }) }
        : { upsert: vi.fn().mockResolvedValue({ error: { code: 'PGRST205', message: 'Could not find the table' } }) }
    );
    await expect(syncGrammar('alice', false)).resolves.toBeUndefined();
  });
});
