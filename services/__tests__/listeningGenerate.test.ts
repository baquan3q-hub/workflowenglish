import { describe, expect, it } from 'vitest';
import {
  finalizeListeningSection,
  firstQuestion,
  generateListeningSection,
  generatedSectionProblems,
  LISTENING_BLUEPRINTS,
  listeningSectionPrompt,
  normalizeGeneratedSection,
  orderProblems,
} from '../../supabase/functions/ai-proxy/ops/listeningGenerate.ts';
import { LISTENING_VOICES } from '../../supabase/functions/ai-proxy/ops/listening.ts';
import { OPS } from '../../supabase/functions/ai-proxy/ops/index.ts';
import { BadRequest, FLASH_MODELS } from '../../supabase/functions/ai-proxy/lib.ts';
import { LISTENING_TESTS } from '../../data/ielts/listening';
import { validateSection } from '../listeningLogic';
import { RAW_PART2, RAW_PART4, type RawFixture } from './listeningGenerate.fixtures';

type Raw = RawFixture;
const copy = <T>(v: T): T => structuredClone(v);
/** Problems after editing a copy of the Part 2 fixture. */
const problemsAfter = (edit: (raw: Raw) => void, base: Raw = RAW_PART2) => {
  const raw = copy(base);
  edit(raw);
  return generatedSectionProblems(normalizeGeneratedSection(raw), raw.difficulty as 'medium');
};
const anyMatch = (list: string[], re: RegExp) => list.some((p) => re.test(p));

describe('generateListeningSection request', () => {
  it('is registered with its own limit and the flash models', () => {
    expect(OPS.generateListeningSection).toBe(generateListeningSection);
    expect(generateListeningSection.hourlyLimit).toBe(10);
    expect(generateListeningSection.models).toEqual(FLASH_MODELS);
    expect(generateListeningSection.kind).toBe('json');
  });

  it('pins part and difficulty in the schema and numbers the questions for the part', () => {
    const req = generateListeningSection.build({ part: 3, difficulty: 'hard', topic: 'a group presentation on recycling' });
    const schema = req.generationConfig.responseSchema as { properties: Record<string, { enum?: string[]; items?: unknown }> };
    expect(schema.properties.part.enum).toEqual(['3']);
    expect(schema.properties.difficulty.enum).toEqual(['hard']);
    const groupType = (schema.properties.groups.items as { properties: { type: { enum: string[] } } }).properties.type.enum;
    expect(groupType.sort()).toEqual(['matching', 'mcq', 'mcq_multi']);
    const prompt = (req.contents[0].parts[0] as { text: string }).text;
    expect(prompt).toContain('Part 3');
    expect(prompt).toContain('"a group presentation on recycling"');
    expect(prompt).toContain('questions 21-24');
    expect(prompt).toContain('number runs from 21 to 30');
    expect(prompt).toContain('at least 5 questions have a distractor');
  });

  it('falls back to Part 1, medium, and no topic', () => {
    const prompt = (generateListeningSection.build({ part: 9, difficulty: 'nope' }).contents[0].parts[0] as { text: string }).text;
    expect(prompt).toContain('Part 1');
    expect(prompt).toContain('questions 1-6');
    expect(prompt).toContain('Medium (band 6-7)');
    expect(prompt).toContain('choose a fresh, realistic topic');
    expect(() => generateListeningSection.build({ part: 1, topic: 'x'.repeat(101) })).toThrow(BadRequest);
    expect(() => generateListeningSection.build('part 1')).toThrow(BadRequest);
  });

  it('states the word limit for completion groups', () => {
    expect(listeningSectionPrompt(4, 'easy', '')).toContain('at most 1 word and never a number');
    expect(listeningSectionPrompt(1, 'easy', '')).toContain('at most 2 words, or a number, or words plus one number');
  });
});

describe('blueprints', () => {
  it('has ten questions per part and voices the app knows', () => {
    for (const part of [1, 2, 3, 4] as const) {
      const plan = LISTENING_BLUEPRINTS[part];
      expect(plan.groups.reduce((s, g) => s + g.count, 0), `part ${part}`).toBe(10);
      expect(firstQuestion(part)).toBe((part - 1) * 10 + 1);
    }
    const section = normalizeGeneratedSection({ part: '3', speakers: [{ name: 'Amy', gender: 'female' }, { name: 'Tom', gender: 'male' }, { name: 'Zoe', gender: 'female' }] });
    expect(section.speakers.map((s) => s.voice)).toEqual(['Kore', 'Puck', 'Aoede']);
    for (const s of section.speakers) expect(LISTENING_VOICES).toContain(s.voice);
  });

  it('keeps the hand-written parts in recording order too', () => {
    for (const test of LISTENING_TESTS) for (const s of test.sections) expect(orderProblems(s), s.id).toEqual([]);
  });
});

describe('finalizeListeningSection', () => {
  it('turns a valid Part 2 into the app shape', () => {
    const s = finalizeListeningSection(copy(RAW_PART2));
    expect(validateSection(s as never)).toEqual([]);
    expect(s).toMatchObject({ id: 'gen-p2', part: 2, style: 'au', prepSeconds: 30, title: 'A visit to Hollybank Farm Park' });
    expect(s.speakers).toEqual([{ name: 'Megan', voice: 'Kore', roleVi: 'Nhân viên giáo dục' }]);
    expect(s.segments.map((x) => x.id)).toEqual(['gen-p2-s1', 'gen-p2-s2', 'gen-p2-s3', 'gen-p2-s4']);
    const [mcq, multi, matching] = s.groups;
    expect(mcq.instruction).toBe('Choose the correct letter, A, B or C.');
    expect(mcq.questions[2].answers).toEqual(['B']); // "b" from the model
    expect(mcq.questions[0].paraphrase).toEqual({ question: 'more than three centuries old', audio: 'over three hundred years old' });
    expect(mcq.questions[1].paraphrase).toBeUndefined();
    expect(multi).toMatchObject({ instruction: 'Choose TWO letters, A–E.', prompt: 'Which TWO activities are new this year?' });
    expect(matching.instruction).toBe('What does Megan say about each area of the park? Choose the correct letter, A–F, next to questions 17–20.');
    expect(matching.questions[3].segmentId).toBe('gen-p2-s4');
  });

  it('turns a valid Part 4 into lecture notes with the blueprint word limit', () => {
    const raw = copy(RAW_PART4);
    Object.assign(raw.groups[0], { wordLimit: 3 }); // ignored: the blueprint decides
    const s = finalizeListeningSection(raw);
    expect(validateSection(s as never)).toEqual([]);
    expect(s.style).toBe('lecture');
    expect(s.groups[0]).toMatchObject({
      instruction: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
      wordLimit: 1,
      numberAllowed: false,
      title: 'Bees in cities',
    });
    expect(s.groups[0].questions[0]).not.toHaveProperty('options');
  });

  it('repairs small slips: split "Choose TWO" answers and names inside lines', () => {
    const raw = copy(RAW_PART2);
    raw.groups[1].questions[0].answers = ['D'];
    raw.groups[1].questions[1].answers = ['b'];
    raw.segments[0].lines[0].text = `Megan: ${raw.segments[0].lines[0].text}`;
    const s = finalizeListeningSection(raw);
    expect(s.groups[1].questions.map((q) => q.answers)).toEqual([['B', 'D'], ['B', 'D']]);
    expect(s.segments[0].lines[0].text.startsWith('Good morning')).toBe(true);
  });

  it('throws so the proxy retries when the part is missing or broken', () => {
    expect(() => finalizeListeningSection({})).toThrow(/no valid part/);
    expect(() => finalizeListeningSection(null)).toThrow(/no valid part/);
    const raw = copy(RAW_PART2);
    raw.groups[0].questions[0].evidence = 'the farmhouse is brand new';
    expect(() => finalizeListeningSection(raw)).toThrow(/failed 1 check\(s\): gen-p2 Q11: evidence is not in its segment/);
  });
});

describe('generated section checks', () => {
  it('passes both fixtures', () => {
    expect(problemsAfter(() => {})).toEqual([]);
    expect(problemsAfter(() => {}, RAW_PART4)).toEqual([]);
  });

  it('enforces the group shape and numbering of the part', () => {
    expect(anyMatch(problemsAfter((r) => r.groups[2].questions.pop()), /groups are \[mcq×4, mcq_multi×2, matching×3\]/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => r.groups.reverse()), /expected \[mcq×4, mcq_multi×2, matching×4\]/)).toBe(true);
    const shifted = problemsAfter((r) => r.groups.forEach((g) => g.questions.forEach((q) => (q.number -= 10))));
    expect(anyMatch(shifted, /numbering must start at 11/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[0].questions[3].number = 15)), /not consecutive/)).toBe(true);
  });

  it('checks speakers', () => {
    expect(anyMatch(problemsAfter((r) => r.speakers.push({ name: 'Tom', gender: 'male', roleVi: '' })), /needs 1 speaker/)).toBe(true);
    const renamed = problemsAfter((r) => {
      r.speakers[0].name = 'megan smith';
      r.segments.forEach((s) => s.lines.forEach((l) => (l.speaker = 'megan smith')));
    });
    expect(anyMatch(renamed, /must be one capitalised word/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.segments[1].lines[0].speaker = 'Mike')), /unknown speaker Mike/)).toBe(true);
  });

  it('checks the script length and segment size', () => {
    expect(anyMatch(problemsAfter((r) => (r.segments[2].lines[0].text += ` ${r.segments[3].lines[0].text}`.repeat(2))), /audio text is \d+ characters/)).toBe(true);
    const short = problemsAfter((r) => r.segments.splice(3, 1, ...[]));
    expect(anyMatch(short, /script is only \d+ words/)).toBe(true);
    expect(anyMatch(short, /unknown segment gen-p2-s4/)).toBe(true);
  });

  it('checks options and letters', () => {
    expect(anyMatch(problemsAfter((r) => r.groups[0].questions[0].options!.pop()), /needs 3 options, got 2/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[0].questions[1].options![2].key = 'D')), /option letters must be A–C/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[0].questions[0].answers = ['D'])), /answer is not an option/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[1].options = r.groups[1].options!.slice(0, 4))), /needs 5 options/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[2].options = r.groups[2].options!.slice(0, 4))), /needs 5-8 options, got 4/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[2].options![1].text = 'Closed for repairs')), /options repeat/)).toBe(false);
    expect(anyMatch(problemsAfter((r) => (r.groups[2].options![1].text = 'Suitable for young children')), /options repeat/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (r.groups[1].questions[1].answers = ['B', 'D', 'E'])), /must share answers|must match the number/)).toBe(true);
  });

  it('rejects giveaway answer patterns', () => {
    const same = problemsAfter((r) =>
      r.groups[0].questions.forEach((q, i) => {
        q.answers = ['A'];
        q.evidence = r.segments[i < 2 ? 0 : 1].lines[0].text.slice(0, 40);
      }),
    );
    expect(anyMatch(same, /every answer is the same letter/)).toBe(true);
    const sameMatch = problemsAfter((r) => r.groups[2].questions.forEach((q) => (q.answers = ['C'])));
    expect(anyMatch(sameMatch, /g3: every answer is the same letter/)).toBe(true);
  });

  it('rejects answers heard out of order', () => {
    const p = problemsAfter((r) => (r.groups[0].questions[1].segment = 3));
    expect(anyMatch(p, /Q13: answered before Q12/)).toBe(true);
    // The two questions of a "Choose TWO" group may come either way round.
    expect(problemsAfter((r) => r.groups[1].questions.reverse().forEach((q, i) => (q.number = 15 + i)))).toEqual([]);
  });

  it('needs enough distractors for the difficulty', () => {
    const none = (r: Raw) => r.groups.forEach((g) => g.questions.forEach((q) => delete q.distractor));
    expect(anyMatch(problemsAfter(none), /medium needs at least 2 distractors, got 0/)).toBe(true);
    expect(problemsAfter((r) => (none(r), (r.difficulty = 'easy')))).toEqual([]);
    expect(anyMatch(problemsAfter((r) => (r.groups[0].questions[0].distractor = 'not in the script at all')), /distractor is not in the script/)).toBe(true);
  });

  it('checks completion answers against the notes and the word limit', () => {
    const p4 = RAW_PART4;
    const g = (r: Raw) => r.groups[0] as Required<Raw['groups'][number]>;
    expect(anyMatch(problemsAfter((r) => (g(r).lines[1] = 'Cities often have more species than nearby farmland {{31}}'), p4), /Q31: the notes already show the answer/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (g(r).questions[0].answers = ['the farmland']), p4), /breaks the word limit/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (g(r).questions[0].answers = ['meadows']), p4), /answer is not in its segment/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => g(r).lines.splice(12, 1), p4), /blanks .* do not match questions/)).toBe(true);
    expect(anyMatch(problemsAfter((r) => (g(r).lines = []), p4), /g1: no lines/)).toBe(true);
  });
});
