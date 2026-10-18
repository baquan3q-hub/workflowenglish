import { describe, expect, it } from 'vitest';
import type { ReadingGroup, ReadingPassage, ReadingQuestion, ReadingTest } from '../../data/ielts/reading/types';
import {
  errorBreakdown,
  gradePassage,
  normalizeTfng,
  passageWordCount,
  rawToBandReading,
  READING_STATUS_LABELS,
  scorePassages,
  tfngStatus,
  unansweredCount,
  validatePassage,
  validateReadingTest,
} from '../readingLogic';
import { passageProblems } from '../../supabase/functions/ai-proxy/ops/readingRules.ts';

const q = (number: number, paragraph: string, answers: string[], evidence: string, extra: Partial<ReadingQuestion> = {}): ReadingQuestion => ({
  number,
  paragraph,
  answers,
  evidence,
  explanationVi: 'Giải thích.',
  skill: 'detail',
  ...extra,
});

const PARAGRAPHS = [
  'Honeybees have lived alongside humans for thousands of years. Early farmers in Egypt kept hives made of clay, and they valued honey as both food and medicine.',
  'A single colony may contain up to sixty thousand workers. Each worker lives for about six weeks in summer, but the queen can survive for several years.',
  'Bees communicate the location of flowers through a movement known as the waggle dance. The angle of the dance shows the direction of the food relative to the sun.',
  'In recent decades, colonies have declined in many regions. Scientists point to pesticides, parasites and the loss of wild meadows as the main causes.',
  'Some cities now encourage rooftop beekeeping. Supporters argue that urban hives raise awareness, although critics believe they compete with wild pollinators for scarce flowers.',
].map((text, i) => ({ label: String.fromCharCode(65 + i), text }));

const letters = (...texts: string[]) => texts.map((text, i) => ({ key: String.fromCharCode(65 + i), text }));

function passage(): ReadingPassage {
  const groups: ReadingGroup[] = [
    {
      id: 'g1',
      type: 'tfng',
      variant: 'tfng',
      instruction: 'Do the following statements agree with the information in the passage?',
      questions: [
        q(1, 'A', ['TRUE'], 'they valued honey as both food and medicine', { prompt: 'Ancient Egyptians used honey to treat illness.' }),
        q(2, 'B', ['FALSE'], 'Each worker lives for about six weeks in summer, but the queen can survive for several years', { prompt: 'Worker bees live longer than the queen.' }),
        q(3, 'C', ['NOT GIVEN'], 'a movement known as the waggle dance', { prompt: 'The waggle dance was first described by a German scientist.' }),
      ],
    },
    {
      id: 'g2',
      type: 'completion',
      instruction: 'Complete the sentences. Choose ONE WORD ONLY from the passage.',
      wordLimit: 1,
      numberAllowed: false,
      lines: ['The angle of the dance shows the {{4}} of the food.', 'Scientists blame pesticides, parasites and the loss of wild {{5}}.'],
      questions: [
        q(4, 'C', ['direction'], 'The angle of the dance shows the direction of the food'),
        q(5, 'D', ['meadows'], 'the loss of wild meadows'),
      ],
    },
    {
      id: 'g3',
      type: 'headings',
      instruction: 'Choose the correct heading for paragraphs B and D.',
      headings: [
        { key: 'i', text: 'An ancient partnership' },
        { key: 'ii', text: 'How bees share directions' },
        { key: 'iii', text: 'A threatened future' },
        { key: 'iv', text: 'The cost of honey' },
        { key: 'v', text: 'Life inside the colony' },
      ],
      example: { paragraph: 'A', heading: 'i' },
      questions: [
        q(6, 'B', ['v'], 'A single colony may contain up to sixty thousand workers', { skill: 'main_idea' }),
        q(7, 'D', ['iii'], 'colonies have declined in many regions', { skill: 'main_idea' }),
      ],
    },
    {
      id: 'g4',
      type: 'mcq',
      instruction: 'Choose the correct letter, A, B or C.',
      questions: [q(8, 'B', ['B'], 'up to sixty thousand workers', { prompt: 'How many workers can one colony hold?', options: letters('6,000', '60,000', '600,000') })],
    },
    {
      id: 'g5',
      type: 'mcq_multi',
      instruction: 'Choose TWO letters, A–E.',
      prompt: 'Which TWO causes of decline are mentioned?',
      options: letters('pesticides', 'climate', 'parasites', 'disease', 'noise'),
      questions: [q(9, 'D', ['A', 'C'], 'pesticides, parasites'), q(10, 'D', ['A', 'C'], 'pesticides, parasites')],
    },
    {
      id: 'g6',
      type: 'matching',
      target: 'paragraph',
      instruction: 'Which paragraph contains the following information?',
      options: PARAGRAPHS.map((p) => ({ key: p.label, text: `Paragraph ${p.label}` })),
      questions: [q(11, 'C', ['C'], 'The angle of the dance shows the direction', { prompt: 'a description of how bees signal direction', skill: 'scan' })],
    },
    {
      id: 'g7',
      type: 'matching',
      target: 'feature',
      instruction: 'Match each statement with the correct group.',
      options: letters('Supporters of urban hives', 'Critics of urban hives'),
      questions: [q(12, 'E', ['B'], 'critics believe they compete with wild pollinators', { prompt: 'Urban hives take food from other insects.' })],
    },
    {
      id: 'g8',
      type: 'short_answer',
      instruction: 'Answer the question. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER.',
      wordLimit: 2,
      numberAllowed: true,
      questions: [q(13, 'B', ['six weeks', '6 weeks'], 'lives for about six weeks', { prompt: 'How long does a worker live in summer?' })],
    },
    {
      id: 'g9',
      type: 'completion',
      instruction: 'Complete the summary using the list of words, A–C.',
      wordLimit: 1,
      numberAllowed: false,
      lines: ['Rooftop hives may help people become more {{14}} of bees.'],
      wordBox: letters('aware', 'afraid', 'tired'),
      questions: [q(14, 'E', ['A'], 'urban hives raise awareness', { skill: 'inference' })],
    },
    {
      id: 'g10',
      type: 'diagram',
      instruction: 'Label the diagram. Choose ONE WORD ONLY from the passage.',
      wordLimit: 1,
      numberAllowed: false,
      diagram: { title: 'A colony', width: 300, height: 120, shapes: [{ kind: 'box', x: 10, y: 10, w: 200, h: 40, text: 'Queen: lives several {{15}}' }] },
      questions: [q(15, 'B', ['years'], 'the queen can survive for several years')],
    },
  ];
  return { id: 'bees', part: 1, title: 'Bees and people', topic: 'science', difficulty: 'easy', paragraphs: PARAGRAPHS, groups, suggestedMinutes: 17 };
}

const ALL_RIGHT: Record<number, string> = {
  1: 'TRUE', 2: 'FALSE', 3: 'NOT GIVEN', 4: 'direction', 5: 'meadows', 6: 'v', 7: 'iii', 8: 'B', 9: 'A,C', 11: 'C', 12: 'B', 13: '6 weeks', 14: 'A', 15: 'years',
};

const statusOf = (answers: Record<number, string>) => Object.fromEntries(gradePassage(passage(), answers).map((r) => [r.number, r.status]));

describe('validatePassage', () => {
  it('accepts a passage with every question type', () => {
    expect(validatePassage(passage())).toEqual([]);
  });

  it('finds evidence, answers and paragraphs that do not match the passage', () => {
    const p = passage();
    p.groups[0].questions[0].evidence = 'honey was sold in markets';
    p.groups[1].questions[1].answers = ['fields'];
    p.groups[3].questions[0].paragraph = 'H';
    const problems = passageProblems(p);
    expect(problems).toContain('bees Q1: evidence is not in paragraph A');
    expect(problems).toContain('bees Q5: answer is not in paragraph D');
    expect(problems).toContain('bees Q5: evidence does not contain the answer');
    expect(problems).toContain('bees Q8: unknown paragraph H');
  });

  it('checks word limits, blanks and the word box', () => {
    const p = passage();
    p.groups[1].questions[0].answers = ['the direction'];
    (p.groups[1] as Extract<ReadingGroup, { type: 'completion' }>).lines = ['The angle shows the {{4}}.'];
    (p.groups[8] as Extract<ReadingGroup, { type: 'completion' }>).wordBox = letters('aware');
    const problems = passageProblems(p);
    expect(problems).toContain('bees Q4: answer "the direction" breaks the word limit');
    expect(problems).toContain('bees g2: blanks 4 do not match questions 4,5');
    expect(problems).toContain('bees g9: the word box needs more words than blanks');
  });

  it('keeps TRUE/FALSE/NOT GIVEN in passage order with allowed answers', () => {
    const p = passage();
    const [a, b] = p.groups[0].questions;
    p.groups[0].questions[0] = { ...b, number: 1 };
    p.groups[0].questions[1] = { ...a, number: 2, answers: ['YES'] };
    const problems = passageProblems(p);
    expect(problems).toContain('bees Q2: answers in this group must follow the passage order');
    expect(problems).toContain('bees Q2: answer must be one of TRUE, FALSE, NOT GIVEN');
  });

  it('needs spare headings and each heading once', () => {
    const p = passage();
    const g = p.groups[2] as Extract<ReadingGroup, { type: 'headings' }>;
    g.headings = g.headings.slice(0, 3);
    g.questions[1].answers = ['i'];
    const problems = passageProblems(p);
    expect(problems).toContain('bees g3: needs more headings than paragraphs');
    expect(problems).toContain('bees Q6: answer is not a heading');
    expect(problems).toContain('bees g3: example heading is unknown or also an answer');
  });

  it('matches information to the paragraph that holds the evidence', () => {
    const p = passage();
    p.groups[5].questions[0].answers = ['D'];
    expect(passageProblems(p)).toContain('bees Q11: answer must be the paragraph that holds the evidence');
  });

  it('wants consecutive numbers and a sensible question count', () => {
    const p = passage();
    p.groups[7].questions[0].number = 20;
    expect(passageProblems(p)).toContain('bees Q20: numbers are not consecutive');
    const short = passage();
    short.groups = short.groups.slice(0, 2);
    expect(validatePassage(short)).toContain('bees: has 5 questions (12–15)');
  });

  it('counts the words of the passage', () => {
    expect(passageWordCount(passage())).toBe(PARAGRAPHS.reduce((n, p) => n + p.text.split(' ').length, 0));
  });
});

describe('grading', () => {
  it('marks every type right with exam answers', () => {
    const results = gradePassage(passage(), ALL_RIGHT);
    expect(results).toHaveLength(15);
    expect(results.filter((r) => r.status !== 'correct')).toEqual([]);
  });

  it('accepts short forms and other cases', () => {
    const s = statusOf({ ...ALL_RIGHT, 1: 't', 3: 'ng', 6: 'V', 8: 'b', 14: 'a', 9: 'c, a' });
    expect([s[1], s[3], s[6], s[8], s[14], s[9], s[10]]).toEqual(Array(7).fill('correct'));
  });

  it('tells NOT GIVEN confusion apart from a plain wrong answer', () => {
    const s = statusOf({ ...ALL_RIGHT, 1: 'FALSE', 2: 'NOT GIVEN', 3: 'FALSE' });
    expect([s[1], s[2], s[3]]).toEqual(['wrong', 'ng_confusion', 'ng_confusion']);
    expect(tfngStatus('', 'TRUE')).toBe('blank');
    expect(normalizeTfng(' not  given ')).toBe('NOT GIVEN');
    expect(READING_STATUS_LABELS.ng_confusion).toBe('Nhầm NOT GIVEN');
  });

  it('grades copied words like Listening', () => {
    const s = statusOf({ ...ALL_RIGHT, 4: 'directions', 5: 'medows', 13: 'about six weeks' });
    expect([s[4], s[5], s[13]]).toEqual(['plural', 'spelling', 'over_limit']);
  });

  it('gives a choose-two group one mark per right letter', () => {
    const s = statusOf({ ...ALL_RIGHT, 9: 'A,B' });
    expect([s[9], s[10]]).toEqual(['correct', 'wrong']);
    expect(statusOf({ ...ALL_RIGHT, 9: '' })[10]).toBe('blank');
  });

  it('counts blanks and error types', () => {
    const answers = { ...ALL_RIGHT, 3: 'FALSE', 9: 'A' };
    delete (answers as Record<number, string>)[15];
    expect(unansweredCount(passage().groups, answers)).toBe(2);
    expect(errorBreakdown(gradePassage(passage(), answers))).toEqual({ ng_confusion: 1, blank: 2 });
  });
});

describe('band', () => {
  it('follows the Academic Reading table', () => {
    const pairs: [number, number][] = [
      [40, 9], [39, 9], [38, 8.5], [37, 8.5], [35, 8], [33, 7.5], [32, 7], [30, 7], [29, 6.5], [27, 6.5],
      [26, 6], [23, 6], [22, 5.5], [19, 5.5], [18, 5], [15, 5], [14, 4.5], [13, 4.5], [12, 4], [10, 4], [0, 0],
    ];
    for (const [raw, band] of pairs) expect(rawToBandReading(raw), `raw ${raw}`).toBe(band);
  });

  it('scales a single passage to 40 and says so', () => {
    const score = scorePassages([passage()], ALL_RIGHT);
    expect(score).toMatchObject({ score: 15, total: 15, band: 9, estimated: true });
    expect(score.byPassage).toEqual([{ part: 1, passageId: 'bees', score: 15, total: 15 }]);
    const half = scorePassages([passage()], { 1: 'TRUE', 2: 'FALSE', 3: 'NOT GIVEN', 4: 'direction', 5: 'meadows', 6: 'v', 7: 'iii', 8: 'B' });
    // 8/15 of 40 ≈ 21 → 5.5
    expect(half.band).toBe(5.5);
  });
});

describe('validateReadingTest', () => {
  const renumber = (p: ReadingPassage, from: number, part: 1 | 2 | 3): ReadingPassage => {
    let n = from;
    const groups = p.groups.map((g) => {
      const questions = g.questions.map((x) => ({ ...x, number: n++ }));
      const old = g.questions.map((x) => x.number);
      const swap = (s: string) => s.replace(/\{\{(\d+)\}\}/g, (_, d) => `{{${questions[old.indexOf(Number(d))].number}}}`);
      if (g.type === 'completion') return { ...g, questions, lines: g.lines?.map(swap) };
      if (g.type === 'diagram') return { ...g, questions, diagram: { ...g.diagram, shapes: g.diagram.shapes.map((s) => ({ ...s, text: s.text && swap(s.text) })) } };
      return { ...g, questions } as ReadingGroup;
    });
    return { ...p, id: `p${part}`, part, groups };
  };

  it('wants 40 questions over parts 1–3 for a full test', () => {
    const p1 = renumber(passage(), 1, 1);
    const p2 = renumber(passage(), 16, 2);
    const p3 = renumber(passage(), 31, 3);
    // Ten questions in the last passage: drop the last five.
    p3.groups = p3.groups.slice(0, 5);
    const test: ReadingTest = { id: 'full', title: 'Full', kind: 'full', descriptionVi: '', passages: [p1, p2, p3] };
    const problems = validateReadingTest(test);
    expect(problems).toContain('p3: has 10 questions (12–15)');
    expect(problems).not.toContain('full: questions must run 1–40');
    expect(validateReadingTest({ ...test, passages: [p2, p1, p3] })).toContain('full: passages must be parts 1–3 in order');
    expect(validateReadingTest({ ...test, passages: [p1] })).toContain('full: questions must run 1–40');
    expect(validateReadingTest({ ...test, kind: 'practice', passages: [passage()] })).toEqual([]);
  });
});
