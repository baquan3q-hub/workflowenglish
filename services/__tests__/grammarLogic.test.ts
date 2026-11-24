import { describe, expect, it } from 'vitest';
import { curriculum, loadLessons } from '../../data/grammar/catalog';
import { checkpoints, transfer } from '../../data/grammar/transfer';
import {
  advance,
  cloze,
  makeSession,
  normalize,
  placementStart,
  promptFor,
  recommend,
  skillStats,
  type Evidence,
} from '../grammarLogic';
import { gradeGrammarProduction, parseGrammarGrade } from '../../supabase/functions/ai-proxy/ops/grammar';

function event(i: number, patch: Partial<Evidence> = {}): Evidence {
  return {
    id: 'event' + i,
    session: 's1',
    skill: 'be',
    item: i,
    kind: 'choice',
    version: 1,
    mode: 'lesson',
    at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    answer: 'am',
    assisted: false,
    typedFallback: false,
    result: 'correct',
    ...patch,
  };
}
describe('Grammar foundation', () => {
  it('ships 6 units of 4 skills with contrastive examples, practice, assessment and three production tasks', async () => {
    const ids = curriculum.map((s) => s.id);
    expect(new Set(ids).size).toBe(24);
    const all = await loadLessons(ids);
    expect(all.map((s) => s.id)).toEqual(ids);
    expect(Object.keys(transfer).sort()).toEqual([...ids].sort());
    for (const lesson of all) {
      expect(lesson.examples).toHaveLength(2);
      lesson.examples.forEach((e) => {
        expect(e.en).toMatch(/\[[^\]]+\]/);
        expect(e.vi).toBeTruthy();
      });
      expect(lesson.items).toHaveLength(12);
      expect(new Set(lesson.items).size).toBe(12);
      for (const line of lesson.items) {
        const parsed = cloze(line);
        expect(parsed.correct).not.toBe(parsed.distractor);
        expect(parsed.prompt).toContain('_____');
      }
      const run = makeSession('lesson', lesson.id, [], 30);
      expect(run.tasks.map((t) => promptFor(lesson, t)).every(Boolean)).toBe(true);
      expect(run.tasks.slice(-3).map((t) => t.kind)).toEqual(['translate', 'write', 'speak']);
      const review = makeSession('review', lesson.id, [], 15);
      const bank = run.tasks.map((t) => promptFor(lesson, t));
      expect(review.tasks.every((t) => !bank.includes(promptFor(lesson, t)))).toBe(true);
    }
    for (let group = 1; group <= 6; group++) {
      const skills = curriculum.filter((s) => s.group === group);
      expect(skills).toHaveLength(4);
      const check = makeSession('checkpoint', skills[0].id, [], 10);
      expect(check.tasks.map((t) => t.item)).toEqual([9, 9, 9, 9, 16]);
      const last = check.tasks.at(-1)!;
      expect(
        promptFor(
          all.find((l) => l.id === last.skill)!,
          last
        )
      ).toBe(checkpoints[group - 1]);
    }
  });
  it('uses 12 placement items with two per unit and recommends from the completed diagnostic', () => {
    const placement = makeSession('placement', 'be', [], 15);
    expect(placement.tasks).toHaveLength(12);
    const results = placement.tasks.map((t, i) =>
      event(i, { ...t, mode: 'placement', result: i === 2 ? 'incorrect' : 'correct' })
    );
    expect(placementStart(results)).toBe(0);
    results.push(event(20, { mode: 'placement', result: 'finished' }));
    expect(curriculum[placementStart(results)].group).toBe(2);
  });
  it('counts different prompts and independent production across at least two sessions', () => {
    const five = [0, 1, 2, 3, 4].map((i) => event(i));
    expect(skillStats(five, 'be').mastered).toBe(false);
    five[4] = event(4, { kind: 'write', session: 's2', result: 'pending' });
    expect(skillStats(five, 'be').mastered).toBe(false);
    five[4].result = 'correct';
    five[0].assisted = true;
    expect(skillStats(five, 'be').mastered).toBe(true);
    five[4].assisted = true;
    expect(skillStats(five, 'be').mastered).toBe(false);
    expect(skillStats([event(1), event(1, { session: 's2', kind: 'write' })], 'be').mastered).toBe(false);
  });
  it('ignores retries after feedback as independent evidence, accepts new practice in a later session', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => event(i, { result: 'incorrect' }));
    rows.push(...[0, 1, 2, 3, 4].map((i) => event(i + 10, { item: i, assisted: true })));
    expect(skillStats(rows, 'be').mastered).toBe(false);
    rows.push(
      ...[0, 1, 2, 3, 4].map((i) =>
        event(i + 20, { item: i, session: i === 4 ? 's3' : 's2', kind: i === 4 ? 'write' : 'fill' })
      )
    );
    expect(skillStats(rows, 'be').mastered).toBe(true);
  });
  it('recommends due skills and resets spacing after an error', () => {
    const events = [event(0), event(1, { result: 'finished' })];
    expect(recommend(events, Date.parse(events[0].at)).skill.id).toBe('subject');
    const day = 86400000;
    expect(recommend(events, Date.parse(events[0].at) + day).mode).toBe('review');
    const review = event(10, {
      session: 'r1',
      mode: 'review',
      delayedReview: true,
      at: '2026-01-02T01:00:00.000Z',
    });
    expect(skillStats([...events, review], 'be').due).toBe(Date.parse(review.at) + 3 * day);
    const wrong = event(11, {
      session: 'r2',
      result: 'incorrect',
      mode: 'review',
      at: '2026-01-05T01:00:00.000Z',
    });
    expect(skillStats([...events, review, wrong], 'be').due).toBe(Date.parse(wrong.at) + day);
  });
  it('adjusts practice difficulty, varies repeated items and respects shorter sessions', () => {
    const s = makeSession('lesson', 'be', [], 10);
    expect(s.tasks).toHaveLength(7);
    expect(advance(s, [event(0), event(1), event(2)]).tasks[1].kind).toBe('fill');
    expect(
      advance({ ...s, index: 2 }, [event(0, { result: 'incorrect' }), event(1, { result: 'incorrect' })]).tasks[3]
        .kind
    ).toBe('choice');
    expect(makeSession('lesson', 'be', [event(0)], 30).tasks[0].item).toBe(1);
    expect(normalize('  Don’t  ')).toBe("don't");
  });
  it('requires meaningful structured AI output before granting credit', () => {
    expect(() => parseGrammarGrade({ meaningKept: true, targetMet: true })).toThrow();
    expect(() =>
      gradeGrammarProduction.build({ goal: 'be', rule: 'must use be', prompt: 'introduce yourself', answer: '' })
    ).toThrow();
    const grade = {
      meaningKept: true,
      targetMet: false,
      original: 'I student',
      corrected: 'I am a student',
      explanationVi: 'Thêm am.',
      retryVi: 'Hãy thử lại.',
    };
    expect(parseGrammarGrade(grade)).toEqual(grade);
  });
});
